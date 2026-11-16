<?php

namespace Tests\Feature;

use App\Models\Task;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class AuthorizationTest extends TestCase
{
    use RefreshDatabase;

    private function taskOwnedBy(User $user, array $attributes = []): Task
    {
        return Task::factory()->forUser($user)->create($attributes);
    }

    public function test_a_user_cannot_view_another_users_task(): void
    {
        $owner = User::factory()->create();
        $intruder = User::factory()->create();
        $task = $this->taskOwnedBy($owner);

        $this->actingAs($intruder, 'sanctum')
            ->getJson('/api/tasks/'.$task->id)
            ->assertForbidden();
    }

    public function test_a_user_cannot_update_another_users_task(): void
    {
        $owner = User::factory()->create();
        $intruder = User::factory()->create();
        $task = $this->taskOwnedBy($owner, ['title' => 'Owner title']);

        $this->actingAs($intruder, 'sanctum')
            ->putJson('/api/tasks/'.$task->id, [
                'title' => 'Hijacked',
                'priority' => 'High',
                'status' => 'Completed',
            ])
            ->assertForbidden();

        $this->assertSame('Owner title', $task->fresh()->title);
    }

    public function test_a_user_cannot_delete_another_users_task(): void
    {
        $owner = User::factory()->create();
        $intruder = User::factory()->create();
        $task = $this->taskOwnedBy($owner);

        $this->actingAs($intruder, 'sanctum')
            ->deleteJson('/api/tasks/'.$task->id)
            ->assertForbidden();

        $this->assertNotSoftDeleted('tasks', ['id' => $task->id]);
    }

    public function test_a_user_cannot_toggle_another_users_task(): void
    {
        $owner = User::factory()->create();
        $intruder = User::factory()->create();
        $task = $this->taskOwnedBy($owner, ['status' => 'In Progress']);

        $this->actingAs($intruder, 'sanctum')
            ->patchJson('/api/tasks/'.$task->id.'/toggle')
            ->assertForbidden();

        $this->assertSame('In Progress', $task->fresh()->status);
    }

    public function test_a_user_cannot_change_another_users_task_status(): void
    {
        $owner = User::factory()->create();
        $intruder = User::factory()->create();
        $task = $this->taskOwnedBy($owner, ['status' => 'Not Started']);

        $this->actingAs($intruder, 'sanctum')
            ->patchJson('/api/tasks/'.$task->id.'/status', ['status' => 'Completed'])
            ->assertForbidden();

        $this->assertSame('Not Started', $task->fresh()->status);
    }

    public function test_a_user_cannot_restore_another_users_trashed_task(): void
    {
        $owner = User::factory()->create();
        $intruder = User::factory()->create();
        $task = $this->taskOwnedBy($owner);
        $task->delete();

        $this->actingAs($intruder, 'sanctum')
            ->patchJson('/api/trash/'.$task->id.'/restore')
            ->assertForbidden();

        $this->assertSoftDeleted('tasks', ['id' => $task->id]);
    }

    public function test_a_user_cannot_permanently_delete_another_users_trashed_task(): void
    {
        $owner = User::factory()->create();
        $intruder = User::factory()->create();
        $task = $this->taskOwnedBy($owner);
        $task->delete();

        $this->actingAs($intruder, 'sanctum')
            ->deleteJson('/api/trash/'.$task->id)
            ->assertForbidden();

        $this->assertSoftDeleted('tasks', ['id' => $task->id]);
    }

    public function test_dashboard_counts_only_include_the_authenticated_users_tasks(): void
    {
        $user = User::factory()->create();
        $other = User::factory()->create();

        Task::factory()->count(3)->forUser($user)->create(['status' => 'In Progress']);
        Task::factory()->count(2)->forUser($user)->create(['status' => 'Completed']);
        Task::factory()->count(7)->forUser($other)->create(['status' => 'Not Started']);

        $response = $this->actingAs($user, 'sanctum')->getJson('/api/dashboard')->assertOk();

        $this->assertSame(5, $response->json('stats.all'));
        $this->assertSame(3, $response->json('stats.in_progress'));
        $this->assertSame(2, $response->json('stats.completed'));
        $this->assertSame(0, $response->json('stats.trashed'));
    }

    public function test_guests_cannot_access_protected_api_endpoints(): void
    {
        $this->getJson('/api/dashboard')->assertUnauthorized();
        $this->getJson('/api/tasks')->assertUnauthorized();
        $this->getJson('/api/tasks/1')->assertUnauthorized();
        $this->postJson('/api/tasks', ['title' => 'Nope'])->assertUnauthorized();
        $this->putJson('/api/tasks/1', ['title' => 'Nope'])->assertUnauthorized();
        $this->patchJson('/api/tasks/1/toggle')->assertUnauthorized();
        $this->patchJson('/api/tasks/1/status', ['status' => 'Completed'])->assertUnauthorized();
        $this->deleteJson('/api/tasks/1')->assertUnauthorized();
    }
}
