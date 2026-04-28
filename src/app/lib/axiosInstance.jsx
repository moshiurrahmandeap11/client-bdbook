// lib/axios.js
import axios from "axios";
import Cookies from "js-cookie";

const BASE_URL = "https://bdbook-server.onrender.com/v1/api" || "https://server-bdbook.onrender.com/v1/api";

// "https://server-bdbook.onrender.com/v1/api" ||

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
      // Unauthorized - login page এ পাঠিয়ে দেয়
      if (typeof window !== "undefined") {
        window.location.href = "/login";
      }
    }
    return Promise.reject(error);
  }
);

export default axiosInstance;
