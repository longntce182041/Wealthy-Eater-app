// import React from "react";
// import { Outlet, useNavigate, NavLink } from "react-router-dom";

// export default function AdminLayout() {
//   const navigate = useNavigate();
//   const raw = localStorage.getItem('admin_user');
//   let user = { email: "admin@wealthyeater.com" };
  
//   try {
//     if (raw) user = JSON.parse(raw);
//   } catch (e) {
//     console.error(e);
//   }

//   function logout() {
//     localStorage.removeItem('admin_session_jwt_token');
//     localStorage.removeItem('admin_user');
//     localStorage.removeItem('userRole');
//     navigate('/login');
//   }

//   return (
//     <div className="dashboard-layout">
//       {/* Sidebar Navigation - Giữ nguyên class và style tối của bạn */}
//       <aside className="sidebar">
//         <div className="sidebar-brand">
//           <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
//             <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
//           </svg>
//           <h3>Wealthy Eater</h3>
//         </div>
        
//         <nav className="sidebar-menu">
//           {/* Mục Overview */}
//           <NavLink to="/dashboard" className={({ isActive }) => isActive ? "menu-item active" : "menu-item"}>
//             <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
//               <rect x="3" y="3" width="7" height="9"></rect>
//               <rect x="14" y="3" width="7" height="5"></rect>
//               <rect x="14" y="12" width="7" height="9"></rect>
//               <rect x="3" y="16" width="7" height="5"></rect>
//             </svg>
//             <span>Overview</span>
//           </NavLink>

//           {/* Mục Manage Ingredients Mới */}
//           <NavLink to="/ingredients" className={({ isActive }) => isActive ? "menu-item active" : "menu-item"}>
//             <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
//               <circle cx="12" cy="12" r="10"></circle>
//               <path d="M12 8v8M8 12h8"></path>
//             </svg>
//             <span>Manage Ingredients</span>
//           </NavLink>

//           {/* Mục Manage Micronutrients Mới */}
//           <NavLink to="/micronutrients" className={({ isActive }) => isActive ? "menu-item active" : "menu-item"}>
//             <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
//               <path d="M22 12h-4l-3 9L9 3l-3 9H2"></path>
//             </svg>
//             <span>Manage Micronutrients</span>
//           </NavLink>
//         </nav>

//         <div className="sidebar-footer">
//           <button onClick={logout} className="logout-btn">
//             <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
//               <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
//               <polyline points="16 17 21 12 16 7"></polyline>
//               <line x1="21" y1="12" x2="9" y2="12"></line>
//             </svg>
//             <span>Sign Out</span>
//           </button>
//         </div>
//       </aside>

//       {/* Main Content Area */}
//       <main className="main-content">
//         <header className="topbar">
//           <h1>Dashboard Overview</h1>
//           <div className="user-profile">
//             <div className="avatar">
//               {user.email.substring(0, 2).toUpperCase()}
//             </div>
//             <div style={{ textAlign: 'left' }}>
//               <div style={{ fontWeight: 700, color: 'var(--text-h)', fontSize: '14px' }}>{user.email}</div>
//               <div style={{ fontSize: '12px', color: 'var(--text)' }}>System Administrator</div>
//             </div>
//           </div>
//         </header>

//         {/* Nơi hiển thị ruột của từng trang khi bấm menu */}
//         <div className="content-body">
//           <Outlet />
//         </div>
//       </main>
//     </div>
//   );
// }
import React from "react";
import { Outlet, useNavigate, NavLink, useLocation } from "react-router-dom";

export default function AdminLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const raw = localStorage.getItem('admin_user');
  let user = { email: "admin@wealthyeater.com" };
  
  try {
    if (raw) user = JSON.parse(raw);
  } catch (e) {
    console.error(e);
  }

  function logout() {
    localStorage.removeItem('admin_session_jwt_token');
    localStorage.removeItem('admin_user');
    localStorage.removeItem('userRole');
    navigate('/login');
  }

  // Hàm tự động đổi tiêu đề Topbar dựa theo URL hiện tại của Router
  const getTopbarTitle = () => {
    switch(location.pathname) {
      case '/dashboard': return 'Dashboard Overview';
      case '/ingredients': return 'Ingredients Management';
      case '/micronutrients': return 'Micronutrients Management';
      case '/recipes': return 'Recipes Management';
      default: return 'Admin Panel';
    }
  };

  return (
    <div className="dashboard-layout">
      {/* Sidebar Navigation */}
      <aside className="sidebar">
        <div className="sidebar-brand">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
          </svg>
          <h3>Wealthy Eater</h3>
        </div>
        
        <nav className="sidebar-menu">
          {/* Mục Overview */}
          <NavLink to="/dashboard" className={({ isActive }) => isActive ? "menu-item active" : "menu-item"}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="3" width="7" height="9"></rect>
              <rect x="14" y="3" width="7" height="5"></rect>
              <rect x="14" y="12" width="7" height="9"></rect>
              <rect x="3" y="16" width="7" height="5"></rect>
            </svg>
            <span>Overview</span>
          </NavLink>

          {/* Mục Manage Ingredients */}
          <NavLink to="/ingredients" className={({ isActive }) => isActive ? "menu-item active" : "menu-item"}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10"></circle>
              <path d="M12 8v8M8 12h8"></path>
            </svg>
            <span>Manage Ingredients</span>
          </NavLink>

          {/* Mục Manage Micronutrients */}
          <NavLink to="/micronutrients" className={({ isActive }) => isActive ? "menu-item active" : "menu-item"}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M22 12h-4l-3 9L9 3l-3 9H2"></path>
            </svg>
            <span>Manage Micronutrients</span>
          </NavLink>

          {/* CHỨC NĂNG UC-71: Thêm mục Manage Recipes vào Sidebar */}
          <NavLink to="/recipes" className={({ isActive }) => isActive ? "menu-item active" : "menu-item"}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path>
            </svg>
            <span>Manage Recipes</span>
          </NavLink>
        </nav>

        <div className="sidebar-footer">
          <button onClick={logout} className="logout-btn">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
              <polyline points="16 17 21 12 16 7"></polyline>
              <line x1="21" y1="12" x2="9" y2="12"></line>
            </svg>
            <span>Sign Out</span>
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="main-content">
        <header className="topbar">
          {/* Tiêu đề tự động thay đổi theo menu tương ứng */}
          <h1>{getTopbarTitle()}</h1>
          <div className="user-profile">
            <div className="avatar">
              {user.email.substring(0, 2).toUpperCase()}
            </div>
            <div style={{ textAlign: 'left' }}>
              <div style={{ fontWeight: 700, color: 'var(--text-h)', fontSize: '14px' }}>{user.email}</div>
              <div style={{ fontSize: '12px', color: 'var(--text)' }}>System Administrator</div>
            </div>
          </div>
        </header>

        {/* Nơi hiển thị nội dung động */}
        <div className="content-body">
          <Outlet />
        </div>
      </main>
    </div>
  );
}