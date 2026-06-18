import { Outlet, useNavigate, NavLink, useLocation } from "react-router-dom";
import { 
  LayoutDashboard, 
  BarChart3, 
  Database, 
  FlaskConical, 
  BookOpen, 
  LogOut,
  UtensilsCrossed,
  Users,
  UserCheck
} from "lucide-react";
import { useSessionGuard } from "../hooks/useSessionGuard";
import SessionExpiredModal from "../components/common/SessionExpiredModal";

export default function AdminLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const { isExpired, handleDismiss } = useSessionGuard();
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

  // 🆕 2. Thêm tiêu đề hiển thị ở Topbar khi bấm vào trang Users
  const getTopbarTitle = () => {
    switch(location.pathname) {
      case '/dashboard': return 'Dashboard Overview';
      case '/analytics': return 'Platform Analytics';
      case '/ingredients': return 'Ingredients Management';
      case '/micronutrients': return 'Micronutrients Management';
      case '/users': return 'Users Management'; 
      case '/nutritionists': return 'Nutritionists Directory';
      case '/recipes': return 'Recipes Management';
      default: return 'Admin Panel';
    }
  };

  // 🆕 3. Thêm mục điều hướng '/users' vào danh sách Menu Sidebar
  const navItems = [
    { path: '/dashboard', icon: LayoutDashboard, label: 'Overview' },
    { path: '/analytics', icon: BarChart3, label: 'Platform Analytics' },
    { path: '/ingredients', icon: Database, label: 'Manage Ingredients' },
    { path: '/micronutrients', icon: FlaskConical, label: 'Manage Micronutrients' },
    { path: '/users', icon: Users, label: 'Manage Users' }, 
    { path: '/nutritionists', icon: UserCheck, label: 'Manage Nutritionists' },
    { path: '/recipes', icon: BookOpen, label: 'Manage Recipes' },
  ];

  return (
    <div className="flex min-h-screen bg-slate-50 font-sans text-slate-900">
      
      {/* Sidebar Navigation */}
      <aside className="w-64 fixed inset-y-0 left-0 bg-white border-r border-slate-200 z-50 flex flex-col shadow-sm">
        <div className="h-16 flex items-center px-6 border-b border-slate-100">
          <UtensilsCrossed className="w-6 h-6 text-primary mr-3" />
          <h3 className="text-lg font-bold text-slate-800 tracking-tight">Wealthy Eater</h3>
        </div>
        
        <nav className="flex-1 overflow-y-auto py-6 px-4 space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink 
                key={item.path}
                to={item.path} 
                className={({ isActive }) => 
                  `flex items-center px-3 py-2.5 rounded-lg text-sm font-medium transition-colors duration-200 ${
                    isActive 
                      ? 'bg-primary/10 text-primary' 
                      : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                  }`
                }
              >
                <Icon className="w-5 h-5 mr-3 flex-shrink-0" />
                <span>{item.label}</span>
              </NavLink>
            );
          })}
        </nav>

        <div className="p-4 border-t border-slate-100">
          <button 
            onClick={logout} 
            className="flex items-center w-full px-3 py-2.5 rounded-lg text-sm font-medium text-red-600 hover:bg-red-50 transition-colors duration-200"
          >
            <LogOut className="w-5 h-5 mr-3 flex-shrink-0" />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 ml-64 flex flex-col min-h-screen">
        
        {/* Topbar */}
        <header className="h-16 bg-white/80 backdrop-blur-md border-b border-slate-200 sticky top-0 z-40 flex items-center justify-between px-8 shadow-sm">
          <h1 className="text-xl font-semibold text-slate-800">
            {getTopbarTitle()}
          </h1>
          
          <div className="flex items-center gap-3">
            <div className="text-right hidden sm:block">
              <div className="text-sm font-bold text-slate-900">{user.email}</div>
              <div className="text-xs text-slate-500 font-medium">System Administrator</div>
            </div>
            <div className="w-9 h-9 rounded-full bg-primary/20 text-primary-hover flex items-center justify-center font-bold text-sm border border-primary/30 shadow-sm">
              {user.email.substring(0, 2).toUpperCase()}
            </div>
          </div>
        </header>

        {/* Dynamic Page Content */}
        <div className="p-8 flex-1">
          <Outlet />
        </div>
      </main>

      {/* Global Session Expired Modal */}
      <SessionExpiredModal isOpen={isExpired} onDismiss={handleDismiss} />
      
    </div>
  );
}