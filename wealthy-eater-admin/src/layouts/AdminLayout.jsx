import React from "react";
import { Outlet, useNavigate, NavLink, useLocation } from "react-router-dom";
import { LayoutDashboard, Cherry, Apple, ChefHat, LogOut } from "lucide-react";

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
    <div className="flex h-screen bg-slate-50 overflow-hidden font-sans">
      {/* Sidebar Navigation */}
      <aside className="w-64 bg-white border-r border-slate-200 flex flex-col shadow-sm relative z-10">
        <div className="h-16 flex items-center gap-3 px-6 border-b border-slate-100">
          <div className="text-emerald-500">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
            </svg>
          </div>
          <h3 className="font-bold text-slate-800 tracking-tight">Wealthy Eater</h3>
        </div>
        
        <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-1">
          <NavLink 
            to="/dashboard" 
            className={({ isActive }) => `flex items-center gap-3 px-3 py-2.5 rounded-xl font-medium transition-colors ${isActive ? 'bg-emerald-50 text-emerald-600' : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'}`}
          >
            <LayoutDashboard size={18} />
            <span className="text-sm">Overview</span>
          </NavLink>

          <NavLink 
            to="/ingredients" 
            className={({ isActive }) => `flex items-center gap-3 px-3 py-2.5 rounded-xl font-medium transition-colors ${isActive ? 'bg-emerald-50 text-emerald-600' : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'}`}
          >
            <Apple size={18} />
            <span className="text-sm">Ingredients</span>
          </NavLink>

          <NavLink 
            to="/micronutrients" 
            className={({ isActive }) => `flex items-center gap-3 px-3 py-2.5 rounded-xl font-medium transition-colors ${isActive ? 'bg-emerald-50 text-emerald-600' : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'}`}
          >
            <Cherry size={18} />
            <span className="text-sm">Micronutrients</span>
          </NavLink>

          <NavLink 
            to="/recipes" 
            className={({ isActive }) => `flex items-center gap-3 px-3 py-2.5 rounded-xl font-medium transition-colors ${isActive ? 'bg-emerald-50 text-emerald-600' : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'}`}
          >
            <ChefHat size={18} />
            <span className="text-sm">Recipes</span>
          </NavLink>
        </nav>

        <div className="p-4 border-t border-slate-100">
          <button 
            onClick={logout} 
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium text-slate-600 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 hover:text-red-600 hover:border-red-200 transition-colors"
          >
            <LogOut size={16} />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden relative">
        <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-8 shadow-sm relative z-10">
          <h1 className="text-lg font-semibold text-slate-800">{getTopbarTitle()}</h1>
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold text-xs ring-2 ring-white">
              {user.email.substring(0, 2).toUpperCase()}
            </div>
            <div className="hidden sm:block text-left">
              <div className="text-sm font-semibold text-slate-700 leading-tight">{user.email}</div>
              <div className="text-xs text-slate-500 leading-tight">Administrator</div>
            </div>
          </div>
        </header>

        {/* Dynamic Page Content */}
        <div className="flex-1 overflow-auto bg-slate-50 p-6 md:p-8">
          <div className="max-w-6xl mx-auto">
            <Outlet />
          </div>
        </div>
      </main>
    </div>
  );
}