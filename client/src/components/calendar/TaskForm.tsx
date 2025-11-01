import React, { useState, useEffect } from 'react';
import { Task, Priority, TaskStatus } from '../../types/calendar';
import { formatDateToISO } from '../../utils/dateUtils';
import './TaskForm.css';

interface TaskFormProps {
  task?: Task;
  date: Date;
  onSubmit: (taskData: {
    title: string;
    description?: string;
    date: string;
    priority: Priority;
    status?: TaskStatus;
  }) => Promise<void>;
  onCancel: () => void;
  loading?: boolean;
}

const TaskForm: React.FC<TaskFormProps> = ({
  task,
  date,
  onSubmit,
  onCancel,
  loading = false
}) => {
  const [formData, setFormData] = useState({
    title: task?.title || '',
    description: task?.description || '',
    priority: (task?.priority || 'medium') as Priority,
    status: (task?.status || 'pending') as TaskStatus
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Reset form when task changes
  useEffect(() => {
    if (task) {
      setFormData({
        title: task.title,
        description: task.description || '',
        priority: task.priority,
        status: task.status
      });
    }
  }, [task]);

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.title.trim()) {
      newErrors.title = 'Task title is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    try {
      await onSubmit({
        title: formData.title.trim(),
        description: formData.description.trim() || undefined,
        date: formatDateToISO(date),
        priority: formData.priority,
        status: task ? formData.status : undefined // Only include status for updates
      });
    } catch (error) {
      console.error('Error submitting task:', error);
    }
  };

  const handleInputChange = (field: keyof typeof formData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  return (
    <form onSubmit={handleSubmit} className="task-form">
      <div className="form-group">
        <label htmlFor="task-title" className="form-label">
          Title *
        </label>
        <input
          id="task-title"
          type="text"
          value={formData.title}
          onChange={(e) => handleInputChange('title', e.target.value)}
          className={`form-input ${errors.title ? 'error' : ''}`}
          placeholder="Enter task title..."
          disabled={loading}
          autoFocus
        />
        {errors.title && <span className="form-error">{errors.title}</span>}
      </div>

      <div className="form-group">
        <label htmlFor="task-description" className="form-label">
          Description
        </label>
        <textarea
          id="task-description"
          value={formData.description}
          onChange={(e) => handleInputChange('description', e.target.value)}
          className="form-textarea"
          placeholder="Enter task description..."
          rows={3}
          disabled={loading}
        />
      </div>

      <div className="form-group">
        <label htmlFor="task-priority" className="form-label">
          Priority
        </label>
        <select
          id="task-priority"
          value={formData.priority}
          onChange={(e) => handleInputChange('priority', e.target.value)}
          className="form-select"
          disabled={loading}
        >
          <option value="low">Low</option>
          <option value="medium">Medium</option>
          <option value="high">High</option>
        </select>
      </div>

      {task && (
        <div className="form-group">
          <label htmlFor="task-status" className="form-label">
            Status
          </label>
          <select
            id="task-status"
            value={formData.status}
            onChange={(e) => handleInputChange('status', e.target.value)}
            className="form-select"
            disabled={loading}
          >
            <option value="pending">Pending</option>
            <option value="completed">Completed</option>
            <option value="overdue">Overdue</option>
          </select>
        </div>
      )}

      <div className="form-actions">
        <button
          type="button"
          onClick={onCancel}
          className="form-button secondary"
          disabled={loading}
        >
          Cancel
        </button>
        <button
          type="submit"
          className="form-button primary"
          disabled={loading}
        >
          {loading ? 'Saving...' : task ? 'Update Task' : 'Create Task'}
        </button>
      </div>
    </form>
  );
};

export default TaskForm;