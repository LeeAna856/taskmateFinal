<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\StoreTaskRequest;
use App\Http\Requests\UpdateTaskRequest;
use App\Models\Task;
use App\Models\TaskNotification;
use App\Models\User;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class TaskController extends Controller
{
    /**
     * Allowed sort columns => database columns.
     */
    private const SORTABLE = [
        'title' => 'title',
        'created_at' => 'created_at',
        'due_date' => 'due_date',
        'priority' => 'priority',
        'status' => 'status',
    ];

    /**
     * Return a filtered, searched, sorted and paginated list of the user's tasks.
     */
    public function index(Request $request): JsonResponse
    {
        $tasks = $this->baseQuery($request)
            ->with(['user:id,name,email,profile_photo', 'assignees:id,name,email,profile_photo'])
            ->paginate($this->perPage($request))
            ->withQueryString();

        return response()->json([
            'data' => $tasks->items(),
            'meta' => [
                'current_page' => $tasks->currentPage(),
                'last_page' => $tasks->lastPage(),
                'per_page' => $tasks->perPage(),
                'total' => $tasks->total(),
                'from' => $tasks->firstItem(),
                'to' => $tasks->lastItem(),
            ],
        ]);
    }

    /**
     * Store a newly created task and notify assigned members.
     */
    public function store(StoreTaskRequest $request): JsonResponse
    {
        $validated = $request->validated();
        $assigneeIds = $validated['assignees'] ?? [];
        unset($validated['assignees']);

        $task = $request->user()->tasks()->create($validated);
        $this->syncAssignees($task, $assigneeIds, $request->user());

        return response()->json([
            'message' => 'Task created successfully.',
            'task' => $this->loadTask($task),
        ], 201);
    }

    /**
     * Display a single task with its team, comments and metadata.
     */
    public function show(Task $task): JsonResponse
    {
        $this->authorize('view', $task);

        return response()->json([
            'task' => $this->loadTask($task, true),
        ]);
    }

    /**
     * Update an existing task.
     */
    public function update(UpdateTaskRequest $request, Task $task): JsonResponse
    {
        $validated = $request->validated();
        $assigneeIds = $validated['assignees'] ?? null;
        unset($validated['assignees']);

        $task->update($validated);

        if ($assigneeIds !== null) {
            $this->syncAssignees($task, $assigneeIds, $request->user());
        }

        return response()->json([
            'message' => 'Task updated successfully.',
            'task' => $this->loadTask($task->fresh()),
        ]);
    }

    /**
     * Soft delete a task (move it to the trash).
     */
    public function destroy(Task $task): JsonResponse
    {
        $this->authorize('delete', $task);

        $task->delete();

        return response()->json([
            'message' => 'Task moved to trash.',
        ]);
    }

    /**
     * Toggle a task between Completed and In Progress.
     */
    public function toggle(Request $request, Task $task): JsonResponse
    {
        $this->authorize('update', $task);

        $task->status = $task->status === 'Completed' ? 'In Progress' : 'Completed';
        $task->save();

        return response()->json([
            'message' => $task->status === 'Completed'
                ? 'Task marked as completed.'
                : 'Task reopened.',
            'task' => $this->loadTask($task->fresh()),
        ]);
    }

    /**
     * Update only the status of a task (used by the Kanban board).
     */
    public function updateStatus(Request $request, Task $task): JsonResponse
    {
        $this->authorize('update', $task);

        $validated = $request->validate([
            'status' => ['required', 'in:'.implode(',', Task::STATUSES)],
        ], [
            'status.required' => 'The status is required.',
            'status.in' => 'The selected status is invalid.',
        ]);

        $task->update(['status' => $validated['status']]);

        return response()->json([
            'message' => 'Task moved to '.$validated['status'].'.',
            'task' => $this->loadTask($task->fresh()),
        ]);
    }

    /**
     * Replace the assigned members and notify people who were newly added.
     */
    private function syncAssignees(Task $task, array $assigneeIds, User $actor): void
    {
        $assigneeIds = collect($assigneeIds)
            ->filter(fn ($id) => is_numeric($id))
            ->map(fn ($id) => (int) $id)
            ->unique()
            ->values();

        // Only allow real user IDs.
        $validIds = User::whereIn('id', $assigneeIds)->pluck('id');
        $previous = $task->assignees()->pluck('users.id');

        $task->assignees()->sync($validIds);

        $newIds = $validIds->diff($previous);

        foreach (User::whereIn('id', $newIds)->get() as $member) {
            if ($member->id === $actor->id) {
                continue;
            }

            TaskNotification::send(
                $member,
                'assigned',
                $actor->name.' assigned you a task',
                $actor->name.' assigned you "'.$task->title.'".',
                $task
            );
        }
    }

    private function loadTask(Task $task, bool $withComments = false): Task
    {
        $relations = ['user:id,name,email,profile_photo', 'assignees:id,name,email,profile_photo'];

        if ($withComments) {
            $relations['comments'] = fn ($query) => $query->with('user:id,name,email,profile_photo');
        }

        return $task->load($relations);
    }

    /**
     * Build the base query scoped to the authenticated user with all filters applied.
     */
    private function baseQuery(Request $request): Builder
    {
        $query = Task::query()->where('user_id', $request->user()->id);

        // Full text search across title + description.
        if ($search = trim((string) $request->input('search', ''))) {
            $query->where(function (Builder $q) use ($search) {
                $q->where('title', 'like', '%'.$search.'%')
                    ->orWhere('description', 'like', '%'.$search.'%');
            });
        }

        // Status filter.
        if ($status = $request->input('status')) {
            if ($status !== 'all') {
                $query->where('status', $status);
            }
        }

        // Priority filter.
        if ($priority = $request->input('priority')) {
            if ($priority !== 'all') {
                $query->where('priority', $priority);
            }
        }

        // Due date filter.
        switch ($request->input('due')) {
            case 'today':
                $query->whereDate('due_date', today());
                break;
            case 'upcoming':
                $query->whereDate('due_date', '>=', today());
                break;
            case 'week':
                $query->whereBetween('due_date', [today(), today()->addWeek()]);
                break;
            case 'overdue':
                $query->overdue();
                break;
            case 'no_due_date':
                $query->whereNull('due_date');
                break;
        }

        // Sorting.
        $sort = $request->input('sort', 'created_at');
        $direction = strtolower((string) $request->input('direction', 'desc')) === 'asc' ? 'asc' : 'desc';

        if ($sort === 'priority') {
            // Custom ordering so High > Medium > Low.
            $query->orderByRaw("CASE priority WHEN 'High' THEN 3 WHEN 'Medium' THEN 2 ELSE 1 END ".$direction);
        } elseif ($sort === 'status') {
            // Custom ordering so Not Started -> In Progress -> Completed.
            $query->orderByRaw("CASE status WHEN 'Completed' THEN 3 WHEN 'In Progress' THEN 2 ELSE 1 END ".$direction);
        } elseif (isset(self::SORTABLE[$sort])) {
            $query->orderBy(self::SORTABLE[$sort], $direction);
        } else {
            $query->orderBy('created_at', 'desc');
        }

        // Secondary sort keeps pagination stable.
        $query->orderBy('id', 'desc');

        return $query;
    }

    /**
     * Resolve the requested page size (capped). The board and calendar views
     * request a larger page so every task can be rendered.
     */
    private function perPage(Request $request): int
    {
        $perPage = (int) $request->input('per_page', 10);

        if ($perPage < 1) {
            $perPage = 10;
        }

        return min($perPage, 200);
    }
}
