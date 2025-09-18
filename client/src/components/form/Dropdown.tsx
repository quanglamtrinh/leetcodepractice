import React from 'react';
import './Dropdown.css';

export interface DropdownOption {
  id: number;
  label: string;
  description?: string;
}

interface DropdownProps {
  options: DropdownOption[];
  value: number | null;
  onChange: (value: number | null) => void;
  placeholder?: string;
  label?: string;
  error?: string;
  disabled?: boolean;
  required?: boolean;
  className?: string;
  showDescription?: boolean;
}

const Dropdown: React.FC<DropdownProps> = ({
  options,
  value,
  onChange,
  placeholder = "Select an option...",
  label,
  error,
  disabled = false,
  required = false,
  className = '',
  showDescription = true
}) => {
  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const selectedValue = e.target.value;
    onChange(selectedValue ? parseInt(selectedValue) : null);
  };

  return (
    <div className={`dropdown ${className} ${error ? 'error' : ''}`}>
      {label && (
        <label className="dropdown-label">
          {label}
          {required && <span className="required">*</span>}
        </label>
      )}
      
      <div className="dropdown-container">
        <select
          value={value || ''}
          onChange={handleChange}
          disabled={disabled}
          className={`dropdown-select ${error ? 'error' : ''}`}
          required={required}
        >
          <option value="">{placeholder}</option>
          {options.map(option => (
            <option key={option.id} value={option.id}>
              {option.label}
              {showDescription && option.description ? ` - ${option.description}` : ''}
            </option>
          ))}
        </select>
        
        <div className="dropdown-arrow">
          ▼
        </div>
      </div>

      {error && <div className="dropdown-error">{error}</div>}
    </div>
  );
};

export default Dropdown;