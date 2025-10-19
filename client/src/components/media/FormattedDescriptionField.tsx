import React, { useState, useRef, useEffect } from 'react';
import { Bold, Italic } from 'lucide-react';

interface FormattedDescriptionFieldProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  onFocus?: () => void;
  onBlur?: () => void;
  autoFocus?: boolean;
}

const FormattedDescriptionField: React.FC<FormattedDescriptionFieldProps> = ({
  value,
  onChange,
  placeholder = "Add a description...",
  className = "",
  onFocus: onFocusProp,
  onBlur: onBlurProp,
  autoFocus = false
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const contentEditableRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (contentEditableRef.current && isEditing) {
      contentEditableRef.current.innerHTML = value || '';
    }
  }, [value, isEditing]);

  // Auto-focus if requested
  useEffect(() => {
    if (autoFocus && contentEditableRef.current) {
      setTimeout(() => {
        contentEditableRef.current?.focus();
      }, 100);
    }
  }, [autoFocus]);

  const handleFocus = () => {
    setIsEditing(true);
    onFocusProp?.();
  };

  const handleBlur = () => {
    setIsEditing(false);
    if (contentEditableRef.current) {
      const newValue = contentEditableRef.current.innerHTML;
      if (newValue !== value) {
        onChange(newValue);
      }
    }
    onBlurProp?.();
  };

  const handleInput = () => {
    if (contentEditableRef.current) {
      const newValue = contentEditableRef.current.innerHTML;
      onChange(newValue);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    // Handle keyboard shortcuts
    if (e.ctrlKey || e.metaKey) {
      switch (e.key) {
        case 'b':
          e.preventDefault();
          if (typeof document.execCommand === 'function') {
            document.execCommand('bold');
            handleInput(); // Update the value immediately
          }
          break;
        case 'i':
          e.preventDefault();
          if (typeof document.execCommand === 'function') {
            document.execCommand('italic');
            handleInput(); // Update the value immediately
          }
          break;
        case 'k':
          e.preventDefault();
          const url = prompt('Enter URL:', 'https://');
          if (url && url.trim() && typeof document.execCommand === 'function') {
            document.execCommand('createLink', false, url.trim());
            handleInput(); // Update the value immediately
          }
          break;
      }
    }

    // Handle Escape key to blur the field
    if (e.key === 'Escape') {
      e.preventDefault();
      if (contentEditableRef.current) {
        contentEditableRef.current.blur();
      }
    }
  };

  const toggleBold = () => {
    if (typeof document.execCommand === 'function') {
      document.execCommand('bold');
    }
    contentEditableRef.current?.focus();
  };

  const toggleItalic = () => {
    if (typeof document.execCommand === 'function') {
      document.execCommand('italic');
    }
    contentEditableRef.current?.focus();
  };

  const displayValue = value || '';
  const showPlaceholder = !displayValue && !isEditing;

  return (
    <div className={`formatted-description-field ${className}`}>
      {isEditing && (
        <div className="formatting-toolbar flex gap-1 mb-2 p-2 bg-gray-50 rounded-t-lg border border-b-0 border-gray-200">
          <button
            type="button"
            onClick={toggleBold}
            className="p-1 rounded hover:bg-gray-200 transition-colors"
            title="Bold (Ctrl+B)"
          >
            <Bold className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={toggleItalic}
            className="p-1 rounded hover:bg-gray-200 transition-colors"
            title="Italic (Ctrl+I)"
          >
            <Italic className="w-4 h-4" />
          </button>
        </div>
      )}
      
      {showPlaceholder ? (
        <div
          ref={contentEditableRef}
          contentEditable
          onFocus={handleFocus}
          onBlur={handleBlur}
          onInput={handleInput}
          onKeyDown={handleKeyDown}
          className={`
            w-full p-3 border border-gray-200 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent
            ${isEditing ? 'rounded-t-none' : ''}
            text-gray-400
          `}
          style={{ minHeight: '60px' }}
          role="textbox"
          aria-multiline="true"
          suppressContentEditableWarning={true}
        >
          {placeholder}
        </div>
      ) : (
        <div
          ref={contentEditableRef}
          contentEditable
          onFocus={handleFocus}
          onBlur={handleBlur}
          onInput={handleInput}
          onKeyDown={handleKeyDown}
          className={`
            w-full p-3 border border-gray-200 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent
            ${isEditing ? 'rounded-t-none' : ''}
            text-gray-700
          `}
          style={{ minHeight: '60px' }}
          role="textbox"
          aria-multiline="true"
          suppressContentEditableWarning={true}
          dangerouslySetInnerHTML={{ __html: displayValue }}
        />
      )}
    </div>
  );
};

export default FormattedDescriptionField;