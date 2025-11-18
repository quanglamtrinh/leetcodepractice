import React, { useState, useEffect } from 'react';
import { Note } from '../../types/calendar';
import { formatDateToISO } from '../../utils/dateUtils';
import './TaskForm.css'; // Reuse the same styles

interface NoteFormProps {
  note?: Note;
  date: Date;
  onSubmit: (noteData: {
    title?: string;
    description: string;
    date: string;
  }) => Promise<void>;
  onCancel: () => void;
  loading?: boolean;
}

const NoteForm: React.FC<NoteFormProps> = ({
  note,
  date,
  onSubmit,
  onCancel,
  loading = false
}) => {
  const [formData, setFormData] = useState({
    title: note?.title || '',
    description: note?.description || ''
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Reset form when note changes
  useEffect(() => {
    if (note) {
      setFormData({
        title: note.title || '',
        description: note.description || ''
      });
    }
  }, [note]);

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.description.trim()) {
      newErrors.description = 'Note content is required';
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
        title: formData.title.trim() || undefined,
        description: formData.description.trim(),
        date: formatDateToISO(date)
      });
    } catch (error) {
      console.error('Error submitting note:', error);
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
        <label htmlFor="note-title" className="form-label">
          Title (Optional)
        </label>
        <input
          id="note-title"
          type="text"
          value={formData.title}
          onChange={(e) => handleInputChange('title', e.target.value)}
          className="form-input"
          placeholder="Enter note title..."
          disabled={loading}
          autoFocus
        />
      </div>

      <div className="form-group">
        <label htmlFor="note-description" className="form-label">
          Content *
        </label>
        <textarea
          id="note-description"
          value={formData.description}
          onChange={(e) => handleInputChange('description', e.target.value)}
          className={`form-textarea ${errors.description ? 'error' : ''}`}
          placeholder="Enter your note content..."
          rows={6}
          disabled={loading}
        />
        {errors.description && <span className="form-error">{errors.description}</span>}
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
          {loading ? 'Saving...' : note ? 'Update Note' : 'Create Note'}
        </button>
      </div>
    </form>
  );
};

export default NoteForm;