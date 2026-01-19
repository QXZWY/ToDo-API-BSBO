const API_BASE_URL = 'http://localhost:8000/api/v3';

function getAuthToken() {
    return localStorage.getItem('token');
}

function setAuthToken(token) {
    localStorage.setItem('token', token);
}

function clearAuthToken() {
    localStorage.removeItem('token');
}

async function apiRequest(endpoint, options = {}) {
    const url = `${API_BASE_URL}${endpoint}`;
    const token = getAuthToken();
    
    const headers = {
        'Content-Type': 'application/json',
        ...options.headers,
    };
    
    if (token && !options.skipAuth) {
        headers['Authorization'] = `Bearer ${token}`;
    }
    
    const config = {
        ...options,
        headers,
    };
    
    console.log('API Request:', { url, method: config.method, hasToken: !!token });
    
    try {
        const response = await fetch(url, config);
        
        console.log('API Response:', { url, status: response.status, ok: response.ok });
        
        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            console.error('API Error:', errorData);
            throw new Error(errorData.detail || `HTTP error! status: ${response.status}`);
        }
        
        const contentType = response.headers.get('content-type');
        if (contentType && contentType.includes('application/json')) {
            return await response.json();
        }
        
        return null;
    } catch (error) {
        console.error('API request failed:', { url, error: error.message });
        if (error.message === 'Failed to fetch') {
            throw new Error('Не удается подключиться к серверу. Проверьте, что бэкенд запущен на http://localhost:8000');
        }
        throw error;
    }
}

export const authAPI = {
    async register(userData) {
        return await apiRequest('/auth/register', {
            method: 'POST',
            body: JSON.stringify(userData),
            skipAuth: true,
        });
    },
    
    async login(email, password) {
        const formData = new URLSearchParams();
        formData.append('username', email);
        formData.append('password', password);
        
        return await apiRequest('/auth/login', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: formData,
            skipAuth: true,
        });
    },
    
    async getMe() {
        return await apiRequest('/auth/me', {
            method: 'GET',
        });
    },
    
    async changePassword(oldPassword, newPassword) {
        return await apiRequest('/auth/change-password', {
            method: 'PATCH',
            body: JSON.stringify({
                old_password: oldPassword,
                new_password: newPassword,
            }),
        });
    },
};

export const tasksAPI = {
    async getAll() {
        return await apiRequest('/tasks', {
            method: 'GET',
        });
    },
    
    async getById(taskId) {
        return await apiRequest(`/tasks/${taskId}`, {
            method: 'GET',
        });
    },
    
    async getByQuadrant(quadrant) {
        return await apiRequest(`/tasks/quadrant/${quadrant}`, {
            method: 'GET',
        });
    },
    
    async getByStatus(status) {
        return await apiRequest(`/tasks/status/${status}`, {
            method: 'GET',
        });
    },
    
    async search(query) {
        return await apiRequest(`/tasks/search?q=${encodeURIComponent(query)}`, {
            method: 'GET',
        });
    },
    
    async getToday() {
        return await apiRequest('/tasks/today', {
            method: 'GET',
        });
    },
    
    async create(taskData) {
        return await apiRequest('/tasks/', {
            method: 'POST',
            body: JSON.stringify(taskData),
        });
    },
    
    async update(taskId, taskData) {
        return await apiRequest(`/tasks/${taskId}`, {
            method: 'PUT',
            body: JSON.stringify(taskData),
        });
    },
    
    async complete(taskId) {
        return await apiRequest(`/tasks/${taskId}/complete`, {
            method: 'PATCH',
        });
    },
    
    async delete(taskId) {
        return await apiRequest(`/tasks/${taskId}`, {
            method: 'DELETE',
        });
    },
};

export const statsAPI = {
    async getStats() {
        return await apiRequest('/stats/', {
            method: 'GET',
        });
    },
    
    async getDeadlineStats() {
        return await apiRequest('/stats/deadlines', {
            method: 'GET',
        });
    },
};

export { getAuthToken, setAuthToken, clearAuthToken };
