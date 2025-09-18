import React from 'react';
import './TextArea.css';

interface TextAreaProps {
  value: string;
  onChange: (value: string) => void;
  label?: string;
  placeholder?: string;
  error?: string;
  disabled?: boolean;
  required?: boolean;
  className?: string;
  rows?: number;
  maxLength?: number;
  minLength?: number;
  resize?: 'none' | 'vertical' | 'horizontal' | 'both';
  id?: string;
}

const TextArea: React.FC<TextAreaProps> = ({
  value,
  onChange,
  label,
  placeholder,
  error,
  disabled = false,
  required = false,
  className = '',
  rows = 3,
  maxLength,
  minLength,
  resize = 'vertical',
  id
}) => {
  const textareaId = id || `textarea-${Math.random().toString(36).substr(2, 9)}`;

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    onChange(e.target.value);
  };

  return (
    <div className={`text-area ${className} ${error ? 'error' : ''}`}>
      {label && (
        <label htmlFor={textareaId} className="textarea-label">
          {label}
          {required && <span className="required">*</span>}
        </label>
      )}
      
      <div className="textarea-container">
        <textarea
          id={textareaId}
          value={value}
          onChange={handleChange}
          placeholder={placeholder}
          disabled={disabled}
          required={required}
          rows={rows}
          maxLength={maxLength}
          minLength={minLength}
          className={`textarea-field ${error ? 'error' : ''}`}
          style={{ resize }}
        />
        
        {maxLength && (
          <div className="character-count">
            {value.length}/{maxLength}
          </div>
        )}
      </div>

      {error && <div className="textarea-error">{error}</div>}
    </div>
  );
};

export default TextArea;