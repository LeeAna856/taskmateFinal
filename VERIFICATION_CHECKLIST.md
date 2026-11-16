# TaskMate — Feature Verification Checklist

Walk through this list after `npm run build` and `php artisan serve` (or with the Vite dev server running).

---

## 1. Authentication

| # | Check | Expected result | ☐ |
|---|---|---|---|
| 1.1 | Open `/register` | Sign-up card renders with name, e-mail, password, confirm password | ☐ |
| 1.2 | Register with a mismatched password confirmation | Inline error, no account created | ☐ |
| 1.3 | Register with a password shorter than 8 characters | Inline error, no account created | ☐ |
| 1.4 | Register with an e-mail that already exists | Inline error, no duplicate row in MySQL | ☐ |
| 1.5 | Register with valid details | Redirect to the dashboard, toast confirmation | ☐ |
| 1.6 | Open `/dashboard` while signed out | Redirected to `/login` | ☐ |
| 1.7 | Log in with a wrong password | Inline error, no token issued | ☐ |
| 1.8 | Log in with an unknown e-mail | Inline error | ☐ |
| 1.9 | Log in with valid credentials | Redirect to the dashboard, sidebar shows the user name | ☐ |
| 1.10 | Log out from the sidebar menu | Token revoked, redirected to `/login` | ☐ |
| 1.11 | Call `GET /api/tasks` with no token | `401` with a JSON body | ☐ |
| 1.12 | Reload the page after logging in | Session restored from the stored token (no re-login) | ☐ |

## 2. Forgot / reset password

| # | Check | Expected result | ☐ |
|---|---|---|---|
| 2.1 | Open `/forgot-password` | E-mail field renders | ☐ |
| 2.2 | Submit an unknown e-mail | Generic success message (no account disclosure) | ☐ |
| 2.3 | Submit a registered e-mail | Success message; link written to `backend/storage/logs/laravel.log` | ☐ |
| 2.4 | Open the link from the log | Reset form renders with the token pre-filled | ☐ |
| 2.5 | Submit a mismatched confirmation | Inline error | ☐ |
| 2.6 | Submit a valid new password | Password changed, redirected to the login screen | ☐ |
| 2.7 | Log in with the new password | Succeeds | ☐ |
| 2.8 | Re-use the same reset link | Rejected — the token is single use | ☐ |
| 2.9 | Submit a tampered token | Inline error, password unchanged | ☐ |

## 3. Task CRUD

| # | Check | Expected result | ☐ |
|---|---|---|---|
| 3.1 | Open `/tasks/new` | Form with title, description, due date, priority, status | ☐ |
| 3.2 | Save with an empty title | Inline validation error, nothing created | ☐ |
| 3.3 | Save a valid task | Toast, task appears in the table, counters increase | ☐ |
| 3.4 | Add a task with no due date | Saves with an empty due date | ☐ |
| 3.5 | Open `/tasks/{id}/edit` | Form is pre-filled with the task values | ☐ |
| 3.6 | Change the title and save | Row updates immediately, toast confirmation | ☐ |
| 3.7 | Try to save a title longer than 255 characters | Validation error | ☐ |
| 3.8 | Delete a task | Confirmation dialog, then the task leaves the active list | ☐ |
| 3.9 | Confirm the delete was soft | The row still exists in MySQL with a `deleted_at` value | ☐ |

## 4. Toggle and status

| # | Check | Expected result | ☐ |
|---|---|---|---|
| 4.1 | Tick a task's completion box | Status flips to *Completed*, row is restyled | ☐ |
| 4.2 | Untick it | Status returns to *In Progress* | ☐ |
| 4.3 | Change the status from the row dropdown | Status persists after a page reload | ☐ |
| 4.4 | Open `/tasks/in-progress` | Only *In Progress* tasks are listed | ☐ |
| 4.5 | Open `/tasks/completed` | Only *Completed* tasks are listed | ☐ |

## 5. Search, filter, sort, paginate

| # | Check | Expected result | ☐ |
|---|---|---|---|
| 5.1 | Type a word from a task title in the top-bar search | The list narrows down | ☐ |
| 5.2 | Search for a word that only appears in a description | The task is still found | ☐ |
| 5.3 | Clear the search | The full list returns | ☐ |
| 5.4 | Filter by status | Only matching tasks remain | ☐ |
| 5.5 | Filter by priority | Only matching tasks remain | ☐ |
| 5.6 | Filter by "Overdue" due date | Only past-due, unfinished tasks remain | ☐ |
| 5.7 | Filter by "No due date" | Only tasks without a due date remain | ☐ |
| 5.8 | Combine a search term with a filter | Both are applied | ☐ |
| 5.9 | Sort by title A → Z and Z → A | The order flips | ☐ |
| 5.10 | Sort by priority | High → Medium → Low (descending) | ☐ |
| 5.11 | Sort by due date | Earliest date first (ascending) | ☐ |
| 5.12 | Create more than 10 tasks | Pagination controls appear and the page size applies | ☐ |
| 5.13 | Navigate to page 2 | The next set of tasks loads and the page number updates | ☐ |

## 6. Dashboard

| # | Check | Expected result | ☐ |
|---|---|---|---|
| 6.1 | Open `/dashboard` | Five summary cards (all, in progress, completed, overdue, trashed) | ☐ |
| 6.2 | Compare the counters with the task list | The numbers match | ☐ |
| 6.3 | Complete a task and revisit the dashboard | The completed counter increased | ☐ |
| 6.4 | Upcoming tasks panel | Shows the next tasks ordered by due date | ☐ |
| 6.5 | Recent tasks panel | Shows the newest tasks first | ☐ |

## 7. Trash

| # | Check | Expected result | ☐ |
|---|---|---|---|
| 7.1 | Open `/trash` | Only soft-deleted tasks are listed | ☐ |
| 7.2 | Delete a task and check the trash | The task is there | ☐ |
| 7.3 | Restore a single task | Toast, the task returns to the active list, the trash counter drops | ☐ |
| 7.4 | Delete several tasks and use "Restore all" | All of them return to the active list | ☐ |
| 7.5 | Use "Empty trash" | A confirmation dialog appears, then the trash is empty | ☐ |
| 7.6 | After emptying the trash | The rows are gone from MySQL entirely (not soft deleted) | ☐ |
| 7.7 | Search inside the trash | Only matching trashed tasks remain | ☐ |

## 8. Security and ownership

| # | Check | Expected result | ☐ |
|---|---|---|---|
| 8.1 | Create a second account and try to open another user's task id in the URL | `403 Forbidden`, no data leaked | ☐ |
| 8.2 | Try to update or delete another user's task | `403 Forbidden`, the task is untouched | ☐ |
| 8.3 | Check the task list of user B | It contains only user B's tasks | ☐ |
| 8.4 | Inspect a `POST /api/tasks` request body containing `user_id` | The field is ignored; the task belongs to the sender | ☐ |
| 8.5 | Call `GET /api/dashboard` as user B | The counters only count user B's tasks | ☐ |

## 9. Interface and responsiveness

| # | Check | Expected result | ☐ |
|---|---|---|---|
| 9.1 | Resize the browser to ~375 px wide | The sidebar collapses into a toggle, the table becomes scrollable | ☐ |
| 9.2 | Toggle the mobile menu | The sidebar slides in and closes again after navigating | ☐ |
| 9.3 | Every button has a hover/active state | Consistent blue feedback throughout | ☐ |
| 9.4 | Priority and status badges | Distinct colours per value | ☐ |
| 9.5 | Overdue tasks | Visually flagged | ☐ |
| 9.6 | An unknown URL such as `/does-not-exist` | A "page not found" screen with a link back | ☐ |
| 9.7 | The browser console | No errors or warnings | ☐ |

## 10. Build and deployment

| # | Check | Expected result | ☐ |
|---|---|---|---|
| 10.1 | `cd frontend; npm run lint` | No errors (only the 3 fast-refresh warnings) | ☐ |
| 10.2 | `cd frontend; npm run build` | Assets written to `backend/public/build` | ☐ |
| 10.3 | `backend/public/build/manifest.json` | Contains the `src/main.jsx` and `src/styles/index.css` entries | ☐ |
| 10.4 | Remove `backend/public/hot` and reload the app | The compiled assets are served instead of the dev server | ☐ |
| 10.5 | `cd backend; php artisan test` | `72 passed` | ☐ |
| 10.6 | `php artisan migrate:status` | Every migration shows `Ran` | ☐ |
