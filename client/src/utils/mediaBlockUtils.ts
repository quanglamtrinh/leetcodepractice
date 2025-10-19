/**
 * Utility functions for generating HTML structure for media blocks
 */

export interface ImageBlockData {
  src: string;
  alt?: string;
  description?: string;
}

export interface YouTubeBlockData {
  videoId: string;
  videoUrl: string;
  description?: string;
}

/**
 * Generates HTML structure for an image block with description
 */
export const generateImageBlockHTML = (data: ImageBlockData): string => {
  const { src, alt = '', description = '' } = data;
  
  return `
    <div class="media-block image-block" data-type="image">
      <img src="${escapeHtml(src)}" alt="${escapeHtml(alt)}" />
      <div class="media-description" contenteditable="true">${description}</div>
    </div>
  `.trim();
};

/**
 * Generates HTML structure for a YouTube block with description
 */
export const generateYouTubeBlockHTML = (data: YouTubeBlockData): string => {
  const { videoId, description = '' } = data;
  
  return `
    <div class="media-block youtube-block" data-type="youtube" data-video-id="${escapeHtml(videoId)}">
      <div class="youtube-embed">
        <iframe 
          src="https://www.youtube.com/embed/${escapeHtml(videoId)}" 
          title="YouTube video" 
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
          allowfullscreen
          class="absolute top-0 left-0 w-full h-full border-0">
        </iframe>
      </div>
      <div class="media-description" contenteditable="true">${description}</div>
    </div>
  `.trim();
};

/**
 * Parses an image block HTML and extracts data
 */
export const parseImageBlockHTML = (html: string): ImageBlockData | null => {
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, 'text/html');
  const imageBlock = doc.querySelector('.media-block.image-block');
  
  if (!imageBlock) return null;
  
  const img = imageBlock.querySelector('img');
  const description = imageBlock.querySelector('.media-description');
  
  if (!img) return null;
  
  return {
    src: img.getAttribute('src') || '',
    alt: img.getAttribute('alt') || '',
    description: description?.innerHTML || ''
  };
};

/**
 * Parses a YouTube block HTML and extracts data
 */
export const parseYouTubeBlockHTML = (html: string): YouTubeBlockData | null => {
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, 'text/html');
  const youtubeBlock = doc.querySelector('.media-block.youtube-block');
  
  if (!youtubeBlock) return null;
  
  const videoId = youtubeBlock.getAttribute('data-video-id');
  const description = youtubeBlock.querySelector('.media-description');
  
  if (!videoId) return null;
  
  return {
    videoId,
    videoUrl: `https://www.youtube.com/watch?v=${videoId}`,
    description: description?.innerHTML || ''
  };
};

/**
 * Extracts YouTube video ID from various URL formats
 */
export const extractYouTubeVideoId = (url: string): string | null => {
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\n?#]+)/,
    /youtube\.com\/watch\?.*v=([^&\n?#]+)/
  ];

  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) {
      return match[1];
    }
  }
  return null;
};

/**
 * Validates if a URL is a valid image URL
 */
export const isValidImageUrl = (url: string): boolean => {
  try {
    new URL(url);
    return /\.(jpg|jpeg|png|gif|webp|svg)$/i.test(url);
  } catch {
    return false;
  }
};

/**
 * Validates if a URL is a valid YouTube URL
 */
export const isValidYouTubeUrl = (url: string): boolean => {
  return extractYouTubeVideoId(url) !== null;
};

/**
 * Escapes HTML characters to prevent XSS
 */
export const escapeHtml = (text: string): string => {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
};

/**
 * Sanitizes HTML content for media descriptions
 */
export const sanitizeDescriptionHTML = (html: string): string => {
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, 'text/html');
  
  // Remove script tags and other potentially dangerous elements
  const dangerousElements = doc.querySelectorAll('script, object, embed, iframe, form, input, button');
  dangerousElements.forEach(el => el.remove());
  
  // Remove dangerous attributes
  const allElements = doc.querySelectorAll('*');
  allElements.forEach(el => {
    const dangerousAttrs = ['onclick', 'onload', 'onerror', 'onmouseover', 'onfocus', 'onblur'];
    dangerousAttrs.forEach(attr => {
      if (el.hasAttribute(attr)) {
        el.removeAttribute(attr);
      }
    });
  });
  
  return doc.body.innerHTML;
};

/**
 * Generates a unique ID for media blocks
 */
export const generateMediaBlockId = (): string => {
  return `media-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
};