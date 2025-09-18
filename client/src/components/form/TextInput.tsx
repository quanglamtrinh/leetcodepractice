import React from 'react';
import './TextInput.css';

interface TextInputProps {
  value: string;
  onChange: (value: string) => void;
  label?: string;
  placeholder?: string;
  error?: string;
  disabled?: boolean;
  required?: boolean;
  type?: 'text' | 'email' | 'password' | 'url';
  className?: string;
  maxLength?: number;
  minLength?: number;
  autoComplete?: string;
  id?: string;
}

const TextInput: React.FC<TextInputProps> = ({
  value,
  onChange,
  label,
  placeholder,
  error,
  disabled = false,
  required = false,
  type = 'text',
  className = '',
  maxLength,
  minLength,
  autoComplete,
  id
}) => {
  const inputId = id || `text-input-${Math.random().toString(36).substr(2, 9)}`;

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onChange(e.target.value);
  };

  return (
    <div className={`text-input ${className} ${error ? 'error' : ''}`}>
      {label && (
        <label htmlFor={inputId} className="input-label">
          {label}
          {required && <span className="required">*</span>}
        </label>
      )}
      
      <div className="input-container">
        <input
          id={inputId}
          type={type}
          value={value}
          onChange={handleChange}
          placeholder={placeholder}
          disabled={disabled}
          required={required}
          maxLength={maxLength}
          minLength={minLength}
          autoComplete={autoComplete}
          className={`input-field ${error ? 'error' : ''}`}
        />
        
        {maxLength && (
          <div className="character-count">
            {value.length}/{maxLength}
          </div>
        )}
      </div>

      {error && <div className="input-error">{error}</div>}
    </div>
  );
};

export default TextInput;