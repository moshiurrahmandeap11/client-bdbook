// lib/axios.js
import axios from "axios";
import Cookies from "js-cookie";

const API_HOST = process.env.NEXT_PUBLIC_API_URL || "https://bdbook-server.onrender.com";
const BASE_URL = API_HOST.endsWith("/v1/api")
  ? API_HOST
  : `${API_HOST.replace(/\/+$/, "")}/v1/api`;

const axiosInstance = axios.create({
  baseURL: BASE_URL,
  timeout: 30000,
  headers: {
    "Content-Type": "application/json",
  },
  withCredentials: true, 
});
 

axiosInstance.interceptors.request.use(
  (config) => {
    const token = Cookies.get("token") || localStorage.getItem("token");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor - error handling
axiosInstance.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Unauthorized - redirect to /auth/login
      if (typeof window !== "undefined" && !window.location.pathname.startsWith("/auth/")) {
        window.location.href = "/auth/login";
      }
    }
    return Promise.reject(error);
  }
);

export default axiosInstance;
