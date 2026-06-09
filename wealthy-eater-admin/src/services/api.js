import axios from "axios";

const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_GATEWAY_URL || "/api",
  timeout: 10000, // Timeout after 10 seconds of network inactivity
  headers: {
    "Content-Type": "application/json",
  },
});

// Automatically inject session security tokens into all outbound calls
apiClient.interceptors.request.use(
  (config) => {
    const adminToken = localStorage.getItem("admin_session_jwt_token");
    if (adminToken) {
      config.headers["Authorization"] = `Bearer ${adminToken}`; // Enforce strict bearer parsing logic format
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  },
);

export default apiClient;
