# TaskMate — To-Do List System

A production-style to-do application built with **Laravel 12 (JSON API)** and a **Vite + React 18 single page application**, backed by **MySQL** and styled with a clean blue design system.

TaskMate gives you a personal task manager: create, organise, search, filter, sort and complete tasks, monitor progress on a live dashboard, and recover anything you accidentally delete from the trash.

---

## Table of Contents

- [Features](#features)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Requirements](#requirements)
- [Installation (Windows PowerShell)](#installation-windows-powershell)
- [Running the Application](#running-the-application)
- [Running the Tests](#running-the-tests)
- [Environment Variables](#environment-variables)
- [API Reference](#api-reference)
- [Database Schema](#database-schema)
- [Security Notes](#security-notes)
- [Troubleshooting](#troubleshooting)

---

## Features

### Authentication
- Register with name, email, password and confirmation (password policy enforced: minimum 8 characters).
- Log in / log out with Sanctum personal access tokens stored in `localStorage`.
- **Forgot password** — sends a reset link by e-mail (the `log` mail driver writes it to `storage/logs/laravel.log` locally).
- **Reset password** — token based, single use, invalidates the token once consumed.
- Guest users cannot reach any protected API endpoint (HTTP 401) and are bounced to `/login` by the front-end router.
- Profile screen to update name/e-mail and change the password (current password required).

### Task management
- Full **CRUD**: create, view, edit, delete tasks.
- Fields: title, description, due date, priority (`Low` / `Medium` / `High`), status (`Not Started` / `In Progress` / `Completed`).
- One-click **toggle** between *Completed* and *In Progress* straight from the table.
- **Search** across title and description.
- **Filters** by status, priority and due date (today / this week / overdue / no due date).
- **Sorting** by title, due date, priority, status and creation date, ascending or descending.
- **Pagination** with a configurable page size (capped at 50 per page).

### Dashboard
- Live counters: all tasks, in progress, completed, overdue, and trashed.
- Upcoming tasks (next 5 by due date) and recently created tasks.

### Trash
- Soft deletes — nothing is lost on the first delete.
- List, search and paginate trashed tasks.
- Restore a single task, restore everything, empty the trash permanently.

### Security
- Every task query is scoped to the authenticated user.
- A `TaskPolicy` enforces ownership on view, update, delete, restore and force delete.
- Cross-user access returns HTTP 403; guests receive HTTP 401.

### Interface
- Blue, responsive design system written from scratch in plain CSS (no UI framework).
- Collapsible sidebar with live counters, sticky top bar with global search.
- Toast notifications, accessible labels, keyboard-friendly forms.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Backend | Laravel 12.12, PHP 8.2 |
| Auth | Laravel Sanctum 4 (personal access tokens) |
| Database | MySQL / MariaDB (XAMPP) |
| Frontend | React 18, React Router 6 |
| HTTP client | Axios |
| Icons | Bootstrap Icons |
| Build tool | Vite 7 + `laravel-vite-plugin` 2 |
| Tests | PHPUnit 11 (Pest-free, plain Laravel test classes) |

---

## Project Structure

```
TODOLIST SYSTEM/
├── backend/                     # Laravel 12 application
│   ├── app/
│   │   ├── Http/
│   │   │   ├── Controllers/Api/ # Auth, PasswordReset, Task, Dashboard, Trash
│   │   │   └── Requests/        # StoreTaskRequest, UpdateTaskRequest
│   │   ├── Models/              # Task, User
│   │   ├── Notifications/       # ResetPasswordNotification
│   │   ├── Policies/            # TaskPolicy (ownership)
│   │   └── Providers/           # AppServiceProvider (policy + route binding)
│   ├── database/
│   │   ├── factories/           # TaskFactory, UserFactory
│   │   └── migrations/          # tasks table
│   ├── resources/views/app.blade.php   # SPA shell
│   ├── routes/api.php           # JSON API
│   ├── routes/web.php           # SPA routes
│   ├── tests/Feature/           # Authentication, TaskManagement, Trash, Authorization
│   └── public/build/            # compiled front-end assets
└── frontend/                    # Vite + React single page application
    └── src/
        ├── components/          # layout/, TaskTable, SummaryCards, Pagination, ...
        ├── context/             # AuthContext, ToastContext
        ├── lib/                 # api.js (axios), tasks.js (constants/helpers)
        ├── pages/               # Dashboard, TaskList, TaskForm, Trash, Profile, auth/
        ├── styles/index.css     # blue design system
        ├── App.jsx              # routes + auth guards
        └── main.jsx             # entry point
```

---

## Requirements

Make sure the following are installed and on your `PATH`:

| Tool | Version used | Check with |
|---|---|---|
| PHP | 8.2+ | `php -v` |
| Composer | 2.x | `composer -V` |
| Node.js | 18+ (v24 used) | `node -v` |
| npm | 9+ (v11 used) | `npm -v` |
| MySQL / MariaDB | 10.4+ (XAMPP) | `mysql --version` |

> **XAMPP note:** if `mysql` is not on your `PATH`, XAMPP's binary lives at `C:\xampp\mysql\bin\mysql.exe`. Start **Apache** and **MySQL** from the XAMPP Control Panel before continuing.

---

## Installation (Windows PowerShell)

All commands below are run from the project root (`C:\Users\Analee\Desktop\TODOLIST SYSTEM`).

### 1. Create the database

```powershell
cd backend
& "C:\xampp\mysql\bin\mysql.exe" -u root -e "CREATE DATABASE IF NOT EXISTS taskmate CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"
```

### 2. Install the Laravel dependencies

```powershell
cd backend
composer install
```

### 3. Create the environment file and generate the app key

```powershell
cd backend
Copy-Item .env.example .env
php artisan key:generate
```

### 4. Install the front-end dependencies

```powershell
cd frontend
npm install
```

### 5. Run the migrations

```powershell
cd backend
php artisan migrate
```

### 6. Build the front-end assets

```powershell
cd frontend
npm run build
```

You are now ready to run the app.

---

## Running the Application

### Development mode (hot reload)

Open **two** PowerShell windows.

**Window 1 — Laravel API + SPA shell:**

```powershell
cd backend
php artisan serve
```

**Window 2 — Vite dev server:**

```powershell
cd frontend
npm run dev
```

Then open **http://127.0.0.1:8000** in your browser.

- The Blade shell (`backend/resources/views/app.blade.php`) is served by Laravel on port **8000**.
- Vite serves the React modules with hot module replacement on port **5173**.
- The Vite dev server proxies `/api` and `/sanctum` to `http://127.0.0.1:8000`, so the front-end talks to the API without CORS issues.
- Laravel detects `backend/public/hot` and automatically injects the Vite dev server URLs into the page.

> The Vite dev server intentionally returns `404` for `/` — that is normal. The application is loaded through Laravel on port 8000.

### Production mode (single server)

```powershell
cd frontend
npm run build

cd ..\backend
php artisan serve
```

Open **http://127.0.0.1:8000**. Laravel serves the compiled assets from `backend/public/build`.

### Reading the password reset e-mail locally

`MAIL_MAILER=log` means reset links are written to the Laravel log instead of being sent:

```powershell
Get-Content backend\storage\logs\laravel.log | Select-String -Pattern "reset-password" -Context 0,2
```

---

## Running the Tests

```powershell
cd backend
php artisan test
```

Expected output:

```
Tests:    72 passed (254 assertions)
```

Run a single suite:

```powershell
php artisan test --filter=AuthenticationTest
php artisan test --filter=TaskManagementTest
php artisan test --filter=TrashTest
php artisan test --filter=AuthorizationTest
```

The test suite uses an in-memory SQLite database (configured in `backend/phpunit.xml`) so it never touches your MySQL data. Tests cover:

- **AuthenticationTest** — registration, duplicate e-mail, password policy, login, logout, profile updates, password change, forgot/reset flow, token invalidation, guest access.
- **TaskManagementTest** — create, read, update, soft delete, search, filters, sorting, pagination, validation, mass-assignment protection.
- **TrashTest** — listing, searching, restoring, restore-all, force delete, empty trash, hidden trashed tasks.
- **AuthorizationTest** — cross-user access is forbidden, dashboard counts are scoped, guests get 401.

Front-end linting:

```powershell
cd frontend
npm run lint
```

---

## Environment Variables

Copy `backend/.env.example` to `backend/.env`. The important entries:

| Variable | Purpose | Default |
|---|---|---|
| `APP_KEY` | Laravel encryption key | *(generated by `php artisan key:generate`)* |
| `APP_URL` | Base URL of the application | `http://localhost:8000` |
| `FRONTEND_URL` | Origin used to build password reset links | `http://localhost:8000` |
| `DB_CONNECTION` | Database driver | `mysql` |
| `DB_HOST` / `DB_PORT` | Database host and port | `127.0.0.1` / `3306` |
| `DB_DATABASE` | Database name | `taskmate` |
| `DB_USERNAME` / `DB_PASSWORD` | Database credentials | `root` / *(empty)* |
| `MAIL_MAILER` | Mail transport (`log` writes to the log file) | `log` |
| `MAIL_FROM_ADDRESS` | Sender address for notifications | `no-reply@taskmate.test` |
| `SANCTUM_STATEFUL_DOMAINS` | Comma separated list of stateful domains | localhost + 127.0.0.1 variants |
| `CORS_ALLOWED_ORIGINS` | Comma separated list of allowed origins | localhost + 127.0.0.1 variants |
| `VITE_API_URL` | API base URL used by the front-end | `/api` |

---

## API Reference

All protected routes require the header `Authorization: Bearer <token>`.

### Public

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/api/auth/register` | Create an account, returns a token |
| `POST` | `/api/auth/login` | Exchange credentials for a token |
| `POST` | `/api/auth/forgot-password` | Send a reset link |
| `POST` | `/api/auth/reset-password` | Consume a reset token |

### Authenticated

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/api/auth/logout` | Revoke the current token |
| `GET` | `/api/auth/me` | Current user |
| `PUT` | `/api/auth/profile` | Update name / e-mail |
| `PUT` | `/api/auth/password` | Change the password |
| `GET` | `/api/dashboard` | Live counters, upcoming and recent tasks |
| `GET` | `/api/tasks` | List tasks (search, filters, sort, pagination) |
| `POST` | `/api/tasks` | Create a task |
| `GET` | `/api/tasks/{id}` | Show a task |
| `PUT` | `/api/tasks/{id}` | Update a task |
| `DELETE` | `/api/tasks/{id}` | Move a task to the trash |
| `PATCH` | `/api/tasks/{id}/toggle` | Toggle *Completed* / *In Progress* |
| `PATCH` | `/api/tasks/{id}/status` | Update the status only |
| `GET` | `/api/trash` | List trashed tasks |
| `POST` | `/api/trash/restore-all` | Restore every trashed task |
| `POST` | `/api/trash/empty` | Permanently delete every trashed task |
| `PATCH` | `/api/trash/{id}/restore` | Restore one task |
| `DELETE` | `/api/trash/{id}` | Permanently delete one task |

### Query parameters for `GET /api/tasks`

| Parameter | Values | Default |
|---|---|---|
| `search` | free text (title + description) | — |
| `status` | `Not Started`, `In Progress`, `Completed`, `all` | `all` |
| `priority` | `Low`, `Medium`, `High`, `all` | `all` |
| `due` | `today`, `week`, `overdue`, `no_due_date` | — |
| `sort` | `title`, `due_date`, `priority`, `status`, `created_at` | `created_at` |
| `direction` | `asc`, `desc` | `desc` |
| `per_page` | 1 – 50 | `10` |
| `page` | page number | `1` |

Example response:

```json
{
  "data": [ { "id": 1, "title": "Write the report", "priority": "High", "status": "In Progress", "due_date": "2026-12-01" } ],
  "meta": { "current_page": 1, "last_page": 3, "per_page": 10, "total": 25, "from": 1, "to": 10 }
}
```

---

## Database Schema

### `users` (Laravel default)

`id`, `name`, `email` (unique), `email_verified_at`, `password`, `remember_token`, `timestamps`.

### `tasks`

| Column | Type | Notes |
|---|---|---|
| `id` | bigint unsigned | primary key |
| `user_id` | bigint unsigned | foreign key → `users.id`, `ON DELETE CASCADE` |
| `title` | varchar(255) | required |
| `description` | text | nullable |
| `due_date` | date | nullable |
| `priority` | enum | `Low`, `Medium`, `High` — default `Medium` |
| `status` | enum | `Not Started`, `In Progress`, `Completed` — default `Not Started` |
| `created_at` / `updated_at` | timestamp | nullable |
| `deleted_at` | timestamp | nullable — soft deletes |

Indexes: `user_id`, `status`, `priority`, `due_date` and a composite index on `(user_id, status, priority, due_date)`.

### `personal_access_tokens` (Sanctum)

`id`, `tokenable_type`, `tokenable_id`, `name`, `token` (unique), `abilities`, `last_used_at`, `expires_at`, `timestamps`.

---

## Security Notes

- **Passwords** are hashed with bcrypt (`'password' => 'hashed'` cast on the `User` model).
- **Tokens** are Sanctum personal access tokens; the plain-text value is only ever shown once at login/registration and is stored in `localStorage` on the client.
- **Ownership** is enforced by `App\Policies\TaskPolicy` on every single-task endpoint, and list queries are filtered by `user_id` in SQL — not in PHP.
- **Mass assignment** is prevented: `user_id` is not fillable, so a client cannot create a task on behalf of somebody else.
- **Enums** are validated with `Rule::in()` on both the request rules and the database columns.
- **Account enumeration** is avoided: `POST /api/auth/forgot-password` always returns the same success message.
- **CORS** is restricted to the local development origins through `CORS_ALLOWED_ORIGINS`.

---

## Troubleshooting

**`SQLSTATE[HY000] [1045] Access denied for user 'root'`**
MySQL is not running or the credentials in `.env` are wrong. Start MySQL from the XAMPP Control Panel and confirm `DB_USERNAME=root` / `DB_PASSWORD=` (empty).

**`Base table or view already exists: 1050 Table 'tasks' already exists'`**
The database already contains the table but the migration is not recorded. Reset it:

```powershell
cd backend
php artisan migrate:fresh --force
```

**`MissingAppKeyException`**
The application key is missing. Run:

```powershell
cd backend
php artisan key:generate
```

**`Route [login] not defined`**
You are running an outdated copy of `backend/routes/web.php`. The named `login` route is required by Laravel's auth middleware.

**The page loads but the styles/scripts 404**
You are running `npm run dev` while `backend/public/hot` still points at the dev server, or vice versa. Build the assets and remove the hot file:

```powershell
cd frontend
npm run build
Remove-Item ..\backend\public\hot -Force -ErrorAction SilentlyContinue
```

**Password reset e-mail not received**
`MAIL_MAILER=log` means the message is never actually sent — read it from `backend/storage/logs/laravel.log`.

**Vite says `Port 5173 is already in use`**
Another dev server is running. Stop it, or change `server.port` in `frontend/vite.config.js`.

**`npm` / `php` is not recognised**
Neither is on your `PATH`. Add the XAMPP `php` folder (`C:\xampp\php`) and the Node.js folder to your system `PATH` and reopen PowerShell.
