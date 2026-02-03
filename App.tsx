
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
  Loader2,
  ShieldCheck,
  ShieldAlert,
  CloudOff
} from 'lucide-react';
import { initializeApp, getApp, getApps, FirebaseApp } from 'firebase/app';
import { 
  getFirestore, 
  collection, 
  onSnapshot, 
  doc, 
  setDoc, 
  deleteDoc, 
  writeBatch,
  getDoc,
  getDocs,
  query,
  where,
  Firestore
} from 'firebase/firestore';
import { 
  getAuth, 
  onAuthStateChanged, 
  signOut,
  Auth
} from 'firebase/auth';
import { AppState, User, UserRole, ClassGroup, Student, AttendanceRecord } from './types';
import Dashboard from './pages/Dashboard';
import UserManagement from './pages/UserManagement';
import ClassManagement from './pages/ClassManagement';
import StudentManagement from './pages/StudentManagement';
import AttendanceRecording from './pages/AttendanceRecording';
import Reports from './pages/Reports';
import Login from './pages/Login';

// Configuração extraída do ambiente
const firebaseConfig = {
  apiKey: "AIzaSyAefNxDGFVVT2plCFL-TaJ8g9EdZ7k2o-E",
  authDomain: "gen-lang-client-0816129587.firebaseapp.com",
  projectId: "gen-lang-client-0816129587",
  storageBucket: "gen-lang-client-0816129587.firebasestorage.app",
  messagingSenderId: "348423581976",
  appId: "1:348423581976:web:e9cbcef543ec1f82f66e6d"
};

// Singleton para serviços
let firebaseApp: FirebaseApp | null = null;
let db: Firestore | null = null;
let authInstance: Auth | null = null;

const initializeFirebase = () => {
  try {
    if (!firebaseConfig.apiKey || firebaseConfig.apiKey === 'undefined' || firebaseConfig.apiKey === '[API_KEY]') {
      return false;
    }
    
    if (!getApps().length) {
      firebaseApp = initializeApp(firebaseConfig);
    } else {
      firebaseApp = getApp();
    }
    db = getFirestore(firebaseApp);
    authInstance = getAuth(firebaseApp);
    return true;
  } catch (error) {
    console.error("Erro ao inicializar Firebase:", error);
    return false;
  }
};

const isConfigValid = initializeFirebase();

export type DBStatus = 'connecting' | 'online' | 'permission-denied' | 'error' | 'invalid-api-key';

interface AppContextType {
  state: AppState;
  setState: React.Dispatch<React.SetStateAction<AppState>>;
  currentUser: User | null;
  setCurrentUser: (user: User | null) => void;
  logout: () => Promise<void>;
  persistUser: (user: User) => Promise<void>;
  removeUser: (id: string) => Promise<void>;
  persistClass: (cls: ClassGroup) => Promise<void>;
  removeClass: (id: string) => Promise<void>;
  persistStudent: (student: Student) => Promise<void>;
  removeStudent: (id: string) => Promise<void>;
  persistAttendance: (records: AttendanceRecord[]) => Promise<void>;
  loading: boolean;
  dbStatus: DBStatus;
  lastError: string | null;
  testConnectivity: () => void;
  auth: Auth | null;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) throw new Error('useApp must be used within AppProvider');
  return context;
};

const App: React.FC = () => {
  const [state, setState] = useState<AppState>({
    users: [],
    classes: [],
    students: [],
    attendance: []
  });
  const [loading, setLoading] = useState(true);
  const [dbStatus, setDbStatus] = useState<DBStatus>(isConfigValid ? 'connecting' : 'invalid-api-key');
  const [lastError, setLastError] = useState<string | null>(null);
  const [currentUser, setCurrentUser] = useState<User | null>(null);

  useEffect(() => {
    if (!authInstance || !db) {
      setLoading(false);
      return;
    }

    const unsubscribeAuth = onAuthStateChanged(authInstance, async (firebaseUser) => {
      if (firebaseUser) {
        try {
          if (db) {
            const userDoc = await getDoc(doc(db, 'users', firebaseUser.uid));
            if (userDoc.exists()) {
              setCurrentUser({ id: firebaseUser.uid, ...userDoc.data() } as User);
            } else {
              const q = query(collection(db, 'users'), where('email', '==', firebaseUser.email));
              const querySnapshot = await getDocs(q);
              
              if (!querySnapshot.empty) {
                const docFound = querySnapshot.docs[0];
                setCurrentUser({ id: docFound.id, ...docFound.data() } as User);
              } else {
                setCurrentUser({ 
                  id: firebaseUser.uid, 
                  username: firebaseUser.email?.split('@')[0] || 'user', 
                  fullName: firebaseUser.displayName || 'Usuário Autenticado',
                  email: firebaseUser.email || '',
                  role: UserRole.PEDAGOGO 
                });
              }
            }
          }
        } catch (error) {
          console.error("Erro ao recuperar perfil:", error);
        }
      } else {
        setCurrentUser(null);
      }
      setLoading(false);
    }, (error) => {
      console.error("Auth error:", error);
      if (error.message.toLowerCase().includes('api key')) setDbStatus('invalid-api-key');
      setLoading(false);
    });

    return () => unsubscribeAuth();
  }, []);

  useEffect(() => {
    if (!currentUser || !db) return;

    const handleError = (error: any) => {
      console.error("Firestore error:", error);
      if (error.code === 'permission-denied') setDbStatus('permission-denied');
      else if (error.message?.toLowerCase().includes('api key')) setDbStatus('invalid-api-key');
      else setDbStatus('error');
    };

    const unsubUsers = onSnapshot(collection(db, 'users'), (snapshot) => {
      const users = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as User));
      setState(prev => ({ ...prev, users }));
      setDbStatus('online');
    }, handleError);

    const unsubClasses = onSnapshot(collection(db, 'classes'), (snapshot) => {
      const classes = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as ClassGroup));
      setState(prev => ({ ...prev, classes }));
    }, handleError);

    const unsubStudents = onSnapshot(collection(db, 'students'), (snapshot) => {
      const students = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Student));
      setState(prev => ({ ...prev, students }));
    }, handleError);

    const unsubAttendance = onSnapshot(collection(db, 'attendance'), (snapshot) => {
      const attendance = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as AttendanceRecord));
      setState(prev => ({ ...prev, attendance }));
    }, handleError);

    return () => {
      unsubUsers(); unsubClasses(); unsubStudents(); unsubAttendance();
    };
  }, [currentUser]);

  const logout = async () => {
    if (authInstance) await signOut(authInstance);
    setCurrentUser(null);
  };

  const persistUser = async (user: User) => { if (db) { const { id, ...data } = user; await setDoc(doc(db, 'users', id), data); } };
  const removeUser = async (id: string) => { if (db) await deleteDoc(doc(db, 'users', id)); };
  const persistClass = async (cls: ClassGroup) => { if (db) { const { id, ...data } = cls; await setDoc(doc(db, 'classes', id), data); } };
  const removeClass = async (id: string) => { if (db) await deleteDoc(doc(db, 'classes', id)); };
  const persistStudent = async (student: Student) => { if (db) { const { id, ...data } = student; await setDoc(doc(db, 'students', id), data); } };
  const removeStudent = async (id: string) => { if (db) await deleteDoc(doc(db, 'students', id)); };
  
  const persistAttendance = async (records: AttendanceRecord[]) => {
    if (!db) return;
    const batch = writeBatch(db);
    records.forEach(record => {
      if (db) {
        const ref = doc(db, 'attendance', record.id);
        const { id, ...data } = record;
        batch.set(ref, data);
      }
    });
    await batch.commit();
  };

  const testConnectivity = () => window.location.reload();

  if (dbStatus === 'invalid-api-key') {
    return (
      <div className="h-screen w-screen flex flex-col items-center justify-center bg-[#0a192f] text-white p-8 text-center">
        <div className="w-20 h-20 bg-red-500/20 rounded-2xl flex items-center justify-center mb-6 border border-red-500/50 shadow-[0_0_30px_rgba(239,68,68,0.2)]">
          <ShieldAlert size={40} className="text-red-500" />
        </div>
        <h2 className="text-2xl font-black tracking-tight uppercase mb-2">Chave de API Inválida</h2>
        <p className="text-blue-200 text-base max-w-sm mb-8 leading-relaxed opacity-80">
          O Firebase não pôde ser inicializado. Verifique as configurações de ambiente.
        </p>
        <button onClick={testConnectivity} className="px-10 py-4 bg-blue-600 hover:bg-blue-50 rounded-xl font-bold uppercase tracking-widest text-[14px] transition-all shadow-xl shadow-blue-500/20 active:scale-95">
          Reiniciar Aplicação
        </button>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="h-screen w-screen flex flex-col items-center justify-center bg-[#0a192f] text-white p-4 text-center">
        <Loader2 className="animate-spin mb-4 text-blue-500" size={48} />
        <h2 className="text-xl font-black tracking-widest uppercase">C.E. São José</h2>
        <p className="text-blue-300 text-[14px] mt-2 max-w-xs italic uppercase tracking-[0.2em] opacity-50">Sincronizando Dados...</p>
      </div>
    );
  }

  return (
    <AppContext.Provider value={{ 
      state, setState, currentUser, setCurrentUser, logout,
      persistUser, removeUser, persistClass, removeClass, 
      persistStudent, removeStudent, persistAttendance,
      loading, dbStatus, lastError,
      testConnectivity,
      auth: authInstance
    }}>
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
  const { currentUser, logout, dbStatus } = useApp();
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const location = useLocation();

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
    <div className="flex h-screen bg-gray-100 overflow-hidden text-black">
      <button className="md:hidden fixed top-4 left-4 z-50 p-2 bg-blue-900 text-white rounded shadow-lg" onClick={() => setIsSidebarOpen(!isSidebarOpen)}>
        {isSidebarOpen ? <X size={24} /> : <Menu size={24} />}
      </button>

      <aside className={`${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'} fixed md:relative md:translate-x-0 z-40 w-64 h-full bg-[#0a192f] text-white transition-transform duration-300 ease-in-out shadow-2xl`}>
        <div className="flex flex-col h-full">
          <div className="p-6 border-b border-blue-800/30 text-center">
            <h1 className="text-xl font-black tracking-tighter uppercase leading-tight">C.E. São José</h1>
            <p className="text-[14px] text-blue-400 mt-1 uppercase tracking-[0.3em] font-bold">Registro de Frequência</p>
          </div>

          <nav className="flex-1 overflow-y-auto p-4 space-y-2">
            {filteredMenuItems.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.path;
              return (
                <Link key={item.path} to={item.path} className={`flex items-center space-x-3 p-3 rounded-xl transition-all ${isActive ? 'bg-blue-600 shadow-lg shadow-blue-500/20 text-white' : 'hover:bg-blue-800/40 text-blue-100/60 hover:text-white'}`}>
                  <Icon size={18} />
                  <span className="font-bold text-[14px] uppercase tracking-widest">{item.label}</span>
                </Link>
              );
            })}
          </nav>

          <div className="p-4 border-t border-blue-800/30 bg-black/20">
            <div className="flex items-center space-x-3 px-3 py-2 text-base text-blue-200 mb-4">
              <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-white font-black text-[14px]">
                {currentUser?.fullName[0]}
              </div>
              <div className="truncate">
                <p className="font-bold text-white text-[14px] uppercase">{currentUser?.fullName}</p>
                <div className="flex items-center text-[14px] uppercase tracking-widest opacity-60">
                  <ShieldCheck size={14} className="mr-1 text-green-400" />
                  {currentUser?.role}
                </div>
              </div>
            </div>
            
            <div className={`mb-4 px-3 py-1.5 rounded-lg flex items-center space-x-2 text-[14px] font-black uppercase tracking-widest ${dbStatus === 'online' ? 'bg-green-500/10 text-green-400' : 'bg-red-500/10 text-red-400'}`}>
              <div className={`w-1.5 h-1.5 rounded-full ${dbStatus === 'online' ? 'bg-green-400' : 'bg-red-400'}`} />
              <span>{dbStatus === 'online' ? 'Online' : 'Offline'}</span>
            </div>

            <button onClick={logout} className="w-full flex items-center space-x-3 p-3 text-red-400 hover:bg-red-900/40 rounded-xl transition-all font-black uppercase text-[14px] tracking-widest">
              <LogOut size={16} />
              <span>Sair</span>
            </button>
          </div>
        </div>
      </aside>

      <main className="flex-1 overflow-y-auto p-4 md:p-8 relative">
        <div className="max-w-6xl mx-auto">
          {dbStatus === 'permission-denied' && (
            <div className="mb-6 bg-red-50 border-2 border-red-200 p-4 rounded-2xl text-red-700 flex items-start shadow-lg">
              <CloudOff className="mr-3 shrink-0 mt-0.5 text-red-600" />
              <div>
                <p className="font-black uppercase text-base tracking-tighter mb-1">Acesso ao Banco Negado</p>
                <p className="text-[14px] font-bold opacity-80 uppercase">Verifique as regras de segurança do seu Firestore Console.</p>
              </div>
            </div>
          )}
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
