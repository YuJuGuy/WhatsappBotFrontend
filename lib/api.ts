import axios from 'axios';
import { pushApiError } from '@/components/ApiErrorPopup';

function getApiErrorMessage(error: any): string {
    const detail = error?.response?.data?.detail;
    if (Array.isArray(detail)) {
        const msgs = detail.map((d: { msg?: string }) => d?.msg).filter(Boolean);
        if (msgs.length > 0) return msgs.join('، ');
    }
    if (typeof detail === 'string' && detail.trim().length > 0) return detail;
    return error?.message || 'حدث خطأ غير متوقع';
}
const api = axios.create({
    baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000',
    headers: {
        'Content-Type': 'application/json',
    },
});

api.interceptors.request.use((config) => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});

api.interceptors.response.use(
    (response) => response,
    async (error) => {
        const originalRequest = error.config;
        const status = error.response?.status;

        if (status === 401 && !originalRequest._retry) {
            originalRequest._retry = true;
            try {
                const refreshToken = localStorage.getItem('refresh_token');
                if (refreshToken) {
                    const { data } = await axios.post(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/api/auth/refresh?refresh_token=${refreshToken}`);
                    localStorage.setItem('token', data.access_token);
                    localStorage.setItem('refresh_token', data.refresh_token);
                    api.defaults.headers.common['Authorization'] = `Bearer ${data.access_token}`;
                    return api(originalRequest);
                }
            } catch (refreshError) {
                console.error("Token refresh failed:", refreshError);
                localStorage.removeItem('token');
                localStorage.removeItem('refresh_token');
                window.location.href = '/login';
            }
        }

        // Push error to global popup (skip 401s since they're handled above)
        if (status !== 401) {
            const message = getApiErrorMessage(error);
            pushApiError(message, status);
        }

        return Promise.reject(error);
    }
);

export default api;


