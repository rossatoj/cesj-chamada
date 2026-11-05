
import React, { useState, useEffect } from 'react';
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
  ShieldAlert,
  UserMinus,
  FileText as FileIcon,
  Utensils
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
import { AppState, User, UserRole, ClassGroup, Student, AttendanceRecord, MedicalCertificate, StudentDocuments, LateArrival, MerendaRecord } from './types';
import { AppContext, useApp, DBStatus } from './AppContext';
import Dashboard from './pages/Dashboard';
import UserManagement from './pages/UserManagement';
import ClassManagement from './pages/ClassManagement';
import StudentManagement from './pages/StudentManagement';
import AttendanceRecording from './pages/AttendanceRecording';
import ContraturnoRecording from './pages/ContraturnoRecording';
import Reports from './pages/Reports';
import Absentees from './pages/Absentees';
import MedicalCertificates from './pages/MedicalCertificates';
import StudentDocumentsPage from './pages/StudentDocuments';
import LateArrivals from './pages/LateArrivals';
import Merenda from './pages/Merenda';
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
      console.warn("Firebase API Key is missing or invalid.");
      return false;
    }
    
    if (!getApps().length) {
      firebaseApp = initializeApp(firebaseConfig);
    } else {
      firebaseApp = getApp();
    }
    
    // Explicitly initialize services
    db = getFirestore(firebaseApp);
    authInstance = getAuth(firebaseApp);
    
    console.log("Firebase initialized successfully");
    return true;
  } catch (error) {
    console.error("Erro ao inicializar Firebase:", error);
    return false;
  }
};

const isConfigValid = initializeFirebase();

// Componente Sidebar para o Layout
const Sidebar: React.FC<{ isOpen: boolean; toggle: () => void }> = ({ isOpen, toggle }) => {
  const { currentUser, logout } = useApp();
  const location = useLocation();

  const menuItems = [
    { path: '/', label: 'Painel', icon: LayoutDashboard, roles: [UserRole.ADMIN, UserRole.PEDAGOGO, UserRole.DIRETOR, UserRole.AETE] },
    { path: '/frequencia', label: 'Frequência', icon: ClipboardCheck, roles: [UserRole.ADMIN, UserRole.PEDAGOGO, UserRole.DIRETOR, UserRole.AETE] },
    { path: '/atrasados', label: 'Atrasado', icon: ClipboardCheck, roles: [UserRole.ADMIN, UserRole.PEDAGOGO, UserRole.DIRETOR, UserRole.AETE, UserRole.ALUNO] },
    { path: '/contraturno', label: 'Contraturno', icon: ClipboardCheck, roles: [UserRole.ADMIN, UserRole.PEDAGOGO, UserRole.DIRETOR, UserRole.AETE] },
    { path: '/faltosos', label: 'Faltosos', icon: UserMinus, roles: [UserRole.ADMIN, UserRole.PEDAGOGO, UserRole.DIRETOR, UserRole.AETE] },
    { path: '/atestados', label: 'Atestados', icon: FileIcon, roles: [UserRole.ADMIN, UserRole.PEDAGOGO, UserRole.DIRETOR, UserRole.AETE] },
    { path: '/relatorios', label: 'Relatórios', icon: FileText, roles: [UserRole.ADMIN, UserRole.PEDAGOGO, UserRole.DIRETOR, UserRole.AETE] },
    { path: '/turmas', label: 'Turmas', icon: GraduationCap, roles: [UserRole.ADMIN, UserRole.PEDAGOGO, UserRole.DIRETOR] },
    { path: '/alunos', label: 'Alunos', icon: GraduationCap, roles: [UserRole.ADMIN, UserRole.PEDAGOGO, UserRole.DIRETOR] },
    { path: '/documentos', label: 'Documentos', icon: FileIcon, roles: [UserRole.ADMIN] },
    { path: '/usuarios', label: 'Usuários', icon: Users, roles: [UserRole.ADMIN] },
    { path: '/merenda', label: 'Merenda', icon: Utensils, roles: [UserRole.ADMIN, UserRole.DIRETOR, UserRole.MERENDA] },
  ];

  const filteredMenu = menuItems.filter(item => currentUser && item.roles.includes(currentUser.role));

  return (
    <>
      <div className={`fixed inset-0 z-20 bg-black/50 transition-opacity lg:hidden ${isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`} onClick={toggle} />
      <aside className={`fixed inset-y-0 left-0 z-30 w-72 bg-[#0a192f] text-white flex flex-col transition-transform transform lg:translate-x-0 print:hidden ${isOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="flex-shrink-0 flex items-center justify-between p-6 border-b border-white/10">
          <div className="flex items-center space-x-3">
            <div className="bg-blue-600 p-2 rounded-xl">
              <GraduationCap size={24} />
            </div>
            <span className="font-black text-xl tracking-tighter uppercase">C. E. SÃO JOSÉ</span>
          </div>
          <button onClick={toggle} className="lg:hidden text-white/50 hover:text-white">
            <X size={24} />
          </button>
        </div>
        
        <nav className="flex-1 overflow-y-auto p-4 space-y-2 min-h-0 [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:bg-white/20 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-track]:bg-transparent">
          {filteredMenu.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                onClick={() => isOpen && toggle()}
                className={`flex items-center space-x-3 px-4 py-3 rounded-xl font-bold transition-all ${isActive ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/20' : 'text-white/60 hover:text-white hover:bg-white/5'}`}
              >
                <Icon size={20} />
                <span className="text-[15px]">{item.label}</span>
              </Link>
            );
          })}
        </nav>

        <div className="flex-shrink-0 p-4 border-t border-white/10 bg-[#0a192f]">
          <div className="bg-white/5 rounded-2xl p-4 mb-4 border border-white/5">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center font-black">
                {currentUser?.fullName?.[0] || 'U'}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-bold text-[14px] truncate">{currentUser?.fullName}</p>
                <p className="text-[11px] text-white/40 uppercase font-black tracking-widest">{currentUser?.role}</p>
              </div>
            </div>
          </div>
          <button 
            onClick={logout}
            className="w-full flex items-center justify-center space-x-3 px-4 py-3 bg-red-500/10 text-red-400 hover:bg-red-500 hover:text-white rounded-xl font-bold transition-all"
          >
            <LogOut size={20} />
            <span className="text-[15px]">Sair do Sistema</span>
          </button>
        </div>
      </aside>
    </>
  );
};

const App: React.FC = () => {
  const [state, setState] = useState<AppState>({
    users: [],
    classes: [],
    students: [],
    attendance: [],
    certificates: [],
    studentDocuments: [],
    lateArrivals: [],
    merendaRecords: []
  });
  const [loading, setLoading] = useState(true);
  const [dbStatus, setDbStatus] = useState<DBStatus>(isConfigValid ? 'connecting' : 'invalid-api-key');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [currentUser, setCurrentUser] = useState<User | null>(null);

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [lastError, setLastError] = useState<string | null>(null);

  useEffect(() => {
    // Tenta reinicializar caso os singletons estejam vazios
    if (!authInstance || !db) {
      if (!initializeFirebase()) {
        setTimeout(() => {
          setLoading(false);
          setDbStatus('invalid-api-key');
        }, 0);
        return;
      }
    }

    if (!authInstance || !db) {
      setTimeout(() => {
        setLoading(false);
        setDbStatus('error');
      }, 0);
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

    // Fix: Complete truncated onSnapshot for attendance
    const unsubAttendance = onSnapshot(collection(db, 'attendance'), (snapshot) => {
      const attendance = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as AttendanceRecord));
      setState(prev => ({ ...prev, attendance }));
    }, handleError);

    const unsubCertificates = onSnapshot(collection(db, 'certificates'), (snapshot) => {
      const certificates = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as MedicalCertificate));
      setState(prev => ({ ...prev, certificates }));
    }, handleError);

    const unsubStudentDocs = onSnapshot(collection(db, 'studentDocuments'), (snapshot) => {
      const studentDocuments = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as StudentDocuments));
      setState(prev => ({ ...prev, studentDocuments }));
    }, handleError);

    const unsubLateArrivals = onSnapshot(collection(db, 'lateArrivals'), (snapshot) => {
      const lateArrivals = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as LateArrival));
      setState(prev => ({ ...prev, lateArrivals }));
    }, handleError);

    const unsubMerenda = onSnapshot(collection(db, 'merenda'), (snapshot) => {
      const merendaRecords = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as MerendaRecord));
      setState(prev => ({ ...prev, merendaRecords }));
    }, handleError);

    return () => {
      unsubUsers();
      unsubClasses();
      unsubStudents();
      unsubAttendance();
      unsubCertificates();
      unsubStudentDocs();
      unsubLateArrivals();
      unsubMerenda();
    };
  }, [currentUser]);

  const logout = async () => {
    if (authInstance) {
      await signOut(authInstance);
      setCurrentUser(null);
    }
  };

  const persistUser = async (user: User) => {
    if (!db) return;
    await setDoc(doc(db, 'users', user.id), user);
  };

  const removeUser = async (id: string) => {
    if (!db) return;
    await deleteDoc(doc(db, 'users', id));
  };

  const persistClass = async (cls: ClassGroup) => {
    if (!db) return;
    await setDoc(doc(db, 'classes', cls.id), cls);
  };

  const removeClass = async (id: string) => {
    if (!db) return;
    await deleteDoc(doc(db, 'classes', id));
  };

  const persistStudent = async (student: Student) => {
    if (!db) return;
    await setDoc(doc(db, 'students', student.id), student);
  };

  const removeStudent = async (id: string) => {
    if (!db) return;
    await deleteDoc(doc(db, 'students', id));
  };

  const persistAttendance = async (records: AttendanceRecord[]) => {
    if (!db) return;
    const batch = writeBatch(db);
    records.forEach(r => {
      batch.set(doc(db!, 'attendance', r.id), r);
    });
    await batch.commit();
  };

  const persistCertificate = async (cert: MedicalCertificate) => {
    if (!db) return;
    await setDoc(doc(db, 'certificates', cert.id), cert);
  };

  const removeCertificate = async (id: string) => {
    if (!db) return;
    await deleteDoc(doc(db, 'certificates', id));
  };

  const persistStudentDocuments = async (docs: StudentDocuments) => {
    if (!db) return;
    await setDoc(doc(db, 'studentDocuments', docs.id), docs);
  };

  const persistLateArrival = async (late: LateArrival) => {
    if (!db) return;
    await setDoc(doc(db, 'lateArrivals', late.id), late);
  };

  const removeLateArrival = async (id: string) => {
    if (!db) return;
    await deleteDoc(doc(db, 'lateArrivals', id));
  };

  const persistMerendaRecord = async (record: MerendaRecord) => {
    if (!db) {
      setState(prev => ({
        ...prev,
        merendaRecords: prev.merendaRecords.some(r => r.id === record.id)
          ? prev.merendaRecords.map(r => r.id === record.id ? record : r)
          : [...prev.merendaRecords, record]
      }));
      return;
    }
    await setDoc(doc(db, 'merenda', record.id), record);
  };

  const removeMerendaRecord = async (id: string) => {
    if (!db) {
      setState(prev => ({
        ...prev,
        merendaRecords: prev.merendaRecords.filter(r => r.id !== id)
      }));
      return;
    }
    await deleteDoc(doc(db, 'merenda', id));
  };

  const testConnectivity = () => {
    // Firestore status updates are automatically handled by onSnapshot
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center space-y-4">
        <Loader2 className="animate-spin text-blue-600" size={48} />
        <p className="font-black text-gray-400 uppercase tracking-widest text-[13px]">Iniciando Plataforma...</p>
      </div>
    );
  }

  if (!currentUser) {
    return (
      <AppContext.Provider value={{ 
        state, setState, currentUser, setCurrentUser, logout, 
        persistUser, removeUser, persistClass, removeClass, 
        persistStudent, removeStudent, persistAttendance,
        persistCertificate, removeCertificate,
        persistStudentDocuments,
        persistLateArrival, removeLateArrival,
        persistMerendaRecord, removeMerendaRecord,
        loading, dbStatus, lastError, testConnectivity, auth: authInstance
      }}>
        <Login />
      </AppContext.Provider>
    );
  }

  return (
    <AppContext.Provider value={{ 
      state, setState, currentUser, setCurrentUser, logout, 
      persistUser, removeUser, persistClass, removeClass, 
      persistStudent, removeStudent, persistAttendance,
      persistCertificate, removeCertificate,
      persistStudentDocuments,
      persistLateArrival, removeLateArrival,
      persistMerendaRecord, removeMerendaRecord,
      loading, dbStatus, lastError, testConnectivity, auth: authInstance
    }}>
      <MemoryRouter>
        <div className="min-h-screen bg-gray-50 flex">
          <Sidebar isOpen={isSidebarOpen} toggle={() => setIsSidebarOpen(!isSidebarOpen)} />
          
          <main className="flex-1 lg:ml-72 p-4 md:p-8 lg:p-12 print:p-0 print:ml-0">
            <header className="flex items-center justify-between mb-8 lg:hidden print:hidden">
              <div className="flex items-center space-x-2">
                <GraduationCap className="text-blue-600" />
                <span className="font-black text-gray-900">C. E. SÃO JOSÉ</span>
              </div>
              <button onClick={() => setIsSidebarOpen(true)} className="p-2 bg-white rounded-xl border border-gray-100 shadow-sm">
                <Menu />
              </button>
            </header>

            {dbStatus !== 'online' && dbStatus !== 'connecting' && (
              <div className="mb-6 bg-red-50 border border-red-100 p-4 rounded-2xl flex items-center space-x-3 text-red-700">
                <ShieldAlert size={20} />
                <span className="text-[13px] font-black uppercase tracking-tight">
                  {dbStatus === 'invalid-api-key' ? 'Erro: Chave de API inválida no Firebase.' : 
                   dbStatus === 'permission-denied' ? 'Acesso Negado: Verifique as Regras do Firestore.' : 
                   'Erro de Conexão: Verifique seu banco de dados.'}
                </span>
              </div>
            )}

            <Routes>
              <Route path="/" element={
                currentUser.role === UserRole.ALUNO 
                  ? <Navigate to="/atrasados" /> 
                  : currentUser.role === UserRole.MERENDA 
                    ? <Navigate to="/merenda" /> 
                    : <Dashboard />
              } />
              <Route path="/usuarios" element={currentUser.role === UserRole.ADMIN ? <UserManagement /> : <Navigate to="/" />} />
              <Route path="/merenda" element={currentUser.role === UserRole.ADMIN || currentUser.role === UserRole.DIRETOR || currentUser.role === UserRole.MERENDA ? <Merenda /> : <Navigate to="/" />} />
              <Route path="/turmas" element={currentUser.role === UserRole.ADMIN || currentUser.role === UserRole.PEDAGOGO || currentUser.role === UserRole.DIRETOR ? <ClassManagement /> : <Navigate to="/" />} />
              <Route path="/alunos" element={currentUser.role === UserRole.ADMIN || currentUser.role === UserRole.PEDAGOGO || currentUser.role === UserRole.DIRETOR ? <StudentManagement /> : <Navigate to="/" />} />
              <Route path="/documentos" element={currentUser.role === UserRole.ADMIN ? <StudentDocumentsPage /> : <Navigate to="/" />} />
              <Route path="/frequencia" element={currentUser.role === UserRole.ADMIN || currentUser.role === UserRole.PEDAGOGO || currentUser.role === UserRole.DIRETOR || currentUser.role === UserRole.AETE ? <AttendanceRecording /> : <Navigate to="/" />} />
              <Route path="/atrasados" element={currentUser.role === UserRole.ADMIN || currentUser.role === UserRole.PEDAGOGO || currentUser.role === UserRole.DIRETOR || currentUser.role === UserRole.AETE || currentUser.role === UserRole.ALUNO ? <LateArrivals /> : <Navigate to="/" />} />
              <Route path="/contraturno" element={currentUser.role === UserRole.ADMIN || currentUser.role === UserRole.PEDAGOGO || currentUser.role === UserRole.DIRETOR || currentUser.role === UserRole.AETE ? <ContraturnoRecording /> : <Navigate to="/" />} />
              <Route path="/faltosos" element={currentUser.role === UserRole.ADMIN || currentUser.role === UserRole.PEDAGOGO || currentUser.role === UserRole.DIRETOR || currentUser.role === UserRole.AETE ? <Absentees /> : <Navigate to="/" />} />
              <Route path="/atestados" element={currentUser.role === UserRole.ADMIN || currentUser.role === UserRole.PEDAGOGO || currentUser.role === UserRole.DIRETOR || currentUser.role === UserRole.AETE ? <MedicalCertificates /> : <Navigate to="/" />} />
              <Route path="/relatorios" element={currentUser.role === UserRole.ADMIN || currentUser.role === UserRole.PEDAGOGO || currentUser.role === UserRole.DIRETOR || currentUser.role === UserRole.AETE ? <Reports /> : <Navigate to="/" />} />
              <Route path="*" element={currentUser.role === UserRole.MERENDA ? <Navigate to="/merenda" /> : <Navigate to="/" />} />
            </Routes>
          </main>
        </div>
      </MemoryRouter>
    </AppContext.Provider>
  );
};

// Fix: Add the missing default export to satisfy index.tsx import
export default App;
