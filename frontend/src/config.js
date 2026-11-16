/**
 * Backend origin (no /api). Static files like /uploads/*.pdf are served here.
 * Set VITE_API_BASE_URL in .env to match your Node server (default localhost:8000).
 */
export function getBackendOrigin() {
    const base = import.meta.env.VITE_API_BASE_URL;
    if (base && String(base).trim()) {
        return String(base).replace(/\/$/, '');
    }
    return 'http://localhost:8000';
}

export function getApiUrl() {
    return `${getBackendOrigin()}/api`;
}
