import React, { useState, useRef, useEffect } from 'react';
import './SearchableDropdown.css';

export interface DropdownOption {
  id: number;
  label: string;
  description?: string;
  searchText?: string; // Additional text to search through
}

interface SearchableDropdownProps {
  options: DropdownOption[];
  value: number | null;
  onChange: (value: number | null) => void;
  placeholder?: string;
  label?: string;
  error?: string;
  disabled?: boolean;
  required?: boolean;
  className?: string;
}

const SearchableDropdown: React.FC<SearchableDropdownProps> = ({
  options,
  value,
  onChange,
  placeholder = "Search and select...",
  label,
  error,
  disabled = false,
  required = false,
  className = ''
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filteredOptions, setFilteredOptions] = useState(options);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  
  const dropdownRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Get selected option for display
  const selectedOption = options.find(opt => opt.id === value);

  // Filter options based on search term
  useEffect(() => {
    if (!searchTerm.trim()) {
      setFilteredOptions(options);
    } else {
      const filtered = options.filter(option => {
        const searchText = `${option.label} ${option.description || ''} ${option.searchText || ''}`.toLowerCase();
        return searchText.includes(searchTerm.toLowerCase());
      });
      setFilteredOptions(filtered);
    }
    setHighlightedIndex(-1);
  }, [searchTerm, options]);

  // Handle click outside to close dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setSearchTerm('');
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Handle keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen) {
      if (e.key === 'Enter' || e.key === 'ArrowDown') {
        e.preventDefault();
        setIsOpen(true);
      }
      return;
    }

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setHighlightedIndex(prev => 
          prev < filteredOptions.length - 1 ? prev + 1 : 0
        );
        break;
      case 'ArrowUp':
        e.preventDefault();
        setHighlightedIndex(prev => 
          prev > 0 ? prev - 1 : filteredOptions.length - 1
        );
        break;
      case 'Enter':
        e.preventDefault();
        if (highlightedIndex >= 0 && highlightedIndex < filteredOptions.length) {
          handleSelect(filteredOptions[highlightedIndex]);
        }
        break;
      case 'Escape':
        setIsOpen(false);
        setSearchTerm('');
        inputRef.current?.blur();
        break;
    }
  };

  const handleSelect = (option: DropdownOption) => {
    onChange(option.id);
    setIsOpen(false);
    setSearchTerm('');
    inputRef.current?.blur();
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange(null);
    setSearchTerm('');
    inputRef.current?.focus();
  };

  const handleInputClick = () => {
    if (!disabled) {
      setIsOpen(true);
      if (selectedOption) {
        setSearchTerm('');
      }
    }
  };

  const displayValue = isOpen ? searchTerm : (selectedOption?.label || '');

  return (
    <div className={`searchable-dropdown ${className} ${error ? 'error' : ''}`} ref={dropdownRef}>
      {label && (
        <label className="dropdown-label">
          {label}
          {required && <span className="required">*</span>}
        </label>
      )}
      
      <div className="dropdown-container">
        <div className={`dropdown-input-wrapper ${isOpen ? 'open' : ''} ${disabled ? 'disabled' : ''}`}>
          <input
            ref={inputRef}
            type="text"
            value={displayValue}
            onChange={(e) => setSearchTerm(e.target.value)}
            onClick={handleInputClick}
            onKeyDown={handleKeyDown}
            placeholder={selectedOption ? selectedOption.label : placeholder}
            disabled={disabled}
            className="dropdown-input"
            autoComplete="off"
          />
          
          <div className="dropdown-icons">
            {selectedOption && !disabled && (
              <button
                type="button"
                className="clear-button"
                onClick={handleClear}
                tabIndex={-1}
              >
                ×
              </button>
            )}
            <div className={`dropdown-arrow ${isOpen ? 'open' : ''}`}>
              ▼
            </div>
          </div>
        </div>

        {isOpen && (
          <div className="dropdown-menu">
            {filteredOptions.length === 0 ? (
              <div className="dropdown-item no-results">
                No results found
              </div>
            ) : (
              filteredOptions.map((option, index) => (
                <div
                  key={option.id}
                  className={`dropdown-item ${index === highlightedIndex ? 'highlighted' : ''} ${
                    option.id === value ? 'selected' : ''
                  }`}
                  onClick={() => handleSelect(option)}
                  onMouseEnter={() => setHighlightedIndex(index)}
                >
                  <div className="option-label">{option.label}</div>
                  {option.description && (
                    <div className="option-description">{option.description}</div>
                  )}
                </div>
              ))
            )}
          </div>
        )}
      </div>

      {error && <div className="dropdown-error">{error}</div>}
    </div>
  );
};

export default SearchableDropdown;