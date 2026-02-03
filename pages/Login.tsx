
import React, { useState } from 'react';
import { useApp } from '../App';
import { 
  LogIn, 
  GraduationCap, 
  AlertTriangle, 
  RefreshCw,
  Search,
  Key,
  Mail,
  ExternalLink,
  Info,
  CheckCircle2
} from 'lucide-react';
import { 
  signInWithEmailAndPassword
} from 'firebase/auth';

const Login: React.FC = () => {
  const { auth } = useApp();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isBusy, setIsBusy] = useState(false);
  const [showHelp, setShowHelp] = useState(false);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!auth) {
      setError('O sistema de autenticação não foi inicializado. Verifique a conexão.');
      return;
    }

    setIsBusy(true);
    setError('');
    setShowHelp(false);

    try {
      await signInWithEmailAndPassword(auth, email.trim(), password);
    } catch (err: any) {
      console.error("Login Error Code:", err.code);
      
      if (err.code === 'auth/invalid-credential' || err.code === 'auth/user-not-found') {
        setError('E-mail ou senha incorretos.');
        setShowHelp(true);
      } else if (err.code === 'auth/wrong-password') {
        setError('Senha incorreta.');
      } else if (err.code === 'auth/too-many-requests') {
        setError('Acesso bloqueado temporariamente por muitas tentativas falhas.');
      } else {
        setError('Falha no acesso: ' + (err.code || 'Verifique sua conexão'));
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
          <p className="text-blue-200 mt-2 text-[14px] font-black uppercase tracking-[0.4em] opacity-80">Gestão de Frequência</p>
        </div>
        
        <form onSubmit={handleAuth} className="p-8 space-y-6">
          <div className="space-y-1.5">
            <label className="text-[14px] font-black text-gray-400 uppercase tracking-widest flex items-center">
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
            <label className="text-[14px] font-black text-gray-400 uppercase tracking-widest flex items-center">
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
            <div className="space-y-4">
              <div className="bg-red-50 text-red-600 p-4 rounded-xl text-[14px] font-black uppercase border border-red-100 flex items-start space-x-3 animate-in shake">
                <AlertTriangle size={18} className="shrink-0" />
                <span className="flex-1">{error}</span>
              </div>
              
              {showHelp && (
                <div className="bg-blue-50 border border-blue-100 p-4 rounded-xl animate-in fade-in slide-in-from-top-2 duration-500">
                  <div className="flex items-center space-x-2 text-blue-700 mb-2">
                    <Info size={16} />
                    <span className="text-[14px] font-black uppercase tracking-tighter">Ação Necessária do Administrador:</span>
                  </div>
                  <div className="text-[14px] text-blue-800 font-bold space-y-3 uppercase leading-relaxed">
                    <p className="opacity-80">Você existe no banco de dados (Firestore), mas ainda não possui uma credencial de acesso.</p>
                    <ul className="space-y-2">
                      <li className="flex items-start space-x-2">
                        <CheckCircle2 size={10} className="text-blue-600 mt-0.5" />
                        <span>Acesse o <b>Firebase Console</b></span>
                      </li>
                      <li className="flex items-start space-x-2">
                        <CheckCircle2 size={10} className="text-blue-600 mt-0.5" />
                        <span>Vá em <b>Authentication > Users</b></span>
                      </li>
                      <li className="flex items-start space-x-2">
                        <CheckCircle2 size={10} className="text-blue-600 mt-0.5" />
                        <span>Adicione o e-mail <b>{email || '...'}</b> e uma senha.</span>
                      </li>
                    </ul>
                  </div>
                  <a 
                    href="https://console.firebase.google.com/" 
                    target="_blank" 
                    rel="noreferrer" 
                    className="mt-4 flex items-center justify-center space-x-2 py-2 bg-blue-600 text-white rounded-lg text-[14px] font-black uppercase hover:bg-blue-700 transition-colors shadow-md shadow-blue-500/20"
                  >
                    <span>Abrir Aba Authentication</span>
                    <ExternalLink size={10} />
                  </a>
                </div>
              )}
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

        <div className="p-4 bg-gray-50 text-center text-[14px] text-gray-400 border-t flex flex-col space-y-1 uppercase font-black tracking-tighter">
          <p>© {new Date().getFullYear()} Colégio Estadual São José</p>
          <p className="opacity-50 italic">Ambiente seguro • Dados criptografados</p>
        </div>
      </div>
    </div>
  );
};

export default Login;
