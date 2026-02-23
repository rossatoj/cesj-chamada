
import React, { useState } from 'react';
import { useApp } from '../AppContext';
import { Plus, Trash2, Edit2, Loader2, Users as UsersIcon } from 'lucide-react';

const ClassManagement: React.FC = () => {
  const { state, persistClass, removeClass } = useApp();
  const [name, setName] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setBusy(true);

    try {
      const id = editingId || Date.now().toString();
      await persistClass({ id, name: name.trim() });
      setName('');
      setEditingId(null);
    } catch {
      alert('Erro ao salvar turma.');
    } finally {
      setBusy(false);
    }
  };

  const handleDelete = async (id: string) => {
    const cls = state.classes.find(c => c.id === id);
    
    // VERIFICAÇÃO DE SEGURANÇA: Impede exclusão se houver alunos
    const studentsInClass = state.students.filter(s => s.classId === id);
    if (studentsInClass.length > 0) {
      alert(`ERRO: A turma "${cls?.name}" possui ${studentsInClass.length} aluno(s) cadastrado(s).\n\nPara excluir esta turma, você deve primeiro remover ou transferir todos os alunos vinculados a ela.`);
      return;
    }

    if (confirm(`Deseja realmente excluir a turma ${cls?.name}?`)) {
      setBusy(true);
      try {
        await removeClass(id);
      } catch {
        alert('Erro ao excluir a turma do banco de dados.');
      } finally {
        setBusy(false);
      }
    }
  };

  return (
    <div className="space-y-6">
      <header>
        <h2 className="text-3xl font-bold text-gray-800">Gestão de Turmas</h2>
        <p className="text-gray-500">Armazenamento persistente no Google Cloud Firestore</p>
      </header>

      <form onSubmit={handleSubmit} className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 flex flex-col md:flex-row gap-4 items-end">
        <div className="flex-1 space-y-2">
          <label className="block text-[15px] font-semibold text-gray-700">Nome da Turma</label>
          <input type="text" value={name} onChange={e => setName(e.target.value)} placeholder="Ex: 6º ANO A" className="w-full border rounded-lg px-4 py-2 outline-none bg-white text-black text-[15px]" required />
        </div>
        <button disabled={busy} type="submit" className="bg-blue-600 text-white px-6 py-2 rounded-lg font-semibold flex items-center text-[15px]">
          {busy ? <Loader2 className="animate-spin mr-2" size={18} /> : (editingId ? <Edit2 size={18} className="mr-2" /> : <Plus size={18} className="mr-2" />)}
          {editingId ? 'Atualizar' : 'Cadastrar'}
        </button>
      </form>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {state.classes.map(cls => (
          <div key={cls.id} className="bg-white p-6 rounded-xl border border-gray-100 flex justify-between items-center group shadow-sm hover:shadow-md transition-all">
            <div className="flex-1 min-w-0">
              <h3 className="text-lg font-bold text-gray-800 truncate">{cls.name}</h3>
              <span className="text-[15px] text-gray-500 flex items-center mt-1">
                <UsersIcon size={14} className="mr-1" /> {state.students.filter(s => s.classId === cls.id).length} Alunos
              </span>
            </div>
            <div className="flex space-x-1">
              <button onClick={() => { setEditingId(cls.id); setName(cls.name); }} className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"><Edit2 size={18} /></button>
              <button onClick={() => handleDelete(cls.id)} className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"><Trash2 size={18} /></button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default ClassManagement;
