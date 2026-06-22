import axios from "axios";

const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_GATEWAY_URL || "/api",
  timeout: 10000,
  headers: {
    "Content-Type": "application/json",
  },
});

// Inject Bearer token on every outbound request
apiClient.interceptors.request.use(
  (config) => {
    const adminToken = localStorage.getItem("admin_session_jwt_token");
    if (adminToken) {
      config.headers["Authorization"] = `Bearer ${adminToken}`;
    }
    return config;
  },
  (error) => Promise.reject(error),
);

let isRefreshing = false;
let failedQueue = [];

const processQueue = (error, token = null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });
  failedQueue = [];
};

/**
 * Clears all auth data from localStorage and fires a 'session:expired'
 * custom event so React components can react gracefully (show modal, redirect).
 */
const dispatchSessionExpired = () => {
  localStorage.removeItem("admin_session_jwt_token");
  localStorage.removeItem("admin_refresh_token");
  localStorage.removeItem("admin_user");
  window.dispatchEvent(new CustomEvent("session:expired"));
};

apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (
      error.response?.status === 401 &&
      !originalRequest.url?.includes("/auth/refresh") &&
      !originalRequest._retry
    ) {
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then((token) => {
            originalRequest.headers["Authorization"] = "Bearer " + token;
            return apiClient(originalRequest);
          })
          .catch((err) => Promise.reject(err));
      }

      originalRequest._retry = true;
      isRefreshing = true;

      const refreshToken = localStorage.getItem("admin_refresh_token");
      if (!refreshToken) {
        processQueue(new Error("No refresh token"), null);
        isRefreshing = false;
        dispatchSessionExpired();
        return Promise.reject(error);
      }

      try {
        const baseURL = import.meta.env.VITE_API_GATEWAY_URL || "/api";
        const { data } = await axios.post(`${baseURL}/auth/refresh`, {
          refreshToken,
        });

        if (data && data.success && data.data?.accessToken) {
          const newAccessToken = data.data.accessToken;
          localStorage.setItem("admin_session_jwt_token", newAccessToken);
          originalRequest.headers["Authorization"] = "Bearer " + newAccessToken;
          processQueue(null, newAccessToken);
          return apiClient(originalRequest);
        } else {
          throw new Error("Refresh response invalid");
        }
      } catch (refreshError) {
        processQueue(refreshError, null);
        dispatchSessionExpired();
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  },
);

export default apiClient;
