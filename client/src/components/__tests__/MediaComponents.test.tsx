import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import ImageWithDescription from '../media/ImageWithDescription';
import YouTubeWithDescription from '../media/YouTubeWithDescription';

describe('ImageWithDescription', () => {
  const mockOnDescriptionChange = jest.fn();
  const mockOnImageChange = jest.fn();
  const mockOnRemove = jest.fn();
  const mockOnHTMLGenerate = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders upload interface when no image is provided', () => {
    render(
      <ImageWithDescription
        onDescriptionChange={mockOnDescriptionChange}
        onImageChange={mockOnImageChange}
        onRemove={mockOnRemove}
        onHTMLGenerate={mockOnHTMLGenerate}
      />
    );

    expect(screen.getByText('Upload Image')).toBeInTheDocument();
    expect(screen.getByText('Add URL')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Enter image URL...')).toBeInTheDocument();
  });

  it('renders image and description when src is provided', () => {
    render(
      <ImageWithDescription
        src="https://example.com/image.jpg"
        alt="Test image"
        description="Test description"
        onDescriptionChange={mockOnDescriptionChange}
        onImageChange={mockOnImageChange}
        onRemove={mockOnRemove}
        onHTMLGenerate={mockOnHTMLGenerate}
      />
    );

    const image = screen.getByRole('img');
    expect(image).toBeInTheDocument();
    expect(image).toHaveAttribute('src', 'https://example.com/image.jpg');
    expect(image).toHaveAttribute('alt', 'Test image');
    
    // The description is now in a contenteditable div, not a textarea
    const descriptionField = screen.getByText('Test description');
    expect(descriptionField).toBeInTheDocument();
  });

  it('calls onDescriptionChange when description is updated', () => {
    render(
      <ImageWithDescription
        src="https://example.com/image.jpg"
        description="Initial description"
        onDescriptionChange={mockOnDescriptionChange}
        onImageChange={mockOnImageChange}
        onRemove={mockOnRemove}
        onHTMLGenerate={mockOnHTMLGenerate}
      />
    );

    const descriptionField = screen.getByText('Initial description');
    fireEvent.focus(descriptionField);
    fireEvent.input(descriptionField, { target: { innerHTML: 'Updated description' } });

    expect(mockOnDescriptionChange).toHaveBeenCalledWith('Updated description');
  });

  it('calls onImageChange when URL is submitted', () => {
    render(
      <ImageWithDescription
        onDescriptionChange={mockOnDescriptionChange}
        onImageChange={mockOnImageChange}
        onRemove={mockOnRemove}
        onHTMLGenerate={mockOnHTMLGenerate}
      />
    );

    const urlInput = screen.getByPlaceholderText('Enter image URL...');
    const addButton = screen.getByText('Add');

    fireEvent.change(urlInput, { target: { value: 'https://example.com/new-image.jpg' } });
    fireEvent.click(addButton);

    expect(mockOnImageChange).toHaveBeenCalledWith('https://example.com/new-image.jpg', 'Image');
    expect(mockOnHTMLGenerate).toHaveBeenCalled();
  });

  it('calls onImageChange when Enter key is pressed in URL input', () => {
    render(
      <ImageWithDescription
        onDescriptionChange={mockOnDescriptionChange}
        onImageChange={mockOnImageChange}
        onRemove={mockOnRemove}
        onHTMLGenerate={mockOnHTMLGenerate}
      />
    );

    const urlInput = screen.getByPlaceholderText('Enter image URL...');

    fireEvent.change(urlInput, { target: { value: 'https://example.com/keyboard-image.jpg' } });
    fireEvent.keyDown(urlInput, { key: 'Enter' });

    expect(mockOnImageChange).toHaveBeenCalledWith('https://example.com/keyboard-image.jpg', 'Image');
    expect(mockOnHTMLGenerate).toHaveBeenCalled();
  });

  it('validates image URLs and shows error for invalid URLs', () => {
    // Mock window.alert
    const alertSpy = jest.spyOn(window, 'alert').mockImplementation(() => {});

    render(
      <ImageWithDescription
        onDescriptionChange={mockOnDescriptionChange}
        onImageChange={mockOnImageChange}
        onRemove={mockOnRemove}
        onHTMLGenerate={mockOnHTMLGenerate}
      />
    );

    const urlInput = screen.getByPlaceholderText('Enter image URL...');
    const addButton = screen.getByText('Add');

    fireEvent.change(urlInput, { target: { value: 'https://invalid-url.com/not-an-image' } });
    fireEvent.click(addButton);

    expect(alertSpy).toHaveBeenCalledWith('Please enter a valid image URL (jpg, jpeg, png, gif, webp, svg)');
    expect(mockOnImageChange).not.toHaveBeenCalled();

    alertSpy.mockRestore();
  });

  it('generates HTML structure when image is added', () => {
    render(
      <ImageWithDescription
        onDescriptionChange={mockOnDescriptionChange}
        onImageChange={mockOnImageChange}
        onRemove={mockOnRemove}
        onHTMLGenerate={mockOnHTMLGenerate}
      />
    );

    const urlInput = screen.getByPlaceholderText('Enter image URL...');
    const addButton = screen.getByText('Add');

    fireEvent.change(urlInput, { target: { value: 'https://example.com/test.jpg' } });
    fireEvent.click(addButton);

    expect(mockOnHTMLGenerate).toHaveBeenCalledWith(
      expect.stringContaining('class="media-block image-block"')
    );
    expect(mockOnHTMLGenerate).toHaveBeenCalledWith(
      expect.stringContaining('https://example.com/test.jpg')
    );
  });
});

describe('YouTubeWithDescription', () => {
  const mockOnDescriptionChange = jest.fn();
  const mockOnVideoChange = jest.fn();
  const mockOnRemove = jest.fn();
  const mockOnHTMLGenerate = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders URL input interface when no video is provided', () => {
    render(
      <YouTubeWithDescription
        onDescriptionChange={mockOnDescriptionChange}
        onVideoChange={mockOnVideoChange}
        onRemove={mockOnRemove}
        onHTMLGenerate={mockOnHTMLGenerate}
      />
    );

    expect(screen.getByText('Add YouTube Video')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Enter YouTube URL...')).toBeInTheDocument();
    expect(screen.getByText('Supports youtube.com/watch?v=... and youtu.be/... URLs')).toBeInTheDocument();
  });

  it('renders video iframe and description when videoId is provided', () => {
    render(
      <YouTubeWithDescription
        videoId="dQw4w9WgXcQ"
        videoUrl="https://www.youtube.com/watch?v=dQw4w9WgXcQ"
        description="Test video description"
        onDescriptionChange={mockOnDescriptionChange}
        onVideoChange={mockOnVideoChange}
        onRemove={mockOnRemove}
        onHTMLGenerate={mockOnHTMLGenerate}
      />
    );

    const iframe = screen.getByTitle('YouTube video');
    expect(iframe).toBeInTheDocument();
    expect(iframe).toHaveAttribute('src', 'https://www.youtube.com/embed/dQw4w9WgXcQ');
    
    // The description is now in a contenteditable div, not a textarea
    const descriptionField = screen.getByText('Test video description');
    expect(descriptionField).toBeInTheDocument();
  });

  it('calls onDescriptionChange when description is updated', () => {
    render(
      <YouTubeWithDescription
        videoId="dQw4w9WgXcQ"
        description="Initial description"
        onDescriptionChange={mockOnDescriptionChange}
        onVideoChange={mockOnVideoChange}
        onRemove={mockOnRemove}
        onHTMLGenerate={mockOnHTMLGenerate}
      />
    );

    const descriptionField = screen.getByText('Initial description');
    fireEvent.focus(descriptionField);
    fireEvent.input(descriptionField, { target: { innerHTML: 'Updated video description' } });

    expect(mockOnDescriptionChange).toHaveBeenCalledWith('Updated video description');
  });

  it('extracts video ID from youtube.com/watch URL and calls onVideoChange', () => {
    render(
      <YouTubeWithDescription
        onDescriptionChange={mockOnDescriptionChange}
        onVideoChange={mockOnVideoChange}
        onRemove={mockOnRemove}
        onHTMLGenerate={mockOnHTMLGenerate}
      />
    );

    const urlInput = screen.getByPlaceholderText('Enter YouTube URL...');
    const addButton = screen.getByText('Add');

    fireEvent.change(urlInput, { target: { value: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ' } });
    fireEvent.click(addButton);

    expect(mockOnVideoChange).toHaveBeenCalledWith('dQw4w9WgXcQ', 'https://www.youtube.com/watch?v=dQw4w9WgXcQ');
    expect(mockOnHTMLGenerate).toHaveBeenCalled();
  });

  it('extracts video ID from youtu.be URL and calls onVideoChange', () => {
    render(
      <YouTubeWithDescription
        onDescriptionChange={mockOnDescriptionChange}
        onVideoChange={mockOnVideoChange}
        onRemove={mockOnRemove}
        onHTMLGenerate={mockOnHTMLGenerate}
      />
    );

    const urlInput = screen.getByPlaceholderText('Enter YouTube URL...');
    const addButton = screen.getByText('Add');

    fireEvent.change(urlInput, { target: { value: 'https://youtu.be/dQw4w9WgXcQ' } });
    fireEvent.click(addButton);

    expect(mockOnVideoChange).toHaveBeenCalledWith('dQw4w9WgXcQ', 'https://youtu.be/dQw4w9WgXcQ');
    expect(mockOnHTMLGenerate).toHaveBeenCalled();
  });

  it('shows alert for invalid YouTube URL', () => {
    // Mock window.alert
    const alertSpy = jest.spyOn(window, 'alert').mockImplementation(() => {});

    render(
      <YouTubeWithDescription
        onDescriptionChange={mockOnDescriptionChange}
        onVideoChange={mockOnVideoChange}
        onRemove={mockOnRemove}
        onHTMLGenerate={mockOnHTMLGenerate}
      />
    );

    const urlInput = screen.getByPlaceholderText('Enter YouTube URL...');
    const addButton = screen.getByText('Add');

    fireEvent.change(urlInput, { target: { value: 'https://invalid-url.com' } });
    fireEvent.click(addButton);

    expect(alertSpy).toHaveBeenCalledWith('Please enter a valid YouTube URL');
    expect(mockOnVideoChange).not.toHaveBeenCalled();

    alertSpy.mockRestore();
  });

  it('calls onVideoChange when Enter key is pressed in URL input', () => {
    render(
      <YouTubeWithDescription
        onDescriptionChange={mockOnDescriptionChange}
        onVideoChange={mockOnVideoChange}
        onRemove={mockOnRemove}
        onHTMLGenerate={mockOnHTMLGenerate}
      />
    );

    const urlInput = screen.getByPlaceholderText('Enter YouTube URL...');

    fireEvent.change(urlInput, { target: { value: 'https://www.youtube.com/watch?v=keyboard123' } });
    fireEvent.keyDown(urlInput, { key: 'Enter' });

    expect(mockOnVideoChange).toHaveBeenCalledWith('keyboard123', 'https://www.youtube.com/watch?v=keyboard123');
    expect(mockOnHTMLGenerate).toHaveBeenCalled();
  });

  it('generates HTML structure when video is added', () => {
    render(
      <YouTubeWithDescription
        onDescriptionChange={mockOnDescriptionChange}
        onVideoChange={mockOnVideoChange}
        onRemove={mockOnRemove}
        onHTMLGenerate={mockOnHTMLGenerate}
      />
    );

    const urlInput = screen.getByPlaceholderText('Enter YouTube URL...');
    const addButton = screen.getByText('Add');

    fireEvent.change(urlInput, { target: { value: 'https://www.youtube.com/watch?v=testVideo123' } });
    fireEvent.click(addButton);

    expect(mockOnHTMLGenerate).toHaveBeenCalledWith(
      expect.stringContaining('class="media-block youtube-block"')
    );
    expect(mockOnHTMLGenerate).toHaveBeenCalledWith(
      expect.stringContaining('data-video-id="testVideo123"')
    );
  });
});