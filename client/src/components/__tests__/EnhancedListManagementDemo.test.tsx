import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import EnhancedListManagementDemo from '../EnhancedListManagementDemo';

describe('EnhancedListManagementDemo', () => {
  it('should render the demo component', () => {
    render(<EnhancedListManagementDemo />);
    
    expect(screen.getByText('Enhanced List Management Demo')).toBeInTheDocument();
    expect(screen.getByText('Load Demo Content')).toBeInTheDocument();
    expect(screen.getByText('Clear')).toBeInTheDocument();
  });

  it('should load demo content when Load Demo Content button is clicked', () => {
    render(<EnhancedListManagementDemo />);
    
    const loadButton = screen.getByText('Load Demo Content');
    fireEvent.click(loadButton);
    
    // Check that demo content is loaded
    expect(screen.getByDisplayValue('Enhanced List Management Demo')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Bullet lists with Tab/Shift+Tab indentation')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Numbered lists with proper numbering')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Todo items with checkboxes')).toBeInTheDocument();
  });

  it('should clear content when Clear button is clicked', () => {
    render(<EnhancedListManagementDemo />);
    
    // Load demo content first
    const loadButton = screen.getByText('Load Demo Content');
    fireEvent.click(loadButton);
    
    // Verify content is loaded
    expect(screen.getByDisplayValue('Enhanced List Management Demo')).toBeInTheDocument();
    
    // Clear content
    const clearButton = screen.getByText('Clear');
    fireEvent.click(clearButton);
    
    // Verify content is cleared
    expect(screen.queryByDisplayValue('Enhanced List Management Demo')).not.toBeInTheDocument();
  });

  it('should display key features and instructions', () => {
    render(<EnhancedListManagementDemo />);
    
    expect(screen.getByText('Key Features:')).toBeInTheDocument();
    expect(screen.getByText('Tab/Shift+Tab:')).toBeInTheDocument();
    expect(screen.getByText('Enter:')).toBeInTheDocument();
    expect(screen.getByText('Backspace:')).toBeInTheDocument();
    expect(screen.getByText('Slash Commands:')).toBeInTheDocument();
    expect(screen.getByText('Todo Lists:')).toBeInTheDocument();
    
    expect(screen.getByText('Instructions:')).toBeInTheDocument();
    expect(screen.getByText('Creating Lists:')).toBeInTheDocument();
    expect(screen.getByText('List Navigation:')).toBeInTheDocument();
  });
});