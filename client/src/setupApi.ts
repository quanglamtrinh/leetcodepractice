// Global API setup - automatically prepends API_BASE_URL to all /api/ requests
import { API_BASE_URL } from './config';

// Store original fetch
const originalFetch = window.fetch;

// Override global fetch
window.fetch = function(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  // Convert input to string to check if it's an API call
  let url: string;
  
  if (typeof input === 'string') {
    url = input;
  } else if (input instanceof URL) {
    url = input.toString();
  } else if (input instanceof Request) {
    url = input.url;
  } else {
    url = '';
  }

  // If it's a relative API call, prepend API_BASE_URL
  if (url.startsWith('/api/')) {
    const fullUrl = `${API_BASE_URL}${url}`;
    console.log(`🔄 API Call: ${url} → ${fullUrl}`);
    
    if (typeof input === 'string') {
      return originalFetch(fullUrl, init);
    } else if (input instanceof URL) {
      return originalFetch(new URL(fullUrl), init);
    } else if (input instanceof Request) {
      // Create new request with updated URL
      return originalFetch(new Request(fullUrl, input), init);
    }
  }

  // For non-API calls, use original fetch
  return originalFetch(input, init);
};

console.log('✅ Global API setup complete. All /api/ calls will use:', API_BASE_URL);

export {};
