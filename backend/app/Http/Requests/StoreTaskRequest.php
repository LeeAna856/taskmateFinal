<?php

namespace App\Http\Requests;

use App\Models\Task;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreTaskRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user() !== null;
    }

    public function rules(): array
    {
        return [
            'title' => ['required', 'string', 'max:255'],
            'description' => ['nullable', 'string', 'max:5000'],
            'due_date' => ['nullable', 'date'],
            'priority' => ['required', Rule::in(Task::PRIORITIES)],
            'status' => ['required', Rule::in(Task::STATUSES)],
            'assignees' => ['sometimes', 'array'],
            'assignees.*' => ['integer', 'exists:users,id'],
        ];
    }

    public function messages(): array
    {
        return [
            'title.required' => 'The task title is required.',
            'title.max' => 'The task title may not be greater than 255 characters.',
            'due_date.date' => 'The due date must be a valid date.',
            'priority.in' => 'The selected priority is invalid.',
            'status.in' => 'The selected status is invalid.',
            'assignees.array' => 'The assigned members must be a list.',
            'assignees.*.exists' => 'One of the selected team members could not be found.',
        ];
    }

    protected function prepareForValidation(): void
    {
        if ($this->filled('due_date') && trim((string) $this->input('due_date')) === '') {
            $this->merge(['due_date' => null]);
        }
    }
}
