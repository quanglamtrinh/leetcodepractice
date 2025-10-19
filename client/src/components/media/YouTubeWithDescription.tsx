import React, { useState } from 'react';
import { Video, X } from 'lucide-react';
import FormattedDescriptionField from './FormattedDescriptionField';
import { generateYouTubeBlockHTML, extractYouTubeVideoId, isValidYouTubeUrl, type YouTubeBlockData } from '../../utils/mediaBlockUtils';

interface YouTubeWithDescriptionProps {
  videoId?: string;
  videoUrl?: string;
  description?: string;
  onDescriptionChange?: (description: string) => void;
  onVideoChange?: (videoId: string, videoUrl: string) => void;
  onRemove?: () => void;
  onHTMLGenerate?: (html: string) => void;
}

const YouTubeWithDescription: React.FC<YouTubeWithDescriptionProps> = ({
  videoId = '',
  videoUrl = '',
  description = '',
  onDescriptionChange,
  onVideoChange,
  onRemove,
  onHTMLGenerate
}) => {
  const [currentVideoId, setCurrentVideoId] = useState(videoId);

  const [videoDescription, setVideoDescription] = useState(description);
  const [urlInput, setUrlInput] = useState('');
  const [showUrlInput, setShowUrlInput] = useState(!videoId);

  const generateHTML = (vId: string, vUrl: string, desc: string) => {
    if (onHTMLGenerate) {
      const blockData: YouTubeBlockData = { videoId: vId, videoUrl: vUrl, description: desc };
      const html = generateYouTubeBlockHTML(blockData);
      onHTMLGenerate(html);
    }
  };

  const handleUrlSubmit = () => {
    if (!urlInput.trim()) return;

    const url = urlInput.trim();
    if (!isValidYouTubeUrl(url)) {
      alert('Please enter a valid YouTube URL');
      return;
    }

    const extractedVideoId = extractYouTubeVideoId(url);
    if (!extractedVideoId) {
      alert('Please enter a valid YouTube URL');
      return;
    }

    setCurrentVideoId(extractedVideoId);
    setShowUrlInput(false);
    onVideoChange?.(extractedVideoId, url);
    generateHTML(extractedVideoId, url, videoDescription);
  };

  const handleDescriptionChange = (newDescription: string) => {
    setVideoDescription(newDescription);
    onDescriptionChange?.(newDescription);
    
    // Generate HTML structure when description changes
    if (currentVideoId) {
      generateHTML(currentVideoId, videoUrl, newDescription);
    }
  };

  if (!currentVideoId && showUrlInput) {
    return (
      <div className="media-block youtube-block border-2 border-dashed border-gray-300 rounded-lg p-6 my-4">
        <div className="text-center">
          <div className="flex justify-center items-center gap-2 mb-4">
            <Video className="w-6 h-6 text-red-600" />
            <span className="text-lg font-medium text-gray-700">Add YouTube Video</span>
          </div>
          
          <div className="flex gap-2 max-w-md mx-auto">
            <input
              type="text"
              placeholder="Enter YouTube URL..."
              value={urlInput}
              onChange={(e) => setUrlInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  handleUrlSubmit();
                }
              }}
              className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
            />
            <button
              onClick={handleUrlSubmit}
              className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors"
            >
              Add
            </button>
          </div>
          
          <p className="text-sm text-gray-500 mt-2">
            Supports youtube.com/watch?v=... and youtu.be/... URLs
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="media-block youtube-block my-4">
      <div className="relative group">
        {currentVideoId && (
          <div className="relative">
            <div className="youtube-embed relative pb-[56.25%] h-0 overflow-hidden rounded-lg shadow-sm">
              <iframe
                src={`https://www.youtube.com/embed/${currentVideoId}`}
                title="YouTube video"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
                className="absolute top-0 left-0 w-full h-full border-0"
              />
            </div>
            {onRemove && (
              <button
                onClick={onRemove}
                className="absolute top-2 right-2 p-1 bg-red-600 hover:bg-red-700 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity z-10"
                title="Remove video"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        )}
        
        <div className="mt-3">
          <FormattedDescriptionField
            value={videoDescription}
            onChange={handleDescriptionChange}
            placeholder="Add a description for this video..."
            autoFocus={!!currentVideoId && !videoDescription}
          />
        </div>
      </div>
    </div>
  );
};

export default YouTubeWithDescription;