
import React, { useState } from 'react';
import { useApp } from '../App';
import { LogIn, GraduationCap } from 'lucide-react';

const Login: React.FC = () => {
  const { state, setCurrentUser } = useApp();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    const user = state.users.find(u => u.username === username && u.password === password);
    
    if (user) {
      setCurrentUser(user);
    } else {
      setError('Usuário ou senha inválidos.');
    }
  };

  return (
    <div className="min-h-screen bg-blue-900 flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl overflow-hidden">
        <div className="bg-blue-700 p-8 text-white text-center">
          <div className="w-20 h-20 bg-white text-blue-700 rounded-full flex items-center justify-center mx-auto mb-4 shadow-inner">
            <GraduationCap size={48} />
          </div>
          <h1 className="text-2xl font-bold uppercase tracking-wider">CONTROLE DE FREQUÊNCIA</h1>
          <p className="text-blue-100 mt-1">Colégio Estadual São José</p>
        </div>
        
        <form onSubmit={handleLogin} className="p-8 space-y-6">
          <div className="space-y-1">
            <label className="text-sm font-semibold text-gray-600 uppercase">Usuário</label>
            <input
              type="text"
              required
              className="w-full border-b-2 border-gray-200 px-3 py-2 outline-none focus:border-blue-500 transition-colors bg-white text-black"
              value={username}
              onChange={e => setUsername(e.target.value)}
              placeholder="Digite seu login"
            />
          </div>

          <div className="space-y-1">
            <label className="text-sm font-semibold text-gray-600 uppercase">Senha</label>
            <input
              type="password"
              required
              className="w-full border-b-2 border-gray-200 px-3 py-2 outline-none focus:border-blue-500 transition-colors bg-white text-black"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="••••••••"
            />
          </div>

          {error && <p className="text-red-500 text-sm font-medium">{error}</p>}

          <button
            type="submit"
            className="w-full bg-blue-700 text-white py-3 rounded-lg font-bold hover:bg-blue-800 transition-colors flex items-center justify-center space-x-2 shadow-lg"
          >
            <LogIn size={20} />
            <span>ENTRAR</span>
          </button>
        </form>

        <div className="p-4 bg-gray-50 text-center text-xs text-gray-400">
          © {new Date().getFullYear()} Colégio Estadual São José - Sistema de Gestão Escolar
        </div>
      </div>
    </div>
  );
};

export default Login;
