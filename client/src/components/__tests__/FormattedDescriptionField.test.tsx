import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import FormattedDescriptionField from '../media/FormattedDescriptionField';

// Mock document.execCommand
Object.defineProperty(document, 'execCommand', {
  value: jest.fn(() => true),
  writable: true
});

describe('FormattedDescriptionField', () => {
  const mockOnChange = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders with placeholder when value is empty', () => {
    render(
      <FormattedDescriptionField
        value=""
        onChange={mockOnChange}
        placeholder="Enter description..."
      />
    );

    expect(screen.getByText('Enter description...')).toBeInTheDocument();
  });

  it('renders with initial value', () => {
    render(
      <FormattedDescriptionField
        value="Initial content"
        onChange={mockOnChange}
      />
    );

    expect(screen.getByText('Initial content')).toBeInTheDocument();
  });

  it('shows formatting toolbar when focused', () => {
    render(
      <FormattedDescriptionField
        value="Test content"
        onChange={mockOnChange}
      />
    );

    const contentDiv = screen.getByText('Test content');
    fireEvent.focus(contentDiv);

    expect(screen.getByTitle('Bold (Ctrl+B)')).toBeInTheDocument();
    expect(screen.getByTitle('Italic (Ctrl+I)')).toBeInTheDocument();
  });

  it('calls onChange when content is modified', () => {
    render(
      <FormattedDescriptionField
        value="Initial content"
        onChange={mockOnChange}
      />
    );

    const contentDiv = screen.getByText('Initial content');
    fireEvent.input(contentDiv, { target: { innerHTML: 'Modified content' } });

    expect(mockOnChange).toHaveBeenCalledWith('Modified content');
  });

  it('calls onChange when content loses focus', () => {
    render(
      <FormattedDescriptionField
        value="Initial content"
        onChange={mockOnChange}
      />
    );

    const contentDiv = screen.getByText('Initial content');
    fireEvent.focus(contentDiv);
    
    // Simulate content change
    contentDiv.innerHTML = 'Changed content';
    fireEvent.blur(contentDiv);

    expect(mockOnChange).toHaveBeenCalledWith('Changed content');
  });

  it('executes bold command when Ctrl+B is pressed', () => {
    const execCommandSpy = jest.spyOn(document, 'execCommand');
    
    render(
      <FormattedDescriptionField
        value="Test content"
        onChange={mockOnChange}
      />
    );

    const contentDiv = screen.getByText('Test content');
    fireEvent.focus(contentDiv);
    fireEvent.keyDown(contentDiv, { key: 'b', ctrlKey: true });

    expect(execCommandSpy).toHaveBeenCalledWith('bold');
  });

  it('executes italic command when Ctrl+I is pressed', () => {
    const execCommandSpy = jest.spyOn(document, 'execCommand');
    
    render(
      <FormattedDescriptionField
        value="Test content"
        onChange={mockOnChange}
      />
    );

    const contentDiv = screen.getByText('Test content');
    fireEvent.focus(contentDiv);
    fireEvent.keyDown(contentDiv, { key: 'i', ctrlKey: true });

    expect(execCommandSpy).toHaveBeenCalledWith('italic');
  });

  it('executes bold command when bold button is clicked', () => {
    const execCommandSpy = jest.spyOn(document, 'execCommand');
    
    render(
      <FormattedDescriptionField
        value="Test content"
        onChange={mockOnChange}
      />
    );

    const contentDiv = screen.getByText('Test content');
    fireEvent.focus(contentDiv);
    
    const boldButton = screen.getByTitle('Bold (Ctrl+B)');
    fireEvent.click(boldButton);

    expect(execCommandSpy).toHaveBeenCalledWith('bold');
  });

  it('executes italic command when italic button is clicked', () => {
    const execCommandSpy = jest.spyOn(document, 'execCommand');
    
    render(
      <FormattedDescriptionField
        value="Test content"
        onChange={mockOnChange}
      />
    );

    const contentDiv = screen.getByText('Test content');
    fireEvent.focus(contentDiv);
    
    const italicButton = screen.getByTitle('Italic (Ctrl+I)');
    fireEvent.click(italicButton);

    expect(execCommandSpy).toHaveBeenCalledWith('italic');
  });

  it('applies custom className', () => {
    const { container } = render(
      <FormattedDescriptionField
        value="Test content"
        onChange={mockOnChange}
        className="custom-class"
      />
    );

    expect(container.querySelector('.custom-class')).toBeInTheDocument();
  });

  it('handles Cmd+B on Mac', () => {
    const execCommandSpy = jest.spyOn(document, 'execCommand');
    
    render(
      <FormattedDescriptionField
        value="Test content"
        onChange={mockOnChange}
      />
    );

    const contentDiv = screen.getByText('Test content');
    fireEvent.focus(contentDiv);
    fireEvent.keyDown(contentDiv, { key: 'b', metaKey: true });

    expect(execCommandSpy).toHaveBeenCalledWith('bold');
  });

  it('handles Cmd+I on Mac', () => {
    const execCommandSpy = jest.spyOn(document, 'execCommand');
    
    render(
      <FormattedDescriptionField
        value="Test content"
        onChange={mockOnChange}
      />
    );

    const contentDiv = screen.getByText('Test content');
    fireEvent.focus(contentDiv);
    fireEvent.keyDown(contentDiv, { key: 'i', metaKey: true });

    expect(execCommandSpy).toHaveBeenCalledWith('italic');
  });
});