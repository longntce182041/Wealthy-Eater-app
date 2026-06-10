import React from "react";
import { Routes, Route, Navigate, Outlet } from "react-router-dom";

import DashboardPage from "../pages/dashboard";
import IngredientsPage from "../pages/ingredients/index.jsx";
import MicronutrientsPage from "../pages/micronutrients/index.jsx";
import LoginPage from "../pages/Login.jsx"; // Đảm bảo import đúng đường dẫn LoginPage của bạn
import AdminLayout from "../layouts/AdminLayout.jsx";

const PrivateRoute = () => {
  // ĐỒNG BỘ: Đổi sang check đúng key token mà trang Login lưu trữ
  const token = localStorage.getItem("admin_session_jwt_token");

  if (!token) {
    return <Navigate to="/login" replace />;
  }

  return <Outlet />;
};

const RoleProtectedRoute = ({ allowedRoles }) => {
  // ĐỒNG BỘ: Parse object admin_user ra để lấy role chính xác
  let userRole = null;
  try {
    const rawUser = localStorage.getItem("admin_user");
    if (rawUser) {
      const parsed = JSON.parse(rawUser);
      userRole = parsed?.role;
    }
  } catch (e) {
    console.error("Error parsing admin user role", e);
  }

  if (!userRole || !allowedRoles.includes(userRole)) {
    return <Navigate to="/dashboard" replace />;
  }

  return <Outlet />;
};

export function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />

      <Route element={<PrivateRoute />}>
        <Route path="/" element={<AdminLayout />}>
          <Route index element={<Navigate to="/dashboard" replace />} />
          <Route path="dashboard" element={<DashboardPage />} />

          {/* Group Route bảo vệ nghiêm ngặt chỉ dành cho duy nhất Admin */}
          <Route element={<RoleProtectedRoute allowedRoles={['admin']} />}>
            <Route path="ingredients" element={<IngredientsPage />} />
            <Route path="micronutrients" element={<MicronutrientsPage />} />
          </Route>
        </Route>
      </Route>

      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  );
}