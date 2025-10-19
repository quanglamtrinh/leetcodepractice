import React, { useState, useRef } from 'react';
import { Upload, Link, X } from 'lucide-react';
import FormattedDescriptionField from './FormattedDescriptionField';
import { generateImageBlockHTML, isValidImageUrl, type ImageBlockData } from '../../utils/mediaBlockUtils';

interface ImageWithDescriptionProps {
  src?: string;
  alt?: string;
  description?: string;
  onDescriptionChange?: (description: string) => void;
  onImageChange?: (src: string, alt?: string) => void;
  onRemove?: () => void;
  onHTMLGenerate?: (html: string) => void;
}

const ImageWithDescription: React.FC<ImageWithDescriptionProps> = ({
  src = '',
  alt = '',
  description = '',
  onDescriptionChange,
  onImageChange,
  onRemove,
  onHTMLGenerate
}) => {
  const [imageUrl, setImageUrl] = useState(src);
  const [imageAlt, setImageAlt] = useState(alt);
  const [imageDescription, setImageDescription] = useState(description);
  const [showUrlInput, setShowUrlInput] = useState(!src);
  const [urlInput, setUrlInput] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      // Validate file type
      if (!file.type.startsWith('image/')) {
        alert('Please select an image file');
        return;
      }
      
      // Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        alert('Image size must be less than 5MB');
        return;
      }

      const reader = new FileReader();
      reader.onload = (e) => {
        const result = e.target?.result as string;
        setImageUrl(result);
        setImageAlt(file.name);
        setShowUrlInput(false);
        onImageChange?.(result, file.name);
        generateHTML(result, file.name, imageDescription);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleUrlSubmit = () => {
    if (!urlInput.trim()) return;
    
    const url = urlInput.trim();
    if (!isValidImageUrl(url)) {
      alert('Please enter a valid image URL (jpg, jpeg, png, gif, webp, svg)');
      return;
    }
    
    setImageUrl(url);
    setImageAlt('Image');
    setShowUrlInput(false);
    onImageChange?.(url, 'Image');
    generateHTML(url, 'Image', imageDescription);
  };

  const handleDescriptionChange = (newDescription: string) => {
    setImageDescription(newDescription);
    onDescriptionChange?.(newDescription);
    
    // Generate HTML structure when description changes
    if (imageUrl) {
      generateHTML(imageUrl, imageAlt, newDescription);
    }
  };

  const generateHTML = (src: string, alt: string, desc: string) => {
    if (onHTMLGenerate) {
      const blockData: ImageBlockData = { src, alt, description: desc };
      const html = generateImageBlockHTML(blockData);
      onHTMLGenerate(html);
    }
  };

  if (!imageUrl && showUrlInput) {
    return (
      <div className="media-block image-block border-2 border-dashed border-gray-300 rounded-lg p-6 my-4">
        <div className="text-center">
          <div className="flex justify-center gap-4 mb-4">
            <button
              onClick={() => fileInputRef.current?.click()}
              className="flex items-center gap-2 px-4 py-2 bg-blue-100 hover:bg-blue-200 text-blue-700 rounded-lg transition-colors"
            >
              <Upload className="w-4 h-4" />
              Upload Image
            </button>
            <span className="text-gray-500 self-center">or</span>
            <button
              onClick={() => setShowUrlInput(true)}
              className="flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-colors"
            >
              <Link className="w-4 h-4" />
              Add URL
            </button>
          </div>
          
          <div className="flex gap-2 max-w-md mx-auto">
            <input
              type="text"
              placeholder="Enter image URL..."
              value={urlInput}
              onChange={(e) => setUrlInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  handleUrlSubmit();
                }
              }}
              className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <button
              onClick={handleUrlSubmit}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
            >
              Add
            </button>
          </div>
          
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileUpload}
            className="hidden"
          />
        </div>
      </div>
    );
  }

  return (
    <div className="media-block image-block my-4">
      <div className="relative group">
        {imageUrl && (
          <div className="relative">
            <img
              src={imageUrl}
              alt={imageAlt}
              className="max-w-full h-auto rounded-lg shadow-sm"
              onError={() => {
                alert('Failed to load image. Please check the URL.');
                setShowUrlInput(true);
                setImageUrl('');
              }}
            />
            {onRemove && (
              <button
                onClick={onRemove}
                className="absolute top-2 right-2 p-1 bg-red-600 hover:bg-red-700 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                title="Remove image"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        )}
        
        <div className="mt-3">
          <FormattedDescriptionField
            value={imageDescription}
            onChange={handleDescriptionChange}
            placeholder="Add a description for this image..."
            autoFocus={!!imageUrl && !imageDescription}
          />
        </div>
      </div>
    </div>
  );
};

export default ImageWithDescription;