<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class TaskNotification extends Model
{
    public const TYPES = ['reminder', 'assigned', 'comment', 'system'];

    protected $table = 'task_notifications';

    protected $fillable = [
        'user_id',
        'task_id',
        'type',
        'title',
        'message',
        'data',
        'read_at',
    ];

    protected $casts = [
        'data' => 'array',
        'read_at' => 'datetime',
    ];

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function task(): BelongsTo
    {
        return $this->belongsTo(Task::class);
    }

    public function scopeUnread($query)
    {
        return $query->whereNull('read_at');
    }

    /**
     * Create a notification for a user.
     */
    public static function send(
        User $user,
        string $type,
        string $title,
        string $message,
        ?Task $task = null,
        array $data = []
    ): self {
        return self::create([
            'user_id' => $user->id,
            'task_id' => $task?->id,
            'type' => in_array($type, self::TYPES, true) ? $type : 'system',
            'title' => $title,
            'message' => $message,
            'data' => $data ?: null,
        ]);
    }
}
