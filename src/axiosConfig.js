import axios from 'axios';
import config from './config';

const instance = axios.create({
  baseURL: config.baseURL,
});

instance.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export default instance;
