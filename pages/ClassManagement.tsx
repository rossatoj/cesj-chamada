
import React, { useState } from 'react';
import { useApp } from '../App';
import { Plus, Trash2, Edit2, AlertTriangle } from 'lucide-react';

const ClassManagement: React.FC = () => {
  const { state, setState } = useApp();
  const [name, setName] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    if (editingId) {
      setState(prev => ({
        ...prev,
        classes: prev.classes.map(c => c.id === editingId ? { ...c, name: name.trim() } : c)
      }));
      setEditingId(null);
    } else {
      const newClass = { id: Date.now().toString(), name: name.trim() };
      setState(prev => ({ ...prev, classes: [...prev.classes, newClass] }));
    }
    setName('');
  };

  const deleteClass = (id: string) => {
    const classToDelete = state.classes.find(c => c.id === id);
    if (!classToDelete) return;

    const studentsInClass = state.students.filter(s => s.classId === id);
    
    let confirmMessage = `Tem certeza que deseja excluir a turma "${classToDelete.name}"?`;
    if (studentsInClass.length > 0) {
      confirmMessage = `ATENÇÃO: A turma "${classToDelete.name}" possui ${studentsInClass.length} aluno(s). Se você excluir a turma, esses alunos ficarão sem turma vinculada. Deseja continuar?`;
    }

    if (window.confirm(confirmMessage)) {
      setState(prev => ({
        ...prev,
        classes: prev.classes.filter(c => c.id !== id),
        // Clean up attendance records for this class
        attendance: prev.attendance.filter(a => a.classId !== id),
        // Unassign students from this class
        students: prev.students.map(s => s.classId === id ? { ...s, classId: '' } : s)
      }));
      
      if (editingId === id) {
        setEditingId(null);
        setName('');
      }
    }
  };

  return (
    <div className="space-y-6">
      <header>
        <h2 className="text-3xl font-bold text-gray-800">Gestão de Turmas</h2>
        <p className="text-gray-500">Cadastre e edite as turmas da instituição</p>
      </header>

      <form onSubmit={handleSubmit} className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 flex flex-col md:flex-row gap-4 items-end">
        <div className="flex-1 space-y-2">
          <label className="block text-sm font-semibold text-gray-700">Nome da Turma</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Ex: 6º ANO A"
            className="w-full border rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 outline-none bg-white text-black"
            required
          />
        </div>
        <div className="flex space-x-2">
          <button
            type="submit"
            className="bg-blue-600 text-white px-6 py-2 rounded-lg font-semibold hover:bg-blue-700 transition-colors flex items-center shadow-md"
          >
            {editingId ? <Edit2 size={18} className="mr-2" /> : <Plus size={18} className="mr-2" />}
            {editingId ? 'Atualizar' : 'Cadastrar'}
          </button>
          {editingId && (
            <button
              type="button"
              onClick={() => { setEditingId(null); setName(''); }}
              className="bg-gray-500 text-white px-6 py-2 rounded-lg font-semibold hover:bg-gray-600 transition-colors"
            >
              Cancelar
            </button>
          )}
        </div>
      </form>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {state.classes.map(cls => {
          const studentCount = state.students.filter(s => s.classId === cls.id).length;
          return (
            <div key={cls.id} className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex justify-between items-center group hover:shadow-md transition-shadow">
              <div className="flex-1 min-w-0">
                <h3 className="text-lg font-bold text-gray-800 truncate">{cls.name}</h3>
                <div className="flex items-center text-sm text-gray-500 mt-1">
                  {studentCount > 0 ? (
                    <span className="flex items-center"><Users size={14} className="mr-1"/> {studentCount} Alunos</span>
                  ) : (
                    <span className="text-orange-500 flex items-center font-medium">
                      <AlertTriangle size={14} className="mr-1" /> Sem alunos
                    </span>
                  )}
                </div>
              </div>
              <div className="flex space-x-1">
                <button
                  onClick={() => { setEditingId(cls.id); setName(cls.name); }}
                  className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                  title="Editar Turma"
                >
                  <Edit2 size={18} />
                </button>
                <button
                  onClick={() => deleteClass(cls.id)}
                  className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                  title="Excluir Turma"
                >
                  <Trash2 size={18} />
                </button>
              </div>
            </div>
          );
        })}
        {state.classes.length === 0 && (
          <div className="col-span-full py-12 text-center text-gray-400 bg-white rounded-xl border border-dashed border-gray-300">
            Nenhuma turma cadastrada.
          </div>
        )}
      </div>
    </div>
  );
};

// Internal icon helper
const Users = ({ size, className }: { size: number, className?: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
);

export default ClassManagement;
