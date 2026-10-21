<?php

namespace App\Http\Controllers;

use App\Models\UsefulLink;
use Illuminate\Http\Request;
use Inertia\Inertia;

class UsefulLinkController extends Controller
{
    /**
     * Display a listing of the useful links and bookmarks.
     */
    public function index(Request $request)
    {
        $search = trim($request->input('search', ''));
        $category = trim($request->input('category', ''));

        $query = UsefulLink::with('creator:id,name');

        if (!empty($search)) {
            $query->where(function ($q) use ($search) {
                $q->where('title', 'like', "%{$search}%")
                  ->orWhere('url', 'like', "%{$search}%")
                  ->orWhere('username_or_email', 'like', "%{$search}%")
                  ->orWhere('notes', 'like', "%{$search}%")
                  ->orWhere('category', 'like', "%{$search}%");
            });
        }

        if (!empty($category) && $category !== 'All') {
            $query->where('category', $category);
        }

        $links = $query->orderByDesc('is_pinned')
            ->orderByDesc('id')
            ->paginate(30)
            ->withQueryString();

        // Get Pinned links separately for quick highlights
        $pinnedLinks = UsefulLink::with('creator:id,name')
            ->where('is_pinned', true)
            ->latest('updated_at')
            ->take(8)
            ->get();

        // Standard default categories + any existing categories in database
        $defaultCategories = [
            'General',
            'Banking & Finance',
            'Government / NBR',
            'Client Portals',
            'Design & Media',
            'Tools & Cloud',
            'Internal / Office',
            'Others'
        ];

        $dbCategories = UsefulLink::distinct()->pluck('category')->filter()->values()->toArray();
        $allCategories = array_values(array_unique(array_merge($defaultCategories, $dbCategories)));

        // Category counts
        $categoryCounts = UsefulLink::selectRaw('category, count(*) as count')
            ->groupBy('category')
            ->pluck('count', 'category')
            ->toArray();

        $stats = [
            'total_links' => UsefulLink::count(),
            'pinned_links' => UsefulLink::where('is_pinned', true)->count(),
            'categories_count' => count($allCategories),
        ];

        return Inertia::render('Admin/UsefulLinks/Index', [
            'links' => $links,
            'pinnedLinks' => $pinnedLinks,
            'categories' => $allCategories,
            'categoryCounts' => $categoryCounts,
            'stats' => $stats,
            'filters' => [
                'search' => $search,
                'category' => $category ?: 'All',
            ],
        ]);
    }

    /**
     * Store a newly created useful link.
     */
    public function store(Request $request)
    {
        $validated = $request->validate([
            'title' => 'required|string|max:255',
            'url' => 'required|string|max:2000',
            'category' => 'required|string|max:100',
            'username_or_email' => 'nullable|string|max:255',
            'notes' => 'nullable|string|max:3000',
            'is_pinned' => 'nullable|boolean',
        ]);

        $validated['url'] = $this->normalizeUrl($validated['url']);
        $validated['created_by'] = auth()->id();
        $validated['is_pinned'] = (bool)($request->input('is_pinned', false));

        UsefulLink::create($validated);

        return redirect()->back()->with('success', 'New link saved successfully!');
    }

    /**
     * Update the specified useful link.
     */
    public function update(Request $request, UsefulLink $usefulLink)
    {
        $validated = $request->validate([
            'title' => 'required|string|max:255',
            'url' => 'required|string|max:2000',
            'category' => 'required|string|max:100',
            'username_or_email' => 'nullable|string|max:255',
            'notes' => 'nullable|string|max:3000',
            'is_pinned' => 'nullable|boolean',
        ]);

        $validated['url'] = $this->normalizeUrl($validated['url']);
        $validated['is_pinned'] = (bool)($request->input('is_pinned', false));

        $usefulLink->update($validated);

        return redirect()->back()->with('success', 'Link updated successfully!');
    }

    /**
     * Toggle the pinned status of a useful link.
     */
    public function togglePin(UsefulLink $usefulLink)
    {
        $usefulLink->update([
            'is_pinned' => !$usefulLink->is_pinned,
        ]);

        $statusMsg = $usefulLink->is_pinned ? 'Link pinned to top!' : 'Link unpinned.';
        return redirect()->back()->with('success', $statusMsg);
    }

    /**
     * Remove the specified useful link.
     */
    public function destroy(UsefulLink $usefulLink)
    {
        $usefulLink->delete();

        return redirect()->back()->with('success', 'Link deleted successfully!');
    }

    /**
     * Ensure URL has a valid protocol prefix.
     */
    protected function normalizeUrl(string $url): string
    {
        $url = trim($url);
        if (!preg_match('/^https?:\/\//i', $url) && !preg_match('/^mailto:/i', $url) && !preg_match('/^tel:/i', $url)) {
            $url = 'https://' . $url;
        }
        return $url;
    }
}

