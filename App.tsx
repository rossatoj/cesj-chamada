
import React, { useState, useEffect, createContext, useContext } from 'react';
import { MemoryRouter, Routes, Route, Navigate, Link, useLocation } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Users, 
  GraduationCap, 
  ClipboardCheck, 
  FileText, 
  LogOut, 
  Menu, 
  X,
  UserCircle
} from 'lucide-react';
import { AppState, User, UserRole, ClassGroup, Student, AttendanceRecord } from './types';
import Dashboard from './pages/Dashboard';
import UserManagement from './pages/UserManagement';
import ClassManagement from './pages/ClassManagement';
import StudentManagement from './pages/StudentManagement';
import AttendanceRecording from './pages/AttendanceRecording';
import Reports from './pages/Reports';
import Login from './pages/Login';

// Initial dummy data - Classes 6º ANO A and 7º ANO B have been removed as requested.
const INITIAL_STATE: AppState = {
  users: [
    { id: '1', username: 'admlocal', fullName: 'Administrador Local', role: UserRole.ADMIN, password: '@dmlocal' }
  ],
  classes: [],
  students: [],
  attendance: []
};

interface AppContextType {
  state: AppState;
  setState: React.Dispatch<React.SetStateAction<AppState>>;
  currentUser: User | null;
  setCurrentUser: (user: User | null) => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) throw new Error('useApp must be used within AppProvider');
  return context;
};

const App: React.FC = () => {
  const [state, setState] = useState<AppState>(() => {
    const saved = localStorage.getItem('frequencia_app_data');
    return saved ? JSON.parse(saved) : INITIAL_STATE;
  });

  const [currentUser, setCurrentUser] = useState<User | null>(() => {
    const saved = localStorage.getItem('frequencia_current_user');
    return saved ? JSON.parse(saved) : null;
  });

  useEffect(() => {
    localStorage.setItem('frequencia_app_data', JSON.stringify(state));
  }, [state]);

  useEffect(() => {
    localStorage.setItem('frequencia_current_user', JSON.stringify(currentUser));
  }, [currentUser]);

  return (
    <AppContext.Provider value={{ state, setState, currentUser, setCurrentUser }}>
      <MemoryRouter>
        <Routes>
          <Route path="/login" element={!currentUser ? <Login /> : <Navigate to="/" />} />
          <Route path="/*" element={currentUser ? <MainLayout /> : <Navigate to="/login" />} />
        </Routes>
      </MemoryRouter>
    </AppContext.Provider>
  );
};

const MainLayout: React.FC = () => {
  const { currentUser, setCurrentUser } = useApp();
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const location = useLocation();

  const handleLogout = () => {
    setCurrentUser(null);
  };

  const menuItems = [
    { path: '/', label: 'Dashboard', icon: LayoutDashboard, roles: [UserRole.ADMIN, UserRole.PEDAGOGO, UserRole.DIRETOR] },
    { path: '/frequencia', label: 'Frequência', icon: ClipboardCheck, roles: [UserRole.ADMIN, UserRole.PEDAGOGO, UserRole.DIRETOR] },
    { path: '/relatorios', label: 'Relatórios', icon: FileText, roles: [UserRole.ADMIN, UserRole.PEDAGOGO, UserRole.DIRETOR] },
    { path: '/alunos', label: 'Alunos', icon: GraduationCap, roles: [UserRole.ADMIN] },
    { path: '/turmas', label: 'Turmas', icon: GraduationCap, roles: [UserRole.ADMIN] },
    { path: '/usuarios', label: 'Usuários', icon: Users, roles: [UserRole.ADMIN] },
  ];

  const filteredMenuItems = menuItems.filter(item => currentUser && item.roles.includes(currentUser.role));

  return (
    <div className="flex h-screen bg-gray-100 overflow-hidden">
      {/* Mobile Sidebar Toggle */}
      <button 
        className="md:hidden fixed top-4 left-4 z-50 p-2 bg-blue-900 text-white rounded"
        onClick={() => setIsSidebarOpen(!isSidebarOpen)}
      >
        {isSidebarOpen ? <X size={24} /> : <Menu size={24} />}
      </button>

      {/* Sidebar */}
      <aside className={`
        ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}
        fixed md:relative md:translate-x-0 z-40 w-64 h-full bg-blue-900 text-white transition-transform duration-300 ease-in-out
      `}>
        <div className="flex flex-col h-full">
          <div className="p-6 border-b border-blue-800">
            <h1 className="text-xl font-bold tracking-tight text-center">CONTROLE DE FREQUÊNCIA</h1>
            <p className="text-xs text-blue-300 text-center mt-1">Colégio Estadual São José</p>
          </div>

          <nav className="flex-1 overflow-y-auto p-4 space-y-2">
            {filteredMenuItems.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.path;
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`
                    flex items-center space-x-3 p-3 rounded-lg transition-colors
                    ${isActive ? 'bg-blue-700 text-white' : 'hover:bg-blue-800 text-blue-100'}
                  `}
                >
                  <Icon size={20} />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </nav>

          <div className="p-4 border-t border-blue-800 space-y-2">
            <div className="flex items-center space-x-3 px-3 py-2 text-sm text-blue-200">
              <UserCircle size={20} />
              <div className="truncate">
                <p className="font-semibold text-white">{currentUser?.fullName}</p>
                <p className="text-xs">{currentUser?.role}</p>
              </div>
            </div>
            <button
              onClick={handleLogout}
              className="w-full flex items-center space-x-3 p-3 text-red-400 hover:bg-red-900/30 rounded-lg transition-colors"
            >
              <LogOut size={20} />
              <span>Sair</span>
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto p-4 md:p-8">
        <div className="max-w-6xl mx-auto">
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/frequencia" element={<AttendanceRecording />} />
            <Route path="/relatorios" element={<Reports />} />
            <Route path="/alunos" element={<StudentManagement />} />
            <Route path="/turmas" element={<ClassManagement />} />
            <Route path="/usuarios" element={<UserManagement />} />
          </Routes>
        </div>
      </main>
    </div>
  );
};

export default App;
