
import React, { useState } from 'react';
import { useApp } from '../App';
import { 
  LogIn, 
  GraduationCap, 
  AlertTriangle, 
  RefreshCw,
  Search,
  Key,
  Mail
} from 'lucide-react';
import { 
  getAuth, 
  signInWithEmailAndPassword
} from 'firebase/auth';

const Login: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isBusy, setIsBusy] = useState(false);

  const auth = getAuth();

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsBusy(true);
    setError('');

    try {
      // Apenas login é permitido agora. Registros são feitos pelo Admin.
      await signInWithEmailAndPassword(auth, email, password);
    } catch (err: any) {
      console.error(err);
      if (err.code === 'auth/user-not-found' || err.code === 'auth/wrong-password' || err.code === 'auth/invalid-credential') {
        setError('E-mail ou senha incorretos.');
      } else if (err.code === 'auth/too-many-requests') {
        setError('Muitas tentativas sem sucesso. Tente novamente mais tarde.');
      } else {
        setError('Ocorreu um erro na autenticação. Verifique sua conexão.');
      }
    } finally {
      setIsBusy(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0a192f] flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-md bg-white rounded-3xl shadow-[0_32px_64px_rgba(0,0,0,0.5)] overflow-hidden relative border border-white/5">
        <div className="bg-gradient-to-br from-blue-700 to-blue-900 p-10 text-white text-center relative overflow-hidden">
          <div className="absolute top-0 right-0 p-4 opacity-10 pointer-events-none">
            <Search size={140} />
          </div>
          <div className="w-20 h-20 bg-white/10 backdrop-blur-md text-white rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-2xl border border-white/20 transform rotate-3 hover:rotate-0 transition-transform duration-500">
            <GraduationCap size={48} />
          </div>
          <h1 className="text-2xl font-black uppercase tracking-tighter leading-none">C.E. São José</h1>
          <p className="text-blue-200 mt-2 text-[10px] font-black uppercase tracking-[0.4em] opacity-80">Gestão de Frequência Cloud</p>
        </div>
        
        <form onSubmit={handleAuth} className="p-8 space-y-6">
          <div className="space-y-1.5">
            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest flex items-center">
              <Mail size={12} className="mr-1" /> E-mail Institucional
            </label>
            <input
              type="email"
              required
              className="w-full bg-gray-50 border-2 border-gray-100 rounded-xl px-4 py-3 outline-none focus:border-blue-500 focus:bg-white transition-all text-gray-900 font-bold"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="seu@email.com"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest flex items-center">
              <Key size={12} className="mr-1" /> Senha de Acesso
            </label>
            <input
              type="password"
              required
              className="w-full bg-gray-50 border-2 border-gray-100 rounded-xl px-4 py-3 outline-none focus:border-blue-500 focus:bg-white transition-all text-gray-900 font-bold"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="••••••••"
            />
          </div>

          {error && (
            <div className="bg-red-50 text-red-600 p-4 rounded-xl text-[10px] font-black uppercase border border-red-100 flex items-start space-x-3 animate-in shake">
              <AlertTriangle size={18} className="shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <button
            type="submit"
            disabled={isBusy}
            className="w-full py-4 rounded-xl font-black text-xs tracking-widest uppercase transition-all flex items-center justify-center space-x-3 shadow-xl bg-blue-600 text-white hover:bg-blue-700 hover:shadow-blue-500/30 transform active:scale-95 disabled:opacity-50"
          >
            {isBusy ? <RefreshCw className="animate-spin" size={18} /> : <LogIn size={18} />}
            <span>Acessar Sistema</span>
          </button>
        </form>

        <div className="p-4 bg-gray-50 text-center text-[9px] text-gray-400 border-t flex flex-col space-y-1 uppercase font-black tracking-tighter">
          <p>© {new Date().getFullYear()} Colégio Estadual São José</p>
          <p className="opacity-50">Acesso Restrito a Colaboradores</p>
        </div>
      </div>
    </div>
  );
};

export default Login;
