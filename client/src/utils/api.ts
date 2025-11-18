// API utility to handle base URL
const API_BASE_URL = process.env.REACT_APP_API_URL || '';

export const apiFetch = (url: string, options?: RequestInit) => {
  const fullUrl = url.startsWith('http') ? url : `${API_BASE_URL}${url}`;
  return fetch(fullUrl, options);
};

export default apiFetch;
