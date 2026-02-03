
import React, { useState } from 'react';
import { useApp } from '../App';
import { User, UserRole } from '../types';
import { Plus, Trash2, Shield, User as UserIcon, Edit2, X, Loader2, Mail } from 'lucide-react';

const UserManagement: React.FC = () => {
  const { state, currentUser, setCurrentUser, persistUser, removeUser } = useApp();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [formData, setFormData] = useState<Partial<User>>({
    fullName: '',
    email: '',
    role: UserRole.PEDAGOGO,
    password: ''
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.fullName || !formData.password || !formData.email) return;
    setBusy(true);

    try {
      const id = editingId || Date.now().toString();
      // Deriva o username automaticamente do email
      const generatedUsername = formData.email.split('@')[0];
      const userData: User = { 
        ...formData, 
        id, 
        username: generatedUsername 
      } as User;
      
      await persistUser(userData);
      
      if (editingId === currentUser?.id) {
        setCurrentUser(userData);
      }
      
      alert(editingId ? 'Usuário atualizado!' : 'Usuário cadastrado!');
      setEditingId(null);
      setFormData({ fullName: '', email: '', role: UserRole.PEDAGOGO, password: '' });
    } catch (err) {
      alert('Erro ao salvar no Firestore.');
    } finally {
      setBusy(false);
    }
  };

  const handleEdit = (user: User) => {
    setEditingId(user.id);
    setFormData({
      fullName: user.fullName,
      email: user.email || '',
      role: user.role,
      password: user.password || ''
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const deleteUser = async (id: string) => {
    if (id === currentUser?.id) {
      alert('Você não pode excluir a si mesmo.');
      return;
    }

    const userToDelete = state.users.find(u => u.id === id);
    if (confirm(`Deseja excluir o usuário ${userToDelete?.fullName}?`)) {
      setBusy(true);
      await removeUser(id);
      setBusy(false);
    }
  };

  return (
    <div className="space-y-6">
      <header>
        <h2 className="text-3xl font-bold text-gray-800">Usuários do Sistema</h2>
        <p className="text-gray-500">Gestão de acessos administrativos</p>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="bg-white p-6 rounded-xl shadow-md border border-gray-200 h-fit sticky top-6">
          <h3 className="text-lg font-bold mb-4 flex items-center">
            {editingId ? <Edit2 size={20} className="mr-2 text-orange-600" /> : <Plus size={20} className="mr-2 text-blue-600" />}
            {editingId ? 'Editar Usuário' : 'Novo Usuário'}
          </h3>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest flex items-center">
                <UserIcon size={12} className="mr-1" /> Nome Completo
              </label>
              <input type="text" required className="w-full border-2 border-gray-100 rounded-xl px-3 py-2 bg-gray-50 text-black outline-none focus:border-blue-500 focus:bg-white transition-all font-bold" value={formData.fullName} onChange={e => setFormData({...formData, fullName: e.target.value})} />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest flex items-center">
                <Mail size={12} className="mr-1" /> E-mail Institucional
              </label>
              <input type="email" required className="w-full border-2 border-gray-100 rounded-xl px-3 py-2 bg-gray-50 text-black outline-none focus:border-blue-500 focus:bg-white transition-all font-bold" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest flex items-center">
                <Shield size={12} className="mr-1" /> Cargo / Perfil
              </label>
              <select className="w-full border-2 border-gray-100 rounded-xl px-3 py-2 bg-gray-50 text-black outline-none focus:border-blue-500 focus:bg-white transition-all font-bold" value={formData.role} onChange={e => setFormData({...formData, role: e.target.value as UserRole})} disabled={editingId === currentUser?.id}>
                <option value={UserRole.ADMIN}>ADMINISTRADOR</option>
                <option value={UserRole.PEDAGOGO}>PEDAGOGO</option>
                <option value={UserRole.DIRETOR}>DIRETOR</option>
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest flex items-center">
                <Shield size={12} className="mr-1" /> Senha de Acesso
              </label>
              <input type="password" required maxLength={12} className="w-full border-2 border-gray-100 rounded-xl px-3 py-2 bg-gray-50 text-black outline-none focus:border-blue-500 focus:bg-white transition-all font-bold" value={formData.password} onChange={e => setFormData({...formData, password: e.target.value})} />
            </div>
            <button disabled={busy} className={`w-full text-white py-4 rounded-xl font-black text-[10px] tracking-widest uppercase flex justify-center items-center shadow-lg transition-all active:scale-95 ${editingId ? 'bg-orange-600 hover:bg-orange-700 shadow-orange-500/20' : 'bg-blue-600 hover:bg-blue-700 shadow-blue-500/20'}`}>
              {busy && <Loader2 className="animate-spin mr-2" size={14} />}
              {editingId ? 'ATUALIZAR DADOS' : 'CADASTRAR NO BANCO'}
            </button>
            {editingId && (
              <button type="button" onClick={() => setEditingId(null)} className="w-full bg-gray-100 text-gray-600 py-3 rounded-xl font-black text-[10px] tracking-widest uppercase mt-2">CANCELAR</button>
            )}
          </form>
        </div>

        <div className="lg:col-span-2 space-y-4">
          {state.users.map(user => (
            <div key={user.id} className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm flex items-center justify-between group hover:border-blue-200 transition-all">
              <div className="flex items-center space-x-4">
                <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center font-black">
                  {user.fullName[0]}
                </div>
                <div>
                  <h4 className="font-bold text-gray-900 leading-tight">{user.fullName}</h4>
                  <p className="text-[10px] text-gray-500 uppercase tracking-widest font-semibold flex items-center mt-1">
                    <Mail size={10} className="mr-1 opacity-50" /> {user.email}
                  </p>
                  <div className="flex items-center mt-1.5 space-x-2">
                    <span className="text-[8px] bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full font-black uppercase tracking-[0.1em]">{user.role}</span>
                  </div>
                </div>
              </div>
              <div className="flex space-x-1">
                <button onClick={() => handleEdit(user)} className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"><Edit2 size={18} /></button>
                <button onClick={() => deleteUser(user.id)} className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"><Trash2 size={18} /></button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default UserManagement;
