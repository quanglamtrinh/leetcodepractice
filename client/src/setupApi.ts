// Global API setup - automatically prepends API_BASE_URL to all /api/ requests
import { API_BASE_URL } from './config';

const TOKEN_KEY = 'leetcode_auth_token';

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

  // Check if it's an API call (relative or full URL)
  const isApiCall = url.startsWith('/api/') || 
                    url.startsWith('/auth/') || 
                    url.includes('/api/') || 
                    url.includes('/auth/');
  
  if (isApiCall) {
    // Add Authorization header if token exists
    const token = localStorage.getItem(TOKEN_KEY);
    const headers = new Headers(init?.headers);
    
    if (token && !headers.has('Authorization')) {
      headers.set('Authorization', `Bearer ${token}`);
      console.log(`🔐 Added auth token to request: ${url}`);
    } else if (!token && !url.includes('/auth/')) {
      // Only warn if not an auth endpoint (register/login don't need tokens)
      console.log(`⚠️ No token found for request: ${url}`);
    }
    
    const newInit: RequestInit = {
      ...init,
      headers,
    };
    
    // If it's a relative URL, prepend API_BASE_URL
    if (url.startsWith('/')) {
      const fullUrl = `${API_BASE_URL}${url}`;
      console.log(`🔄 API Call: ${url} → ${fullUrl}`);
      
      if (typeof input === 'string') {
        return originalFetch(fullUrl, newInit);
      } else if (input instanceof URL) {
        return originalFetch(new URL(fullUrl), newInit);
      } else if (input instanceof Request) {
        return originalFetch(new Request(fullUrl, { ...input, headers }), newInit);
      }
    } else {
      // Already a full URL, just add headers
      console.log(`🔄 API Call (full URL): ${url}`);
      return originalFetch(input, newInit);
    }
  }

  // For non-API calls, use original fetch
  return originalFetch(input, init);
};

console.log('✅ Global API setup complete. All /api/ calls will use:', API_BASE_URL);

export {};
