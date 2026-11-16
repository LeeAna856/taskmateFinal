<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Task;
use App\Models\TaskComment;
use App\Models\TaskNotification;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class TaskCommentController extends Controller
{
    public function index(Task $task): JsonResponse
    {
        $this->authorize('view', $task);

        $comments = $task->comments()
            ->with('user:id,name,email,profile_photo')
            ->get()
            ->map(fn (TaskComment $comment) => $this->payload($comment));

        return response()->json(['data' => $comments]);
    }

    public function store(Request $request, Task $task): JsonResponse
    {
        $this->authorize('view', $task);

        $validated = $request->validate([
            'body' => ['required', 'string', 'max:2000'],
        ], [
            'body.required' => 'Write a comment before posting.',
            'body.max' => 'Comments may not be longer than 2000 characters.',
        ]);

        $comment = $task->comments()->create([
            'user_id' => $request->user()->id,
            'body' => $validated['body'],
        ]);

        $comment->load('user:id,name,email,profile_photo');

        // Notify the assignees (but never the author) about the new comment.
        $recipients = $task->assignees()->where('users.id', '!=', $request->user()->id)->get();
        foreach ($recipients as $recipient) {
            TaskNotification::send(
                $recipient,
                'comment',
                'New comment on '.$task->title,
                $request->user()->name.' commented: '.mb_strimwidth($validated['body'], 0, 100, '...'),
                $task
            );
        }

        return response()->json([
            'message' => 'Comment posted.',
            'comment' => $this->payload($comment),
        ], 201);
    }

    private function payload(TaskComment $comment): array
    {
        return [
            'id' => $comment->id,
            'body' => $comment->body,
            'created_at' => optional($comment->created_at)->toIso8601String(),
            'time_ago' => optional($comment->created_at)->diffForHumans(),
            'user' => [
                'id' => $comment->user->id,
                'name' => $comment->user->name,
                'initials' => $comment->user->initials,
                'profile_photo_url' => $comment->user->profile_photo_url,
            ],
        ];
    }
}
