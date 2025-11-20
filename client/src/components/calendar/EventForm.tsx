import React, { useState, useEffect } from 'react';
import { Event } from '../../types/calendar';
import { formatDateToISO } from '../../utils/dateUtils';
import './TaskForm.css'; // Reuse the same styles

interface EventFormProps {
  event?: Event;
  date: Date;
  onSubmit: (eventData: {
    title: string;
    description?: string;
    date: string;
    start_time?: string;
    end_time?: string;
  }) => Promise<void>;
  onCancel: () => void;
  loading?: boolean;
}

const EventForm: React.FC<EventFormProps> = ({
  event,
  date,
  onSubmit,
  onCancel,
  loading = false
}) => {
  const [formData, setFormData] = useState({
    title: event?.title || '',
    description: event?.description || '',
    start_time: event?.start_time || '',
    end_time: event?.end_time || ''
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Reset form when event changes
  useEffect(() => {
    if (event) {
      setFormData({
        title: event.title,
        description: event.description || '',
        start_time: event.start_time || '',
        end_time: event.end_time || ''
      });
    }
  }, [event]);

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.title.trim()) {
      newErrors.title = 'Event title is required';
    }

    if (formData.start_time && formData.end_time) {
      if (formData.start_time >= formData.end_time) {
        newErrors.end_time = 'End time must be after start time';
      }
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
      const eventData: any = {
        title: formData.title.trim(),
        date: formatDateToISO(date)
      };
      
      // Only include optional fields if they have values
      if (formData.description.trim()) {
        eventData.description = formData.description.trim();
      }
      
      if (formData.start_time) {
        eventData.start_time = formData.start_time;
      }
      
      if (formData.end_time) {
        eventData.end_time = formData.end_time;
      }
      
      await onSubmit(eventData);
    } catch (error) {
      console.error('Error submitting event:', error);
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
        <label htmlFor="event-title" className="form-label">
          Title *
        </label>
        <input
          id="event-title"
          type="text"
          value={formData.title}
          onChange={(e) => handleInputChange('title', e.target.value)}
          className={`form-input ${errors.title ? 'error' : ''}`}
          placeholder="Enter event title..."
          disabled={loading}
          autoFocus
        />
        {errors.title && <span className="form-error">{errors.title}</span>}
      </div>

      <div className="form-group">
        <label htmlFor="event-description" className="form-label">
          Description
        </label>
        <textarea
          id="event-description"
          value={formData.description}
          onChange={(e) => handleInputChange('description', e.target.value)}
          className="form-textarea"
          placeholder="Enter event description..."
          rows={3}
          disabled={loading}
        />
      </div>

      <div className="form-row">
        <div className="form-group">
          <label htmlFor="event-start-time" className="form-label">
            Start Time
          </label>
          <input
            id="event-start-time"
            type="time"
            value={formData.start_time}
            onChange={(e) => handleInputChange('start_time', e.target.value)}
            className="form-input"
            disabled={loading}
          />
        </div>

        <div className="form-group">
          <label htmlFor="event-end-time" className="form-label">
            End Time
          </label>
          <input
            id="event-end-time"
            type="time"
            value={formData.end_time}
            onChange={(e) => handleInputChange('end_time', e.target.value)}
            className={`form-input ${errors.end_time ? 'error' : ''}`}
            disabled={loading}
          />
          {errors.end_time && <span className="form-error">{errors.end_time}</span>}
        </div>
      </div>

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
          {loading ? 'Saving...' : event ? 'Update Event' : 'Create Event'}
        </button>
      </div>
    </form>
  );
};

export default EventForm;