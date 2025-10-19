import {
  generateImageBlockHTML,
  generateYouTubeBlockHTML,
  parseImageBlockHTML,
  parseYouTubeBlockHTML,
  extractYouTubeVideoId,
  isValidImageUrl,
  isValidYouTubeUrl,
  escapeHtml,
  sanitizeDescriptionHTML,
  generateMediaBlockId
} from '../mediaBlockUtils';

describe('mediaBlockUtils', () => {
  describe('generateImageBlockHTML', () => {
    it('generates correct HTML structure for image block', () => {
      const data = {
        src: 'https://example.com/image.jpg',
        alt: 'Test image',
        description: 'Test description'
      };

      const html = generateImageBlockHTML(data);

      expect(html).toContain('class="media-block image-block"');
      expect(html).toContain('data-type="image"');
      expect(html).toContain('src="https://example.com/image.jpg"');
      expect(html).toContain('alt="Test image"');
      expect(html).toContain('Test description');
    });

    it('handles empty description', () => {
      const data = {
        src: 'https://example.com/image.jpg',
        alt: 'Test image'
      };

      const html = generateImageBlockHTML(data);

      expect(html).toContain('class="media-description"');
      expect(html).toContain('contenteditable="true"');
    });

    it('escapes HTML in src and alt attributes', () => {
      const data = {
        src: 'https://example.com/image.jpg?param=<script>',
        alt: 'Test <script>alert("xss")</script>',
        description: 'Safe description'
      };

      const html = generateImageBlockHTML(data);

      expect(html).not.toContain('<script>');
      expect(html).toContain('&lt;script&gt;');
    });
  });

  describe('generateYouTubeBlockHTML', () => {
    it('generates correct HTML structure for YouTube block', () => {
      const data = {
        videoId: 'dQw4w9WgXcQ',
        videoUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
        description: 'Test video description'
      };

      const html = generateYouTubeBlockHTML(data);

      expect(html).toContain('class="media-block youtube-block"');
      expect(html).toContain('data-type="youtube"');
      expect(html).toContain('data-video-id="dQw4w9WgXcQ"');
      expect(html).toContain('src="https://www.youtube.com/embed/dQw4w9WgXcQ"');
      expect(html).toContain('Test video description');
    });

    it('handles empty description', () => {
      const data = {
        videoId: 'dQw4w9WgXcQ',
        videoUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ'
      };

      const html = generateYouTubeBlockHTML(data);

      expect(html).toContain('class="media-description"');
      expect(html).toContain('contenteditable="true"');
    });
  });

  describe('parseImageBlockHTML', () => {
    it('parses image block HTML correctly', () => {
      const html = `
        <div class="media-block image-block" data-type="image">
          <img src="https://example.com/image.jpg" alt="Test image" />
          <div class="media-description" contenteditable="true">Test description</div>
        </div>
      `;

      const data = parseImageBlockHTML(html);

      expect(data).toEqual({
        src: 'https://example.com/image.jpg',
        alt: 'Test image',
        description: 'Test description'
      });
    });

    it('returns null for invalid HTML', () => {
      const html = '<div>Not an image block</div>';
      const data = parseImageBlockHTML(html);
      expect(data).toBeNull();
    });

    it('handles missing description', () => {
      const html = `
        <div class="media-block image-block" data-type="image">
          <img src="https://example.com/image.jpg" alt="Test image" />
        </div>
      `;

      const data = parseImageBlockHTML(html);

      expect(data).toEqual({
        src: 'https://example.com/image.jpg',
        alt: 'Test image',
        description: ''
      });
    });
  });

  describe('parseYouTubeBlockHTML', () => {
    it('parses YouTube block HTML correctly', () => {
      const html = `
        <div class="media-block youtube-block" data-type="youtube" data-video-id="dQw4w9WgXcQ">
          <div class="youtube-embed">
            <iframe src="https://www.youtube.com/embed/dQw4w9WgXcQ"></iframe>
          </div>
          <div class="media-description" contenteditable="true">Test video description</div>
        </div>
      `;

      const data = parseYouTubeBlockHTML(html);

      expect(data).toEqual({
        videoId: 'dQw4w9WgXcQ',
        videoUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
        description: 'Test video description'
      });
    });

    it('returns null for invalid HTML', () => {
      const html = '<div>Not a YouTube block</div>';
      const data = parseYouTubeBlockHTML(html);
      expect(data).toBeNull();
    });
  });

  describe('extractYouTubeVideoId', () => {
    it('extracts video ID from youtube.com/watch URL', () => {
      const url = 'https://www.youtube.com/watch?v=dQw4w9WgXcQ';
      const videoId = extractYouTubeVideoId(url);
      expect(videoId).toBe('dQw4w9WgXcQ');
    });

    it('extracts video ID from youtu.be URL', () => {
      const url = 'https://youtu.be/dQw4w9WgXcQ';
      const videoId = extractYouTubeVideoId(url);
      expect(videoId).toBe('dQw4w9WgXcQ');
    });

    it('extracts video ID from youtube.com/embed URL', () => {
      const url = 'https://www.youtube.com/embed/dQw4w9WgXcQ';
      const videoId = extractYouTubeVideoId(url);
      expect(videoId).toBe('dQw4w9WgXcQ');
    });

    it('handles URLs with additional parameters', () => {
      const url = 'https://www.youtube.com/watch?v=dQw4w9WgXcQ&t=30s';
      const videoId = extractYouTubeVideoId(url);
      expect(videoId).toBe('dQw4w9WgXcQ');
    });

    it('returns null for invalid URLs', () => {
      const url = 'https://example.com/not-youtube';
      const videoId = extractYouTubeVideoId(url);
      expect(videoId).toBeNull();
    });
  });

  describe('isValidImageUrl', () => {
    it('returns true for valid image URLs', () => {
      expect(isValidImageUrl('https://example.com/image.jpg')).toBe(true);
      expect(isValidImageUrl('https://example.com/image.jpeg')).toBe(true);
      expect(isValidImageUrl('https://example.com/image.png')).toBe(true);
      expect(isValidImageUrl('https://example.com/image.gif')).toBe(true);
      expect(isValidImageUrl('https://example.com/image.webp')).toBe(true);
      expect(isValidImageUrl('https://example.com/image.svg')).toBe(true);
    });

    it('returns false for invalid image URLs', () => {
      expect(isValidImageUrl('https://example.com/not-image.txt')).toBe(false);
      expect(isValidImageUrl('https://example.com/video.mp4')).toBe(false);
      expect(isValidImageUrl('not-a-url')).toBe(false);
      expect(isValidImageUrl('')).toBe(false);
    });

    it('is case insensitive', () => {
      expect(isValidImageUrl('https://example.com/image.JPG')).toBe(true);
      expect(isValidImageUrl('https://example.com/image.PNG')).toBe(true);
    });
  });

  describe('isValidYouTubeUrl', () => {
    it('returns true for valid YouTube URLs', () => {
      expect(isValidYouTubeUrl('https://www.youtube.com/watch?v=dQw4w9WgXcQ')).toBe(true);
      expect(isValidYouTubeUrl('https://youtu.be/dQw4w9WgXcQ')).toBe(true);
      expect(isValidYouTubeUrl('https://www.youtube.com/embed/dQw4w9WgXcQ')).toBe(true);
    });

    it('returns false for invalid URLs', () => {
      expect(isValidYouTubeUrl('https://example.com/not-youtube')).toBe(false);
      expect(isValidYouTubeUrl('https://vimeo.com/123456')).toBe(false);
      expect(isValidYouTubeUrl('not-a-url')).toBe(false);
      expect(isValidYouTubeUrl('')).toBe(false);
    });
  });

  describe('escapeHtml', () => {
    it('escapes HTML characters', () => {
      expect(escapeHtml('<script>alert("xss")</script>')).toBe('&lt;script&gt;alert("xss")&lt;/script&gt;');
      expect(escapeHtml('Hello & goodbye')).toBe('Hello &amp; goodbye');
      expect(escapeHtml('"quoted text"')).toBe('"quoted text"');
    });

    it('handles empty string', () => {
      expect(escapeHtml('')).toBe('');
    });
  });

  describe('sanitizeDescriptionHTML', () => {
    it('removes dangerous script tags', () => {
      const html = '<p>Safe content</p><script>alert("xss")</script>';
      const sanitized = sanitizeDescriptionHTML(html);
      expect(sanitized).toContain('Safe content');
      expect(sanitized).not.toContain('<script>');
    });

    it('removes dangerous attributes', () => {
      const html = '<p onclick="alert(\'xss\')">Click me</p>';
      const sanitized = sanitizeDescriptionHTML(html);
      expect(sanitized).toContain('Click me');
      expect(sanitized).not.toContain('onclick');
    });

    it('preserves safe formatting', () => {
      const html = '<p><strong>Bold</strong> and <em>italic</em> text</p>';
      const sanitized = sanitizeDescriptionHTML(html);
      expect(sanitized).toContain('<strong>Bold</strong>');
      expect(sanitized).toContain('<em>italic</em>');
    });
  });

  describe('generateMediaBlockId', () => {
    it('generates unique IDs', () => {
      const id1 = generateMediaBlockId();
      const id2 = generateMediaBlockId();
      
      expect(id1).toMatch(/^media-\d+-[a-z0-9]+$/);
      expect(id2).toMatch(/^media-\d+-[a-z0-9]+$/);
      expect(id1).not.toBe(id2);
    });
  });
});