import React from "react";
import { Routes, Route, Navigate, Outlet } from "react-router-dom";

// ĐỒNG BỘ CHUẨN CẤU TRÚC THƯ MỤC THỰC TẾ
import DashboardPage from "../pages/Dashboard.jsx"; 
import IngredientsPage from "../pages/ingredients/ingredients.jsx";
import MicronutrientsPage from "../pages/micronutrients/micronutrients.jsx"; 
import RecipesPage from "../pages/recipes/recipes.jsx"; 
import RecipeDetail from '../pages/recipes/recipe-detail';
import AddRecipePage from "../pages/recipes/add-recipe";
import EditRecipePage from "../pages/recipes/edit-recipes.jsx"; 
import UserListPage from "../pages/user/user-list.jsx";
import NutritionistListPage from "../pages/nutritionist/nutritionist-list.jsx"; // UC-84: Tải danh mục & kiểm duyệt chứng chỉ hành nghề y tế
import LoginPage from "../pages/Login.jsx"; 
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

      {/* Kiểm tra Token hợp lệ */}
      <Route element={<PrivateRoute />}>
        <Route path="/" element={<AdminLayout />}>
          <Route index element={<Navigate to="/dashboard" replace />} />
          <Route path="dashboard" element={<DashboardPage />} />

          {/* Nhóm Route kiểm soát nghiêm ngặt bằng Role 'admin' */}
          <Route element={<RoleProtectedRoute allowedRoles={['admin']} />}>
            <Route path="ingredients" element={<IngredientsPage />} />
            <Route path="micronutrients" element={<MicronutrientsPage />} />
            <Route path="users" element={<UserListPage />} />

            {/* 🩺 UC-84: KHU VỰC THẨM ĐỊNH VÀ KIỂM DUYỆT VĂN BẰNG CHUYÊN GIA */}
            <Route path="nutritionists" element={<NutritionistListPage />} />

            {/* Quản lý Hệ thống Công thức nấu ăn (Recipes) */}
            <Route path="recipes" element={<RecipesPage />} /> 
            <Route path="recipes/add" element={<AddRecipePage />} />
            <Route path="recipes/edit/:id" element={<EditRecipePage />} />
            <Route path="recipes/:id" element={<RecipeDetail />} />
          </Route>
        </Route>
      </Route>

      {/* Điều hướng mặc định ngược về Login nếu sai lệch Route */}
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  );
}