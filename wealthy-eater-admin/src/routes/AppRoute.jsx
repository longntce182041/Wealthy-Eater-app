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
import LoginPage from "../pages/Login.jsx"; 
import AdminLayout from "../layouts/AdminLayout.jsx";
import PlatformAnalytics from "../pages/analytics/PlatformAnalytics.jsx";

// 🎯 ĐÃ SỬA ĐÚNG PATH CHUẨN THEO ẢNH CỦA NÍ:
import TransactionLogsPage from "../pages/transaction/transaction-logs.jsx";

// Route bảo vệ yêu cầu trạng thái đăng nhập hệ thống
const PrivateRoute = () => {
  const token = localStorage.getItem("admin_session_jwt_token");
  if (!token) {
    return <Navigate to="/login" replace />;
  }
  return <Outlet />;
};

// Route bảo vệ phân quyền tài khoản (Chỉ admin được phép vào nhóm cấu hình)
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
      {/* Cửa ngõ đăng nhập hệ thống */}
      <Route path="/login" element={<LoginPage />} />

      {/* Vùng hệ thống được bảo vệ */}
      <Route element={<PrivateRoute />}>
        <Route path="/" element={<AdminLayout />}>
          <Route index element={<Navigate to="/dashboard" replace />} />
          <Route path="dashboard" element={<DashboardPage />} />

          {/* Group Route bảo vệ nghiêm ngặt dành riêng cho quyền 'admin' */}
          <Route element={<RoleProtectedRoute allowedRoles={['admin']} />}>
            <Route path="analytics" element={<PlatformAnalytics />} />
            <Route path="ingredients" element={<IngredientsPage />} />
            <Route path="micronutrients" element={<MicronutrientsPage />} />
            
            {/* Quản lý thành viên (User) */}
            <Route path="users" element={<UserListPage />} />

            {/* Quản lý chuyên gia dinh dưỡng (Nutritionist) */}
            <Route path="nutritionists" element={<NutritionistListPage />} />

            {/* Quản lý lịch sử giao dịch (Khớp đường dẫn URL với Sidebar của bạn) */}
            <Route path="transactions" element={<TransactionLogsPage />} />

            {/* Phân hệ quản lý Công thức nấu ăn (Recipes) */}
            <Route path="recipes" element={<RecipesPage />} /> 
            
            {/* Đưa trang static (add) lên trên động (:id) để tránh lỗi route trùng lập */}
            <Route path="recipes/add" element={<AddRecipePage />} />
            <Route path="recipes/edit/:id" element={<EditRecipePage />} />
            
            {/* Đưa trang chi tiết ID xuống dưới cùng */}
            <Route path="recipes/:id" element={<RecipeDetail />} />
            
          </Route>
        </Route>
      </Route>

      {/* Bẫy các router không tồn tại chuyển hướng về trang login */}
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  );
}