
import React, { useState } from 'react';
import { useApp } from '../App';
import { User, UserRole } from '../types';
import { Plus, Trash2, Shield, User as UserIcon, Edit2, X } from 'lucide-react';

const UserManagement: React.FC = () => {
  const { state, setState, currentUser, setCurrentUser } = useApp();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState<Partial<User>>({
    username: '',
    fullName: '',
    role: UserRole.PEDAGOGO,
    password: ''
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.username || !formData.password) return;

    if (editingId) {
      // Update existing user
      setState(prev => {
        const updatedUsers = prev.users.map(u => 
          u.id === editingId ? { ...u, ...formData } as User : u
        );
        
        // If the edited user is the current logged-in user, update their session too
        const updatedSelf = updatedUsers.find(u => u.id === editingId);
        if (updatedSelf && currentUser?.id === editingId) {
          setCurrentUser(updatedSelf);
        }
        
        return { ...prev, users: updatedUsers };
      });
      alert('Usuário atualizado com sucesso!');
      setEditingId(null);
    } else {
      // Create new user
      const newUser: User = {
        ...formData,
        id: Date.now().toString(),
      } as User;
      setState(prev => ({ ...prev, users: [...prev.users, newUser] }));
      alert('Usuário cadastrado com sucesso!');
    }
    
    setFormData({ username: '', fullName: '', role: UserRole.PEDAGOGO, password: '' });
  };

  const handleEdit = (user: User) => {
    setEditingId(user.id);
    setFormData({
      username: user.username,
      fullName: user.fullName,
      role: user.role,
      password: user.password || ''
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setFormData({ username: '', fullName: '', role: UserRole.PEDAGOGO, password: '' });
  };

  const deleteUser = (id: string) => {
    const userToDelete = state.users.find(u => u.id === id);
    
    // We used to block admlocal strictly, but now the user can change the username.
    // Let's keep a safeguard so at least one ADMIN always exists or just protect the current session.
    if (id === currentUser?.id) {
      alert('Você não pode excluir a si mesmo enquanto estiver logado.');
      return;
    }

    const admins = state.users.filter(u => u.role === UserRole.ADMIN);
    if (userToDelete?.role === UserRole.ADMIN && admins.length <= 1) {
      alert('O sistema deve ter pelo menos um administrador.');
      return;
    }

    if (confirm(`Deseja realmente excluir o usuário ${userToDelete?.fullName}?`)) {
      setState(prev => ({ ...prev, users: prev.users.filter(u => u.id !== id) }));
    }
  };

  return (
    <div className="space-y-6">
      <header>
        <h2 className="text-3xl font-bold text-gray-800">Usuários do Sistema</h2>
        <p className="text-gray-500">Gestão de acessos para Administradores, Pedagogos e Diretores</p>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Registration/Edit Form */}
        <div className="bg-white p-6 rounded-xl shadow-md border border-gray-200 h-fit sticky top-6">
          <h3 className="text-lg font-bold mb-4 flex items-center">
            {editingId ? (
              <><Edit2 size={20} className="mr-2 text-orange-600" /> Editar Usuário</>
            ) : (
              <><Plus size={20} className="mr-2 text-blue-600" /> Novo Usuário</>
            )}
          </h3>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1">
              <label className="text-sm font-semibold">Nome de Usuário (Login)</label>
              <input
                type="text"
                required
                className="w-full border rounded-lg px-3 py-2 bg-white text-black focus:ring-2 focus:ring-blue-500 outline-none"
                value={formData.username}
                onChange={e => setFormData({...formData, username: e.target.value})}
              />
            </div>
            <div className="space-y-1">
              <label className="text-sm font-semibold">Nome Completo</label>
              <input
                type="text"
                required
                className="w-full border rounded-lg px-3 py-2 bg-white text-black focus:ring-2 focus:ring-blue-500 outline-none"
                value={formData.fullName}
                onChange={e => setFormData({...formData, fullName: e.target.value})}
              />
            </div>
            <div className="space-y-1">
              <label className="text-sm font-semibold">Cargo</label>
              <select
                className="w-full border rounded-lg px-3 py-2 bg-white text-black focus:ring-2 focus:ring-blue-500 outline-none"
                value={formData.role}
                onChange={e => setFormData({...formData, role: e.target.value as UserRole})}
                disabled={editingId === currentUser?.id && currentUser?.role === UserRole.ADMIN} // Prevents admin from demoting themselves by accident
              >
                <option value={UserRole.ADMIN}>ADMINISTRADOR</option>
                <option value={UserRole.PEDAGOGO}>PEDAGOGO</option>
                <option value={UserRole.DIRETOR}>DIRETOR</option>
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-sm font-semibold">Senha (Letras e Números, máx 12)</label>
              <input
                type="password"
                required
                maxLength={12}
                pattern="[A-Za-z0-9]+"
                className="w-full border rounded-lg px-3 py-2 bg-white text-black focus:ring-2 focus:ring-blue-500 outline-none"
                value={formData.password}
                onChange={e => setFormData({...formData, password: e.target.value})}
              />
            </div>
            <div className="flex flex-col space-y-2">
              <button className={`w-full text-white py-2 rounded-lg font-bold transition-colors ${editingId ? 'bg-orange-600 hover:bg-orange-700' : 'bg-blue-600 hover:bg-blue-700'}`}>
                {editingId ? 'ATUALIZAR DADOS' : 'CADASTRAR'}
              </button>
              {editingId && (
                <button 
                  type="button"
                  onClick={cancelEdit}
                  className="w-full bg-gray-100 text-gray-600 py-2 rounded-lg font-bold hover:bg-gray-200 flex items-center justify-center"
                >
                  <X size={16} className="mr-1" /> CANCELAR EDIÇÃO
                </button>
              )}
            </div>
          </form>
        </div>

        {/* User List */}
        <div className="lg:col-span-2 space-y-4">
          {state.users.map(user => (
            <div key={user.id} className={`bg-white p-5 rounded-xl border shadow-sm flex items-center justify-between transition-all ${editingId === user.id ? 'border-orange-500 ring-1 ring-orange-500 bg-orange-50/30' : 'border-gray-200'}`}>
              <div className="flex items-center space-x-4">
                <div className={`p-3 rounded-full ${user.role === UserRole.ADMIN ? 'bg-purple-100 text-purple-600' : 'bg-blue-100 text-blue-600'}`}>
                  {user.role === UserRole.ADMIN ? <Shield size={24} /> : <UserIcon size={24} />}
                </div>
                <div>
                  <h4 className="font-bold text-gray-900 flex items-center">
                    {user.fullName}
                    {user.id === currentUser?.id && (
                      <span className="ml-2 px-2 py-0.5 bg-blue-100 text-blue-700 text-[10px] rounded-full uppercase font-bold tracking-tighter">Você</span>
                    )}
                  </h4>
                  <p className="text-sm text-gray-500">@{user.username} • {user.role}</p>
                </div>
              </div>
              <div className="flex items-center space-x-1">
                <button 
                  onClick={() => handleEdit(user)}
                  className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                  title="Editar Usuário"
                >
                  <Edit2 size={20} />
                </button>
                <button 
                  onClick={() => deleteUser(user.id)}
                  className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                  title="Excluir Usuário"
                >
                  <Trash2 size={20} />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default UserManagement;
