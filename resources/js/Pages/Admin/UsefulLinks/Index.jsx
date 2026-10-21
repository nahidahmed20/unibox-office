import React, { useState, useEffect, useRef } from 'react';
import AdminLayout from '@/Layouts/AdminLayout';
import { Head, useForm, router } from '@inertiajs/react';
import Swal from 'sweetalert2';

export default function Index({
    links = { data: [], links: [] },
    pinnedLinks = [],
    categories = [],
    categoryCounts = {},
    stats = {},
    filters = { search: '', category: 'All' }
}) {
    const [searchTerm, setSearchTerm] = useState(filters.search || '');
    const [selectedCategory, setSelectedCategory] = useState(filters.category || 'All');
    const [viewMode, setViewMode] = useState('grid'); // 'grid' or 'table'
    const [showModal, setShowModal] = useState(false);
    const [editingLink, setEditingLink] = useState(null);
    const [copiedId, setCopiedId] = useState(null);

    const isFirstRender = useRef(true);

    const { data, setData, post, put, delete: destroy, reset, processing, errors, clearErrors } = useForm({
        id: '',
        title: '',
        url: '',
        category: 'General',
        custom_category: '',
        username_or_email: '',
        notes: '',
        is_pinned: false,
    });

    // Debounced search & filter sync
    useEffect(() => {
        if (isFirstRender.current) {
            isFirstRender.current = false;
            return;
        }

        const timer = setTimeout(() => {
            router.get(
                route('admin.useful-links.index'),
                {
                    search: searchTerm,
                    category: selectedCategory,
                },
                {
                    preserveState: true,
                    preserveScroll: true,
                    replace: true,
                }
            );
        }, 350);

        return () => clearTimeout(timer);
    }, [searchTerm, selectedCategory]);

    // Open Modal for Create
    const handleOpenCreate = () => {
        setEditingLink(null);
        clearErrors();
        reset({
            id: '',
            title: '',
            url: '',
            category: selectedCategory !== 'All' ? selectedCategory : 'General',
            custom_category: '',
            username_or_email: '',
            notes: '',
            is_pinned: false,
        });
        setShowModal(true);
    };

    // Open Modal for Edit
    const handleOpenEdit = (link) => {
        setEditingLink(link);
        clearErrors();
        setData({
            id: link.id,
            title: link.title,
            url: link.url,
            category: categories.includes(link.category) ? link.category : 'Custom',
            custom_category: categories.includes(link.category) ? '' : link.category,
            username_or_email: link.username_or_email || '',
            notes: link.notes || '',
            is_pinned: Boolean(link.is_pinned),
        });
        setShowModal(true);
    };

    // Save or Update
    const handleSubmit = (e) => {
        e.preventDefault();

        const payload = {
            ...data,
            category: data.category === 'Custom' && data.custom_category.trim()
                ? data.custom_category.trim()
                : data.category,
        };

        if (editingLink) {
            put(route('admin.useful-links.update', editingLink.id), {
                data: payload,
                preserveScroll: true,
                onSuccess: () => {
                    setShowModal(false);
                    Swal.fire({
                        icon: 'success',
                        title: 'Success!',
                        text: 'Link updated successfully.',
                        timer: 1600,
                        showConfirmButton: false,
                    });
                },
            });
        } else {
            post(route('admin.useful-links.store'), {
                data: payload,
                preserveScroll: true,
                onSuccess: () => {
                    setShowModal(false);
                    reset();
                    Swal.fire({
                        icon: 'success',
                        title: 'Success!',
                        text: 'New link saved successfully.',
                        timer: 1600,
                        showConfirmButton: false,
                    });
                },
            });
        }
    };

    // Toggle Pin
    const handleTogglePin = (link) => {
        router.post(
            route('admin.useful-links.toggle-pin', link.id),
            {},
            {
                preserveScroll: true,
                onSuccess: () => {
                    const Toast = Swal.mixin({
                        toast: true,
                        position: 'top-end',
                        showConfirmButton: false,
                        timer: 1800,
                    });
                    Toast.fire({
                        icon: 'info',
                        title: link.is_pinned ? 'Unpinned' : 'Pinned to top 📌',
                    });
                },
            }
        );
    };

    // Delete Link
    const handleDelete = (link) => {
        Swal.fire({
            title: 'Are you sure?',
            text: `Do you really want to delete "${link.title}"?`,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#e11d48',
            cancelButtonColor: '#64748b',
            confirmButtonText: 'Yes, Delete',
            cancelButtonText: 'Cancel',
        }).then((result) => {
            if (result.isConfirmed) {
                router.delete(route('admin.useful-links.destroy', link.id), {
                    preserveScroll: true,
                    onSuccess: () => {
                        Swal.fire({
                            icon: 'success',
                            title: 'Deleted!',
                            text: 'Link deleted successfully.',
                            timer: 1500,
                            showConfirmButton: false,
                        });
                    },
                });
            }
        });
    };

    // Copy to clipboard helper
    const handleCopy = (text, id, label = 'Link') => {
        if (!text) return;
        navigator.clipboard.writeText(text);
        setCopiedId(id);
        setTimeout(() => setCopiedId(null), 2000);

        const Toast = Swal.mixin({
            toast: true,
            position: 'top-end',
            showConfirmButton: false,
            timer: 1800,
        });
        Toast.fire({
            icon: 'success',
            title: `${label} copied to clipboard!`,
        });
    };

    // Category style & icon helper
    const getCategoryBadge = (cat) => {
        switch (cat) {
            case 'Banking & Finance':
                return { bg: 'bg-emerald-50 text-emerald-700 border-emerald-200', icon: 'fa-solid fa-building-columns' };
            case 'Government / NBR':
                return { bg: 'bg-blue-50 text-blue-700 border-blue-200', icon: 'fa-solid fa-landmark' };
            case 'Client Portals':
                return { bg: 'bg-purple-50 text-purple-700 border-purple-200', icon: 'fa-solid fa-user-tie' };
            case 'Design & Media':
                return { bg: 'bg-pink-50 text-pink-700 border-pink-200', icon: 'fa-solid fa-palette' };
            case 'Tools & Cloud':
                return { bg: 'bg-amber-50 text-amber-700 border-amber-200', icon: 'fa-solid fa-cloud' };
            case 'Internal / Office':
                return { bg: 'bg-indigo-50 text-indigo-700 border-indigo-200', icon: 'fa-solid fa-briefcase' };
            default:
                return { bg: 'bg-slate-100 text-slate-700 border-slate-200', icon: 'fa-solid fa-link' };
        }
    };

    // Hostname extractor
    const getHostname = (url) => {
        try {
            return new URL(url).hostname.replace(/^www\./, '');
        } catch {
            return url;
        }
    };

    return (
        <AdminLayout>
            <Head title="Useful Links & Resources - Bookmarks Hub" />

            <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8 space-y-6">

                {/* Top Header & Command Bar */}
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between bg-white p-6 rounded-2xl border border-gray-200/80 shadow-sm">
                    <div>
                        <div className="flex items-center gap-3">
                            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-amber-500/10 text-amber-600 font-bold text-xl shadow-inner">
                                <i className="fa-solid fa-bookmark"></i>
                            </div>
                            <div>
                                <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-gray-900">
                                    Useful Links & Resources Hub
                                </h1>
                                <p className="text-xs sm:text-sm text-gray-500 mt-0.5">
                                    Centralized repository for office portals, drives, banking, resources, and credentials
                                </p>
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center gap-3">
                        {/* Add New Link Button */}
                        <button
                            onClick={handleOpenCreate}
                            className="inline-flex items-center gap-2 rounded-xl bg-[#070b15] px-4 py-2.5 text-sm font-semibold text-white shadow-md hover:bg-gray-800 transition-all hover:scale-[1.02] active:scale-[0.98]"
                        >
                            <i className="fa-solid fa-plus text-xs"></i>
                            <span>Add New Link</span>
                        </button>

                        {/* View Switcher */}
                        <div className="hidden sm:flex items-center rounded-xl border border-gray-200 bg-gray-50 p-1">
                            <button
                                onClick={() => setViewMode('grid')}
                                className={`rounded-lg px-2.5 py-1.5 text-xs font-semibold transition-all ${
                                    viewMode === 'grid' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-900'
                                }`}
                                title="Grid View"
                            >
                                <i className="fa-solid fa-border-all"></i>
                            </button>
                            <button
                                onClick={() => setViewMode('table')}
                                className={`rounded-lg px-2.5 py-1.5 text-xs font-semibold transition-all ${
                                    viewMode === 'table' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-900'
                                }`}
                                title="Table View"
                            >
                                <i className="fa-solid fa-list"></i>
                            </button>
                        </div>
                    </div>
                </div>

                {/* Stats Summary Strip */}
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                    <div className="flex items-center gap-4 rounded-2xl border border-gray-200/80 bg-white p-4 shadow-sm">
                        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                            <i className="fa-solid fa-globe text-lg"></i>
                        </div>
                        <div>
                            <p className="text-xs font-medium uppercase tracking-wider text-gray-500">Total Saved Links</p>
                            <p className="text-xl font-bold text-gray-900 mt-0.5">{stats.total_links || 0} Links</p>
                        </div>
                    </div>

                    <div className="flex items-center gap-4 rounded-2xl border border-gray-200/80 bg-white p-4 shadow-sm">
                        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-amber-50 text-amber-600">
                            <i className="fa-solid fa-thumbtack text-lg"></i>
                        </div>
                        <div>
                            <p className="text-xs font-medium uppercase tracking-wider text-gray-500">Pinned Top Links</p>
                            <p className="text-xl font-bold text-gray-900 mt-0.5">{stats.pinned_links || 0} Pinned</p>
                        </div>
                    </div>

                    <div className="flex items-center gap-4 rounded-2xl border border-gray-200/80 bg-white p-4 shadow-sm">
                        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
                            <i className="fa-solid fa-layer-group text-lg"></i>
                        </div>
                        <div>
                            <p className="text-xs font-medium uppercase tracking-wider text-gray-500">Active Categories</p>
                            <p className="text-xl font-bold text-gray-900 mt-0.5">{stats.categories_count || 0} Categories</p>
                        </div>
                    </div>
                </div>

                {/* Pinned Links Section (If any) */}
                {pinnedLinks && pinnedLinks.length > 0 && (
                    <div className="rounded-2xl border border-amber-200/70 bg-gradient-to-br from-amber-50/60 via-amber-50/20 to-white p-5 shadow-sm space-y-3">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <span className="flex h-6 w-6 items-center justify-center rounded-md bg-amber-500 text-white text-xs">
                                    <i className="fa-solid fa-thumbtack"></i>
                                </span>
                                <h3 className="text-sm font-bold uppercase tracking-wider text-amber-900">
                                    Pinned Quick Access
                                </h3>
                            </div>
                            <span className="text-xs font-medium text-amber-700 bg-amber-100/70 px-2 py-0.5 rounded-full">
                                {pinnedLinks.length} Pinned
                            </span>
                        </div>

                        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
                            {pinnedLinks.map((item) => {
                                const badge = getCategoryBadge(item.category);
                                return (
                                    <div
                                        key={`pinned-${item.id}`}
                                        className="group relative flex flex-col justify-between rounded-xl border border-amber-200/80 bg-white p-4 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md"
                                    >
                                        <div>
                                            <div className="flex items-start justify-between gap-2 mb-2">
                                                <span className={`inline-flex items-center gap-1.5 rounded-md border px-2 py-0.5 text-[11px] font-semibold ${badge.bg}`}>
                                                    <i className={badge.icon}></i>
                                                    <span>{item.category}</span>
                                                </span>
                                                <button
                                                    onClick={() => handleTogglePin(item)}
                                                    className="text-amber-500 hover:text-amber-600 transition-colors p-1"
                                                    title="Unpin"
                                                >
                                                    <i className="fa-solid fa-thumbtack text-xs"></i>
                                                </button>
                                            </div>

                                            <h4 className="text-sm font-bold text-gray-900 group-hover:text-amber-600 transition-colors line-clamp-1">
                                                {item.title}
                                            </h4>
                                            <p className="text-xs text-gray-400 font-mono mt-0.5 truncate">
                                                {getHostname(item.url)}
                                            </p>

                                            {item.username_or_email && (
                                                <div className="mt-2.5 flex items-center justify-between rounded-lg bg-gray-50 border border-gray-100 px-2 py-1 text-xs">
                                                    <span className="text-gray-500 truncate mr-2 font-mono">
                                                        <i className="fa-regular fa-user mr-1 text-[10px]"></i>
                                                        {item.username_or_email}
                                                    </span>
                                                    <button
                                                        onClick={() => handleCopy(item.username_or_email, `pinned-user-${item.id}`, 'Username')}
                                                        className="text-gray-400 hover:text-gray-700 shrink-0"
                                                        title="Copy Username"
                                                    >
                                                        <i className={`fa-regular ${copiedId === `pinned-user-${item.id}` ? 'fa-circle-check text-emerald-500' : 'fa-copy'}`}></i>
                                                    </button>
                                                </div>
                                            )}
                                        </div>

                                        <div className="mt-4 flex items-center gap-2 border-t border-gray-100 pt-3">
                                            <a
                                                href={item.url}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-lg bg-amber-500/10 hover:bg-amber-500 hover:text-white px-2.5 py-1.5 text-xs font-bold text-amber-700 transition-all"
                                            >
                                                <span>Open</span>
                                                <i className="fa-solid fa-arrow-up-right-from-square text-[10px]"></i>
                                            </a>
                                            <button
                                                onClick={() => handleCopy(item.url, `pinned-url-${item.id}`, 'URL')}
                                                className="inline-flex items-center justify-center h-8 w-8 rounded-lg border border-gray-200 bg-white text-gray-500 hover:bg-gray-50 hover:text-gray-900 transition-all"
                                                title="Copy URL"
                                            >
                                                <i className={`fa-regular ${copiedId === `pinned-url-${item.id}` ? 'fa-circle-check text-emerald-500' : 'fa-copy'} text-xs`}></i>
                                            </button>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}

                {/* Filters, Search & Categories bar */}
                <div className="space-y-3">
                    <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
                        {/* Live Search */}
                        <div className="relative flex-1 max-w-md">
                            <i className="fa-solid fa-magnifying-glass absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 text-sm"></i>
                            <input
                                type="text"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                placeholder="Search by title, URL, username, or notes..."
                                className="w-full rounded-xl border border-gray-200 bg-white pl-10 pr-9 py-2.5 text-sm text-gray-800 placeholder-gray-400 focus:border-amber-500 focus:ring-1 focus:ring-amber-500 transition-all shadow-sm"
                            />
                            {searchTerm && (
                                <button
                                    onClick={() => setSearchTerm('')}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 text-xs"
                                >
                                    <i className="fa-solid fa-xmark"></i>
                                </button>
                            )}
                        </div>

                        {/* Showing count indicator */}
                        <div className="text-xs font-medium text-gray-500 flex items-center gap-2">
                            <span>Total Results: <b>{links.total || links.data.length}</b></span>
                        </div>
                    </div>

                    {/* Category Filter Pills */}
                    <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none text-xs">
                        <button
                            onClick={() => setSelectedCategory('All')}
                            className={`shrink-0 rounded-xl px-3.5 py-1.5 font-semibold transition-all ${
                                selectedCategory === 'All'
                                    ? 'bg-[#070b15] text-white shadow-sm'
                                    : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
                            }`}
                        >
                            All Categories ({stats.total_links || 0})
                        </button>

                        {categories.map((cat) => {
                            const count = categoryCounts[cat] || 0;
                            const isSelected = selectedCategory === cat;
                            return (
                                <button
                                    key={cat}
                                    onClick={() => setSelectedCategory(cat)}
                                    className={`shrink-0 rounded-xl px-3.5 py-1.5 font-semibold transition-all flex items-center gap-1.5 ${
                                        isSelected
                                            ? 'bg-amber-600 text-white shadow-sm'
                                            : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
                                    }`}
                                >
                                    <span>{cat}</span>
                                    {count > 0 && (
                                        <span className={`px-1.5 py-0.2 rounded-full text-[10px] ${isSelected ? 'bg-amber-700/60 text-white' : 'bg-gray-100 text-gray-500'}`}>
                                            {count}
                                        </span>
                                    )}
                                </button>
                            );
                        })}
                    </div>
                </div>

                {/* Main Content: Links Display */}
                {links.data.length === 0 ? (
                    <div className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-gray-200 bg-white p-12 text-center shadow-sm">
                        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-amber-50 text-amber-500 text-2xl mb-4">
                            <i className="fa-solid fa-link-slash"></i>
                        </div>
                        <h3 className="text-base font-bold text-gray-800">No Links Found</h3>
                        <p className="text-xs text-gray-500 mt-1 max-w-sm">
                            {searchTerm || selectedCategory !== 'All'
                                ? 'No links matched your search or filters. Try clearing your search or filter.'
                                : 'No bookmarks or resources saved yet. Add your first link now!'}
                        </p>
                        <button
                            onClick={handleOpenCreate}
                            className="mt-4 inline-flex items-center gap-2 rounded-xl bg-[#070b15] px-4 py-2 text-xs font-semibold text-white shadow hover:bg-gray-800 transition-all"
                        >
                            <i className="fa-solid fa-plus"></i>
                            <span>Add First Link</span>
                        </button>
                    </div>
                ) : viewMode === 'grid' ? (
                    /* Grid Card View */
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                        {links.data.map((item) => {
                            const badge = getCategoryBadge(item.category);
                            return (
                                <div
                                    key={item.id}
                                    className={`relative flex flex-col justify-between rounded-2xl border bg-white p-5 shadow-sm transition-all hover:shadow-md ${
                                        item.is_pinned ? 'border-amber-300 ring-1 ring-amber-200/60' : 'border-gray-200/80 hover:border-gray-300'
                                    }`}
                                >
                                    <div>
                                        {/* Card Top Strip */}
                                        <div className="flex items-start justify-between gap-2 mb-3">
                                            <span className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-xs font-semibold ${badge.bg}`}>
                                                <i className={badge.icon}></i>
                                                <span>{item.category}</span>
                                            </span>

                                            <div className="flex items-center gap-1">
                                                <button
                                                    onClick={() => handleTogglePin(item)}
                                                    className={`h-7 w-7 rounded-lg flex items-center justify-center text-xs transition-colors ${
                                                        item.is_pinned ? 'text-amber-500 bg-amber-50 hover:bg-amber-100' : 'text-gray-300 hover:text-gray-500 hover:bg-gray-50'
                                                    }`}
                                                    title={item.is_pinned ? 'Unpin' : 'Pin to top'}
                                                >
                                                    <i className="fa-solid fa-thumbtack"></i>
                                                </button>

                                                <button
                                                    onClick={() => handleOpenEdit(item)}
                                                    className="h-7 w-7 rounded-lg flex items-center justify-center text-xs text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 transition-colors"
                                                    title="Edit"
                                                >
                                                    <i className="fa-regular fa-pen-to-square"></i>
                                                </button>

                                                <button
                                                    onClick={() => handleDelete(item)}
                                                    className="h-7 w-7 rounded-lg flex items-center justify-center text-xs text-gray-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                                                    title="Delete"
                                                >
                                                    <i className="fa-regular fa-trash-can"></i>
                                                </button>
                                            </div>
                                        </div>

                                        {/* Title & Domain */}
                                        <h3 className="text-base font-bold text-gray-900 line-clamp-1">
                                            {item.title}
                                        </h3>
                                        <a
                                            href={item.url}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="inline-flex items-center gap-1.5 text-xs text-indigo-600 hover:text-indigo-800 font-mono mt-0.5 truncate hover:underline max-w-full"
                                            title={item.url}
                                        >
                                            <i className="fa-solid fa-link text-[10px]"></i>
                                            <span className="truncate">{getHostname(item.url)}</span>
                                        </a>

                                        {/* Username / Credentials (if provided) */}
                                        {item.username_or_email && (
                                            <div className="mt-3 flex items-center justify-between rounded-xl bg-slate-50 border border-slate-100 px-3 py-1.5 text-xs">
                                                <div className="flex items-center gap-2 truncate mr-2">
                                                    <i className="fa-regular fa-id-badge text-slate-400"></i>
                                                    <span className="font-mono text-slate-700 truncate select-all">{item.username_or_email}</span>
                                                </div>
                                                <button
                                                    onClick={() => handleCopy(item.username_or_email, `user-${item.id}`, 'Username')}
                                                    className="text-slate-400 hover:text-slate-700 shrink-0 text-xs p-0.5"
                                                    title="Copy Username"
                                                >
                                                    <i className={`fa-regular ${copiedId === `user-${item.id}` ? 'fa-circle-check text-emerald-500' : 'fa-copy'}`}></i>
                                                </button>
                                            </div>
                                        )}

                                        {/* Notes / Instructions (if provided) */}
                                        {item.notes && (
                                            <div className="mt-2.5 rounded-xl bg-amber-50/50 border border-amber-100/60 p-2.5 text-xs text-slate-600 leading-relaxed whitespace-pre-line line-clamp-3">
                                                <i className="fa-regular fa-note-sticky text-amber-500 mr-1.5"></i>
                                                {item.notes}
                                            </div>
                                        )}
                                    </div>

                                    {/* Footer Actions */}
                                    <div className="mt-5 flex items-center gap-2 border-t border-gray-100 pt-3">
                                        <a
                                            href={item.url}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl bg-[#070b15] hover:bg-gray-800 px-3 py-2 text-xs font-bold text-white shadow-sm transition-all"
                                        >
                                            <span>Visit Website</span>
                                            <i className="fa-solid fa-arrow-up-right-from-square text-[10px]"></i>
                                        </a>

                                        <button
                                            onClick={() => handleCopy(item.url, `card-url-${item.id}`, 'URL')}
                                            className="inline-flex items-center justify-center gap-1.5 h-8.5 rounded-xl border border-gray-200 bg-white px-3 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-50 transition-all"
                                            title="Copy URL"
                                        >
                                            <i className={`fa-regular ${copiedId === `card-url-${item.id}` ? 'fa-circle-check text-emerald-500' : 'fa-copy'}`}></i>
                                            <span className="hidden min-[380px]:inline">Copy</span>
                                        </button>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                ) : (
                    /* Detailed Table View */
                    <div className="overflow-hidden rounded-2xl border border-gray-200/80 bg-white shadow-sm">
                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-xs text-gray-600">
                                <thead className="bg-gray-50/80 text-[11px] font-bold uppercase tracking-wider text-gray-500 border-b border-gray-100">
                                    <tr>
                                        <th className="px-4 py-3.5 w-12 text-center">Pin</th>
                                        <th className="px-4 py-3.5">Title & URL</th>
                                        <th className="px-4 py-3.5">Category</th>
                                        <th className="px-4 py-3.5">User / Credentials</th>
                                        <th className="px-4 py-3.5">Notes</th>
                                        <th className="px-4 py-3.5 text-right">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    {links.data.map((item) => {
                                        const badge = getCategoryBadge(item.category);
                                        return (
                                            <tr key={item.id} className="hover:bg-gray-50/60 transition-colors">
                                                <td className="px-4 py-3 text-center">
                                                    <button
                                                        onClick={() => handleTogglePin(item)}
                                                        className={`text-sm ${item.is_pinned ? 'text-amber-500' : 'text-gray-300 hover:text-gray-400'}`}
                                                        title={item.is_pinned ? 'Unpin' : 'Pin to top'}
                                                    >
                                                        <i className="fa-solid fa-thumbtack"></i>
                                                    </button>
                                                </td>
                                                <td className="px-4 py-3">
                                                    <div className="font-bold text-gray-900">{item.title}</div>
                                                    <div className="text-[11px] text-gray-400 font-mono truncate max-w-xs">{item.url}</div>
                                                </td>
                                                <td className="px-4 py-3">
                                                    <span className={`inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-[11px] font-semibold ${badge.bg}`}>
                                                        <i className={badge.icon}></i>
                                                        <span>{item.category}</span>
                                                    </span>
                                                </td>
                                                <td className="px-4 py-3 font-mono text-gray-700">
                                                    {item.username_or_email ? (
                                                        <span
                                                            onClick={() => handleCopy(item.username_or_email, `tbl-user-${item.id}`, 'Username')}
                                                            className="cursor-pointer hover:text-indigo-600 inline-flex items-center gap-1"
                                                            title="Click to copy"
                                                        >
                                                            {item.username_or_email}
                                                            <i className="fa-regular fa-copy text-[10px] text-gray-400"></i>
                                                        </span>
                                                    ) : (
                                                        <span className="text-gray-300">-</span>
                                                    )}
                                                </td>
                                                <td className="px-4 py-3 text-gray-500 max-w-xs truncate" title={item.notes}>
                                                    {item.notes || '-'}
                                                </td>
                                                <td className="px-4 py-3 text-right">
                                                    <div className="inline-flex items-center gap-1.5 justify-end">
                                                        <a
                                                            href={item.url}
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                            className="inline-flex h-7 w-7 items-center justify-center rounded-lg bg-gray-100 text-gray-700 hover:bg-[#070b15] hover:text-white transition-all"
                                                            title="Visit"
                                                        >
                                                            <i className="fa-solid fa-arrow-up-right-from-square text-[10px]"></i>
                                                        </a>
                                                        <button
                                                            onClick={() => handleCopy(item.url, `tbl-url-${item.id}`, 'URL')}
                                                            className="inline-flex h-7 w-7 items-center justify-center rounded-lg bg-gray-100 text-gray-700 hover:bg-amber-500 hover:text-white transition-all"
                                                            title="Copy URL"
                                                        >
                                                            <i className={`fa-regular ${copiedId === `tbl-url-${item.id}` ? 'fa-circle-check text-emerald-500' : 'fa-copy'} text-[11px]`}></i>
                                                        </button>
                                                        <button
                                                            onClick={() => handleOpenEdit(item)}
                                                            className="inline-flex h-7 w-7 items-center justify-center rounded-lg bg-gray-100 text-gray-700 hover:bg-indigo-600 hover:text-white transition-all"
                                                            title="Edit"
                                                        >
                                                            <i className="fa-regular fa-pen-to-square text-[11px]"></i>
                                                        </button>
                                                        <button
                                                            onClick={() => handleDelete(item)}
                                                            className="inline-flex h-7 w-7 items-center justify-center rounded-lg bg-gray-100 text-gray-700 hover:bg-rose-600 hover:text-white transition-all"
                                                            title="Delete"
                                                        >
                                                            <i className="fa-regular fa-trash-can text-[11px]"></i>
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                {/* Pagination (if pages exist) */}
                {links.links && links.links.length > 3 && (
                    <div className="flex items-center justify-between border-t border-gray-200/80 bg-white px-4 py-3 rounded-2xl shadow-sm sm:px-6">
                        <div className="text-xs text-gray-500">
                            Showing <span className="font-semibold">{links.from || 0}</span> to <span className="font-semibold">{links.to || 0}</span> of <span className="font-semibold">{links.total || 0}</span> entries
                        </div>
                        <div className="flex items-center gap-1">
                            {links.links.map((link, idx) => (
                                <button
                                    key={idx}
                                    disabled={!link.url || link.active}
                                    onClick={() => link.url && router.get(link.url, {}, { preserveScroll: true, preserveState: true })}
                                    dangerouslySetInnerHTML={{ __html: link.label }}
                                    className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                                        link.active
                                            ? 'bg-[#070b15] text-white shadow-sm'
                                            : !link.url
                                            ? 'text-gray-300 cursor-not-allowed'
                                            : 'text-gray-600 hover:bg-gray-100'
                                    }`}
                                />
                            ))}
                        </div>
                    </div>
                )}

            </div>

            {/* Modal: Add / Edit Link */}
            {showModal && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-[#070b14]/75 backdrop-blur-md p-3 sm:p-6 overflow-y-auto animate-[fadeIn_0.2s_ease-out]">
                    <div className="w-full max-w-xl bg-slate-50 rounded-3xl shadow-2xl flex flex-col my-auto max-h-[96vh] sm:max-h-[92vh] overflow-hidden border border-slate-700/40 animate-[scaleIn_0.2s_ease-out]">
                        {/* Executive Header */}
                        <div className="relative overflow-hidden bg-gradient-to-r from-slate-900 via-slate-800 to-indigo-950 px-6 py-5 sm:px-8 sm:py-6 text-white border-b border-slate-700/80 shrink-0">
                            <span className="absolute -right-4 -bottom-6 text-[90px] font-mono text-white/[0.04] select-none pointer-events-none">🔗</span>
                            <div className="absolute right-10 top-0 h-32 w-32 bg-amber-500/10 rounded-full blur-2xl pointer-events-none"></div>

                            <div className="relative z-10 flex items-start justify-between gap-4">
                                <div className="flex items-center gap-3.5">
                                    <div className="h-12 w-12 rounded-2xl bg-amber-500/20 text-amber-400 border border-amber-500/30 flex items-center justify-center text-xl shadow-inner shrink-0">
                                        <i className={`fa-solid ${editingLink ? 'fa-pen-to-square' : 'fa-link'}`}></i>
                                    </div>
                                    <div>
                                        <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-amber-400/10 border border-amber-400/20 text-amber-300 text-[10px] font-black uppercase tracking-widest mb-1 shadow-sm">
                                            <i className="fa-solid fa-bookmark"></i> Quick Portal Link
                                        </div>
                                        <h3 className="text-[19px] sm:text-[22px] font-black text-white tracking-tight leading-tight">
                                            {editingLink ? 'Edit Link' : 'Add New Link'}
                                        </h3>
                                        <p className="text-[12px] sm:text-[13px] font-bold text-slate-400 mt-0.5">
                                            Corporate portals, banking & government web directories
                                        </p>
                                    </div>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => setShowModal(false)}
                                    className="text-slate-400 hover:text-white hover:bg-rose-600/80 h-9 w-9 rounded-full flex items-center justify-center transition-all shrink-0 bg-slate-800/80 border border-slate-700 cursor-pointer"
                                >
                                    <i className="fa-solid fa-xmark text-base"></i>
                                </button>
                            </div>
                        </div>

                        {/* Modal Form */}
                        <form onSubmit={handleSubmit} className="flex flex-col overflow-hidden h-full">
                            <div className="p-6 sm:p-8 overflow-y-auto custom-table-scroll space-y-4">
                                {/* Title */}
                                <div>
                                    <label className="block text-[12px] font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                                        Link Title <span className="text-rose-500">*</span>
                                    </label>
                                    <input
                                        type="text"
                                        required
                                        value={data.title}
                                        onChange={(e) => setData('title', e.target.value)}
                                        placeholder="e.g. Sonali Bank Corporate, NBR VAT Online, Canva Team"
                                        className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-800 placeholder-slate-400 focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 outline-none shadow-sm transition-all"
                                    />
                                    {errors.title && <p className="text-xs text-rose-500 mt-1">{errors.title}</p>}
                                </div>

                                {/* URL */}
                                <div>
                                    <label className="block text-[12px] font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                                        Website / Resource URL <span className="text-rose-500">*</span>
                                    </label>
                                    <div className="relative">
                                        <input
                                            type="text"
                                            required
                                            value={data.url}
                                            onChange={(e) => setData('url', e.target.value)}
                                            placeholder="e.g. https://vat.gov.bd or drive.google.com/..."
                                            className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-800 placeholder-slate-400 focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 outline-none shadow-sm transition-all font-mono"
                                        />
                                    </div>
                                    {errors.url && <p className="text-xs text-rose-500 mt-1">{errors.url}</p>}
                                </div>

                                {/* Category Selection */}
                                <div>
                                    <label className="block text-[12px] font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                                        Category <span className="text-rose-500">*</span>
                                    </label>
                                    <select
                                        value={data.category}
                                        onChange={(e) => setData('category', e.target.value)}
                                        className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-800 focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 outline-none shadow-sm transition-all"
                                    >
                                        {categories.map((c) => (
                                            <option key={c} value={c}>{c}</option>
                                        ))}
                                        <option value="Custom">+ Create New Category...</option>
                                    </select>

                                    {data.category === 'Custom' && (
                                        <input
                                            type="text"
                                            required
                                            value={data.custom_category}
                                            onChange={(e) => setData('custom_category', e.target.value)}
                                            placeholder="Enter new category name..."
                                            className="mt-2 w-full rounded-xl border border-amber-300 bg-amber-50/40 px-3.5 py-2 text-sm text-slate-800 placeholder-slate-400 focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 outline-none shadow-sm transition-all"
                                        />
                                    )}
                                </div>

                                {/* Username or Account Identifier (Optional) */}
                                <div>
                                    <label className="block text-[12px] font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                                        Username / Email / Account ID <span className="text-slate-400 font-normal lowercase">(optional)</span>
                                    </label>
                                    <input
                                        type="text"
                                        value={data.username_or_email}
                                        onChange={(e) => setData('username_or_email', e.target.value)}
                                        placeholder="e.g. unibox_admin, 01700000000"
                                        className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-800 placeholder-slate-400 focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 outline-none shadow-sm transition-all font-mono"
                                    />
                                </div>

                                {/* Notes / Instructions */}
                                <div>
                                    <label className="block text-[12px] font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                                        Notes / Instructions <span className="text-slate-400 font-normal lowercase">(optional)</span>
                                    </label>
                                    <textarea
                                        rows={3}
                                        value={data.notes}
                                        onChange={(e) => setData('notes', e.target.value)}
                                        placeholder="Login hints, branch codes, contact info, or instructions..."
                                        className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2 text-sm text-slate-800 placeholder-slate-400 focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 outline-none shadow-sm transition-all leading-relaxed"
                                    />
                                </div>

                                {/* Pinned Checkbox */}
                                <div className="flex items-center gap-2 pt-1">
                                    <input
                                        type="checkbox"
                                        id="is_pinned"
                                        checked={data.is_pinned}
                                        onChange={(e) => setData('is_pinned', e.target.checked)}
                                        className="h-4 w-4 rounded border-slate-300 text-amber-600 focus:ring-amber-500 cursor-pointer"
                                    />
                                    <label htmlFor="is_pinned" className="text-xs font-bold text-slate-700 cursor-pointer select-none">
                                        📌 Pin to top for quick access
                                    </label>
                                </div>
                            </div>

                            {/* Modal Footer */}
                            <div className="px-6 sm:px-8 py-4 border-t border-slate-200 bg-white flex justify-end gap-3 shrink-0 rounded-b-3xl">
                                <button
                                    type="button"
                                    onClick={() => setShowModal(false)}
                                    className="rounded-xl border border-slate-300 bg-white px-5 py-2.5 text-[13.5px] font-bold text-slate-700 transition-colors hover:bg-slate-100 shadow-xs cursor-pointer"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={processing}
                                    className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-slate-900 to-indigo-950 hover:from-slate-800 hover:to-indigo-900 px-6 py-2.5 text-[13.5px] font-bold text-white shadow-md shadow-indigo-950/20 transition-all disabled:opacity-50 cursor-pointer"
                                >
                                    {processing ? (
                                        <>
                                            <i className="fa-solid fa-spinner fa-spin"></i>
                                            <span>Saving...</span>
                                        </>
                                    ) : (
                                        <>
                                            <i className="fa-solid fa-check"></i>
                                            <span>{editingLink ? 'Update Link' : 'Save Link'}</span>
                                        </>
                                    )}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </AdminLayout>
    );
}
