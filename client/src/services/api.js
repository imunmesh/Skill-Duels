/**
 * Centralized API Client with Token Interceptor (NFR-03)
 */
const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

/**
 * Fetch wrapper that attaches Bearer JWT authorization header
 */
export const apiRequest = async (endpoint, options = {}) => {
  const token = localStorage.getItem('skillduels_token');

  const headers = {
    'Content-Type': 'application/json',
    ...(token && { Authorization: `Bearer ${token}` }),
    ...options.headers,
  };

  const config = {
    ...options,
    headers,
  };

  try {
    const response = await fetch(`${BASE_URL}${endpoint}`, config);
    const data = await response.json();

    if (!response.ok) {
      const error = new Error(data.message || 'API request failed');
      error.status = response.status;
      error.data = data;
      throw error;
    }

    return data;
  } catch (err) {
    throw err;
  }
};

export const authAPI = {
  login: (credentials) =>
    apiRequest('/auth/login', {
      method: 'POST',
      body: JSON.stringify(credentials),
    }),

  register: (userData) =>
    apiRequest('/auth/register', {
      method: 'POST',
      body: JSON.stringify(userData),
    }),

  getMe: () => apiRequest('/auth/me', { method: 'GET' }),
};

export const categoryAPI = {
  getAll: (all = false) => apiRequest(`/categories${all ? '?all=true' : ''}`),
  getById: (id) => apiRequest(`/categories/${id}`),
  create: (data) =>
    apiRequest('/categories', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  update: (id, data) =>
    apiRequest(`/categories/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),
  delete: (id) => apiRequest(`/categories/${id}`, { method: 'DELETE' }),
};

export const questionAPI = {
  getAll: ({ page = 1, limit = 10, category = '', difficulty = '', search = '' } = {}) => {
    const params = new URLSearchParams({
      page: String(page),
      limit: String(limit),
      ...(category && { category }),
      ...(difficulty && { difficulty }),
      ...(search && { search }),
    });
    return apiRequest(`/questions?${params.toString()}`);
  },
  getById: (id) => apiRequest(`/questions/${id}`),
  create: (data) =>
    apiRequest('/questions', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  update: (id, data) =>
    apiRequest(`/questions/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),
  delete: (id) => apiRequest(`/questions/${id}`, { method: 'DELETE' }),
  getRandom: (category = 'technical', count = 3) =>
    apiRequest(`/questions/random?category=${category}&count=${count}`),
};

export const leaderboardAPI = {
  getGlobal: (page = 1, limit = 20) =>
    apiRequest(`/leaderboard/global?page=${page}&limit=${limit}`),
  getWeekly: (page = 1, limit = 20) =>
    apiRequest(`/leaderboard/weekly?page=${page}&limit=${limit}`),
  getUserProgression: (userId) => apiRequest(`/leaderboard/user/${userId}`),
  getPublic: (type = 'global', limit = 10) =>
    apiRequest(`/leaderboard/public?type=${type}&limit=${limit}`),
};

export const profileAPI = {
  getSkills: () => apiRequest('/skills'),
  getMyProfile: () => apiRequest('/profile/me'),
  updateProfile: (data) =>
    apiRequest('/profile', {
      method: 'PUT',
      body: JSON.stringify(data),
    }),
  uploadAvatar: async (formData) => {
    const token = localStorage.getItem('skillduels_token');
    const res = await fetch(`${BASE_URL}/profile/avatar`, {
      method: 'POST',
      headers: {
        ...(token && { Authorization: `Bearer ${token}` }),
      },
      body: formData,
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.message || 'Avatar upload failed');
    }
    return data;
  },
};
