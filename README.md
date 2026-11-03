# Unibox Office

Unibox Office হলো অফিস পরিচালনার ওয়েব অ্যাপ। একই জায়গা থেকে client ও project, invoice ও payment, খরচ, কর্মী এবং হিসাবের রিপোর্ট পরিচালনা করা যায়। এই নির্দেশিকাটি project চালু করা এবং প্রতিদিনের সাধারণ কাজ খুঁজে পেতে সাহায্য করবে।

## প্রথমবার চালু করা

### প্রয়োজনীয় সফটওয়্যার

- PHP 8.2 বা তার পরের compatible version
- Composer
- Node.js ও npm
- MySQL database

### Local development setup

Repository folder-এ terminal খুলে নিচের ধাপগুলো অনুসরণ করুন:

```powershell
Copy-Item .env.example .env
composer install
npm install
```

`.env` ফাইলে `APP_ENV=local`, `APP_DEBUG=true`, `DB_DATABASE`, `DB_USERNAME`, `DB_PASSWORD` এবং `APP_URL` নিজের local environment অনুযায়ী সেট করুন। এরপর:

```powershell
php artisan key:generate
php artisan migrate
composer run dev
```

Development server বন্ধ করতে terminal-এ `Ctrl+C` চাপুন। Frontend production build করতে:

```powershell
npm run build
```

## প্রতিদিনের সাধারণ কাজ

নতুন client-এর কাজ সাধারণত এই ক্রমে করুন:

1. **Client যোগ করুন** — `Clients & Projects` → `Clients`
2. **Project তৈরি করুন** — `Clients & Projects` → `Projects`
3. **কাজ ভাগ করুন** — `Clients & Projects` → `Tasks`
4. **Invoice তৈরি করুন** — `Invoices & Payments` → `Invoices`
5. **Payment নথিভুক্ত করুন** — `Invoices & Payments` → `Received Payments`
6. **অবস্থা যাচাই করুন** — `Reports` → `Client Ledger` বা `Client Dues`

Project-সংক্রান্ত খরচ `Money` → `Accounts & Expenses` থেকে যোগ করুন। দৈনিক লেনদেন দেখতে `Reports` → `Daily Daybook` ব্যবহার করুন।

## কোন কাজ কোথায়

| Menu | কী পাওয়া যাবে |
|---|---|
| Dashboard | আজকের আয়-ব্যয়, গুরুত্বপূর্ণ হিসাব, pending item ও সাধারণ workflow |
| Clients & Projects | Client, project, task এবং vendor |
| People & Payroll | Employee, attendance, leave, payroll ও department |
| Invoices & Payments | Invoice, received payment ও client advance |
| Accounts & Expenses | Account balance, transaction, investment এবং বিভিন্ন খরচ |
| Office Tools | Requisition, asset, delivery challan, notice ও useful links |
| Reports | Financial summary, daybook, dues, ledger ও project report |
| Administration | Invoice/challan settings, user, role, permission ও database backup |

কোনো menu না দেখালে আপনার account-এ সেই অংশের permission নাও থাকতে পারে। প্রয়োজন হলে Super Admin-এর সঙ্গে যোগাযোগ করুন।

## Project-এর গুরুত্বপূর্ণ জায়গা

| Path | ব্যবহার |
|---|---|
| `app/Http/Controllers/` | Request ও page-এর business flow |
| `app/Models/` | Database model |
| `app/Services/` | একাধিক জায়গায় ব্যবহৃত business logic |
| `routes/web.php` | Login-পরবর্তী page ও action route |
| `resources/js/Pages/Admin/` | Admin module-এর React page |
| `resources/js/Layouts/AdminLayout.jsx` | Sidebar, search ও shared navigation |
| `database/migrations/` | Database table-এর versioned change |
| `tests/` | Feature ও unit test |

## সহায়ক shortcut ও যাচাই

- Global search খুলুন: `Ctrl+K` (Mac-এ `⌘K`)
- Sidebar দেখানো/লুকানো: `Ctrl+B` (Mac-এ `⌘B`)
- Test চালান: `composer test`
- Frontend build যাচাই করুন: `npm run build`

## গুরুত্বপূর্ণ

- বাস্তব credentials ও server-specific configuration শুধু `.env` ফাইলে রাখুন; `.env` কখনো Git-এ commit করবেন না।
- Database migration চালানোর আগে database backup ও deployment procedure যাচাই করুন।
- Production server-এ `APP_DEBUG=false` রাখুন।
