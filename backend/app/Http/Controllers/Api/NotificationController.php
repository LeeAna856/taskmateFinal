<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\TaskNotification;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class NotificationController extends Controller
{
    /**
     * Latest notifications for the authenticated user, newest first.
     */
    public function index(Request $request): JsonResponse
    {
        $perPage = min(max((int) $request->input('per_page', 20), 1), 50);

        $notifications = TaskNotification::where('user_id', $request->user()->id)
            ->when($request->boolean('unread'), fn ($query) => $query->unread())
            ->with('task:id,title,status')
            ->orderByDesc('created_at')
            ->paginate($perPage);

        return response()->json([
            'data' => collect($notifications->items())->map(fn (TaskNotification $n) => $this->payload($n)),
            'meta' => [
                'current_page' => $notifications->currentPage(),
                'last_page' => $notifications->lastPage(),
                'per_page' => $notifications->perPage(),
                'total' => $notifications->total(),
            ],
            'unread_count' => TaskNotification::where('user_id', $request->user()->id)->unread()->count(),
        ]);
    }

    public function unreadCount(Request $request): JsonResponse
    {
        return response()->json([
            'unread_count' => TaskNotification::where('user_id', $request->user()->id)->unread()->count(),
        ]);
    }

    public function markRead(Request $request, TaskNotification $notification): JsonResponse
    {
        $this->ensureOwner($request, $notification);

        if (! $notification->read_at) {
            $notification->forceFill(['read_at' => now()])->save();
        }

        return response()->json([
            'message' => 'Notification marked as read.',
            'notification' => $this->payload($notification->fresh()),
            'unread_count' => TaskNotification::where('user_id', $request->user()->id)->unread()->count(),
        ]);
    }

    public function markAllRead(Request $request): JsonResponse
    {
        $count = TaskNotification::where('user_id', $request->user()->id)
            ->unread()
            ->update(['read_at' => now()]);

        return response()->json([
            'message' => $count === 0
                ? 'You have no unread notifications.'
                : $count.' notification(s) marked as read.',
            'unread_count' => 0,
        ]);
    }

    public function destroy(Request $request, TaskNotification $notification): JsonResponse
    {
        $this->ensureOwner($request, $notification);
        $notification->delete();

        return response()->json(['message' => 'Notification removed.']);
    }

    /**
     * Convert a notification into the shape used by the UI.
     */
    private function payload(TaskNotification $notification): array
    {
        return [
            'id' => $notification->id,
            'type' => $notification->type,
            'title' => $notification->title,
            'message' => $notification->message,
            'task_id' => $notification->task_id,
            'task' => $notification->task ? [
                'id' => $notification->task->id,
                'title' => $notification->task->title,
                'status' => $notification->task->status,
            ] : null,
            'read_at' => optional($notification->read_at)->toIso8601String(),
            'is_read' => $notification->read_at !== null,
            'created_at' => optional($notification->created_at)->toIso8601String(),
            'time_ago' => optional($notification->created_at)->diffForHumans(),
        ];
    }

    private function ensureOwner(Request $request, TaskNotification $notification): void
    {
        abort_unless($notification->user_id === $request->user()->id, 403, 'This notification does not belong to you.');
    }
}
