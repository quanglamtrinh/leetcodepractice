import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import ExtendedSlashCommand, { extendedBlockTypes } from '../ExtendedSlashCommand';

describe('ExtendedSlashCommand', () => {
  const mockOnSelectCommand = jest.fn();
  const mockOnClose = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders all block types when no filter is applied', () => {
    render(
      <ExtendedSlashCommand
        show={true}
        blockId={1}
        currentContent="/"
        onSelectCommand={mockOnSelectCommand}
        onClose={mockOnClose}
      />
    );

    // Check that basic blocks section is present
    expect(screen.getByText('BASIC BLOCKS')).toBeInTheDocument();
    
    // Check that media blocks section is present
    expect(screen.getByText('MEDIA BLOCKS')).toBeInTheDocument();
    
    // Check that all block types are rendered
    expect(screen.getByText('Text')).toBeInTheDocument();
    expect(screen.getByText('Code')).toBeInTheDocument();
    expect(screen.getByText('Heading')).toBeInTheDocument();
    expect(screen.getByText('Bullet List')).toBeInTheDocument();
    expect(screen.getByText('Quote')).toBeInTheDocument();
    expect(screen.getByText('Divider')).toBeInTheDocument();
    expect(screen.getByText('Image with Description')).toBeInTheDocument();
    expect(screen.getByText('YouTube with Description')).toBeInTheDocument();
  });

  it('filters commands based on current content', () => {
    render(
      <ExtendedSlashCommand
        show={true}
        blockId={1}
        currentContent="/image"
        onSelectCommand={mockOnSelectCommand}
        onClose={mockOnClose}
      />
    );

    // Should show filtering indicator (text is split across elements)
    expect(screen.getByText('BASIC BLOCKS')).toBeInTheDocument();
    expect(screen.getByText('- Filtering by "/image"')).toBeInTheDocument();
    
    // Should only show image-related commands
    expect(screen.getByText('Image with Description')).toBeInTheDocument();
    
    // Should not show unrelated commands
    expect(screen.queryByText('Code')).not.toBeInTheDocument();
    expect(screen.queryByText('YouTube with Description')).not.toBeInTheDocument();
  });

  it('calls onSelectCommand when a command is clicked', () => {
    render(
      <ExtendedSlashCommand
        show={true}
        blockId={1}
        currentContent="/"
        onSelectCommand={mockOnSelectCommand}
        onClose={mockOnClose}
      />
    );

    // Click on the Image with Description command
    fireEvent.click(screen.getByText('Image with Description'));

    expect(mockOnSelectCommand).toHaveBeenCalledWith(1, 'image-with-description');
    expect(mockOnClose).toHaveBeenCalled();
  });

  it('calls onClose when Escape key is pressed', () => {
    render(
      <ExtendedSlashCommand
        show={true}
        blockId={1}
        currentContent="/"
        onSelectCommand={mockOnSelectCommand}
        onClose={mockOnClose}
      />
    );

    // Press Escape key on the menu container
    const menuContainer = screen.getByText('BASIC BLOCKS').closest('div');
    fireEvent.keyDown(menuContainer!, { key: 'Escape' });

    expect(mockOnClose).toHaveBeenCalled();
  });

  it('does not render when show is false', () => {
    render(
      <ExtendedSlashCommand
        show={false}
        blockId={1}
        currentContent="/"
        onSelectCommand={mockOnSelectCommand}
        onClose={mockOnClose}
      />
    );

    expect(screen.queryByText('BASIC BLOCKS')).not.toBeInTheDocument();
  });

  it('does not render when blockId is null', () => {
    render(
      <ExtendedSlashCommand
        show={true}
        blockId={null}
        currentContent="/"
        onSelectCommand={mockOnSelectCommand}
        onClose={mockOnClose}
      />
    );

    expect(screen.queryByText('BASIC BLOCKS')).not.toBeInTheDocument();
  });

  it('shows descriptions for commands', () => {
    render(
      <ExtendedSlashCommand
        show={true}
        blockId={1}
        currentContent="/"
        onSelectCommand={mockOnSelectCommand}
        onClose={mockOnClose}
      />
    );

    // Check that descriptions are shown
    expect(screen.getByText('Upload an image and add a description below it')).toBeInTheDocument();
    expect(screen.getByText('Embed a YouTube video with description text')).toBeInTheDocument();
    expect(screen.getByText('Code block with syntax highlighting')).toBeInTheDocument();
  });

  it('has correct block type definitions', () => {
    // Verify that the extended block types include media options
    const mediaTypes = extendedBlockTypes.filter(type => 
      ['image-with-description', 'youtube-with-description'].includes(type.type)
    );
    
    expect(mediaTypes).toHaveLength(2);
    
    const imageType = extendedBlockTypes.find(type => type.type === 'image-with-description');
    expect(imageType).toBeDefined();
    expect(imageType?.label).toBe('Image with Description');
    expect(imageType?.description).toBe('Upload an image and add a description below it');
    
    const youtubeType = extendedBlockTypes.find(type => type.type === 'youtube-with-description');
    expect(youtubeType).toBeDefined();
    expect(youtubeType?.label).toBe('YouTube with Description');
    expect(youtubeType?.description).toBe('Embed a YouTube video with description text');
  });

  it('filters YouTube commands correctly', () => {
    render(
      <ExtendedSlashCommand
        show={true}
        blockId={1}
        currentContent="/youtube"
        onSelectCommand={mockOnSelectCommand}
        onClose={mockOnClose}
      />
    );

    // Should show YouTube command
    expect(screen.getByText('YouTube with Description')).toBeInTheDocument();
    
    // Should not show other commands
    expect(screen.queryByText('Image with Description')).not.toBeInTheDocument();
    expect(screen.queryByText('Code')).not.toBeInTheDocument();
  });
});