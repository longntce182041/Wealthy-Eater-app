import React from "react";
import { Routes, Route, Navigate, Outlet } from "react-router-dom";

// ĐỒNG BỘ CHUẨN CẤU TRÚC THƯ MỤC THỰC TẾ CỦA BẠN:
import DashboardPage from "../pages/Dashboard.jsx"; // File Dashboard.jsx nằm trực tiếp trong pages
import IngredientsPage from "../pages/ingredients/ingredients.jsx";
import MicronutrientsPage from "../pages/micronutrients/micronutrients.jsx"; // Trỏ đúng vào file micronutrients.jsx chứ không phải index.jsx
import RecipesPage from "../pages/recipes/recipes.jsx"; 
import RecipeDetail from '../pages/recipes/recipe-detail';
import AddRecipePage from "../pages/recipes/add-recipe";
import EditRecipePage from "../pages/recipes/edit-recipes.jsx"; 
import UserListPage from "../pages/user/user-list.jsx";
import NutritionistListPage from "../pages/nutritionist/nutritionist-list.jsx";
import LoginPage from "../pages/Login.jsx"; // File Login.jsx nằm trực tiếp trong pages
import AdminLayout from "../layouts/AdminLayout.jsx";

const PrivateRoute = () => {
  const token = localStorage.getItem("admin_session_jwt_token");
  if (!token) {
    return <Navigate to="/login" replace />;
  }
  return <Outlet />;
};

const RoleProtectedRoute = ({ allowedRoles }) => {
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
            
            {/* 🆕 TRANG QUẢN LÝ THÀNH VIÊN (Đặt tại đường dẫn /users) */}
            <Route path="users" element={<UserListPage />} />

            {/* 🔥 ĐÃ THÊM: TRANG QUẢN LÝ CHUYÊN GIA DINH DƯỠNG Ở ĐÂY */}
            <Route path="nutritionists" element={<NutritionistListPage />} />

            {/* 1. Trang danh sách công thức */}
            <Route path="recipes" element={<RecipesPage />} /> 
            
            {/* 2. ✅ ĐƯA TRANG ADD LÊN TRÊN (Để tránh bị nhầm add là một cái id) */}
            {/* 2. ✅ ĐƯA TRANG ADD LÊN TRÊN (Để tránh bị nhầm add là một cái id) */}
            <Route path="recipes/add" element={<AddRecipePage />} />
            <Route path="recipes/edit/:id" element={<EditRecipePage />} />
            {/* 3. ĐƯA TRANG CHI TIẾT XUỐNG DƯỚI CÙNG */}
            <Route path="recipes/:id" element={<RecipeDetail />} />
            
          </Route>
        </Route>
      </Route>

      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  );
}