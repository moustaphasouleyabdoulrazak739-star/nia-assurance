import api from './client';

export async function login(email, password) {
  const response = await api.post('/auth/login/', { email, password });
  return response.data; // { user, access, refresh, message }
}

export async function fetchProfile() {
  const response = await api.get('/auth/profile/');
  return response.data;
}
