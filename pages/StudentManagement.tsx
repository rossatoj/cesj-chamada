
import React, { useState } from 'react';
import { useApp } from '../App';
import { Student, StudentStatus } from '../types';
import { Plus, Trash2, Edit2, Upload, Users, AlertTriangle } from 'lucide-react';

// This component handles the management of students, including importing via text files.
const StudentManagement: React.FC = () => {
  const { state, setState } = useApp();
  const [formData, setFormData] = useState<Partial<Student>>({
    fullName: '',
    cgm: '',
    birthDate: '',
    status: StudentStatus.MATRICULADO,
    classId: ''
  });
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.classId || !formData.fullName) {
      alert('Preencha os campos obrigatórios.');
      return;
    }

    if (editingId) {
      setState(prev => ({
        ...prev,
        students: prev.students.map(s => s.id === editingId ? { ...s, ...formData } as Student : s)
      }));
      setEditingId(null);
    } else {
      const newStudent: Student = {
        ...formData,
        id: Date.now().toString(),
      } as Student;
      setState(prev => ({ ...prev, students: [...prev.students, newStudent] }));
    }
    
    setFormData({ fullName: '', cgm: '', birthDate: '', status: StudentStatus.MATRICULADO, classId: '' });
    setShowForm(false);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      const lines = text.split('\n');
      const newStudents: Student[] = [];

      lines.forEach(line => {
        if (!line.trim()) return;
        const parts = line.split(',').map(s => s.trim());
        if (parts.length < 5) return;
        
        const [className, nome, cgm, dataNasc, situacao] = parts;
        
        const turma = state.classes.find(c => c.name.toLowerCase() === className.toLowerCase());
        if (!turma) return;

        let statusValue = StudentStatus.MATRICULADO;
        const normalizedStatus = situacao.toUpperCase();
        if (normalizedStatus.includes('TRANSFERIDO')) statusValue = StudentStatus.TRANSFERIDO;
        else if (normalizedStatus.includes('REMANEJADO')) statusValue = StudentStatus.REMANEJADO;
        else if (normalizedStatus.includes('SEM FREQU')) statusValue = StudentStatus.SEM_FREQUENCIA;

        newStudents.push({
          id: Math.random().toString(36).substr(2, 9) + Date.now(),
          fullName: nome,
          cgm: cgm,
          birthDate: dataNasc,
          status: statusValue,
          classId: turma.id
        });
      });

      if (newStudents.length > 0) {
        setState(prev => ({ ...prev, students: [...prev.students, ...newStudents] }));
        alert(`${newStudents.length} alunos importados com sucesso!`);
      }
    };
    reader.readAsText(file);
    e.target.value = ''; 
  };

  const deleteStudent = (id: string) => {
    if (window.confirm('Deseja realmente excluir este aluno?')) {
      setState(prev => ({
        ...prev,
        students: prev.students.filter(s => s.id !== id),
        attendance: prev.attendance.filter(a => a.studentId !== id)
      }));
    }
  };

  const unassignedStudents = state.students.filter(s => !s.classId || !state.classes.some(c => c.id === s.classId));

  return (
    <div className="space-y-6 pb-20">
      <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-3xl font-bold text-gray-800">Gestão de Alunos</h2>
          <p className="text-gray-500">Alunos agrupados por suas respectivas turmas</p>
        </div>
        <div className="flex space-x-3 w-full sm:w-auto">
          <label className="flex-1 sm:flex-none flex items-center justify-center space-x-2 bg-green-600 text-white px-4 py-2 rounded-lg font-semibold hover:bg-green-700 transition-colors cursor-pointer shadow-sm">
            <Upload size={18} />
            <span>Importar .txt</span>
            <input type="file" accept=".txt" onChange={handleFileUpload} className="hidden" />
          </label>
          <button
            onClick={() => { setShowForm(!showForm); setEditingId(null); if (!showForm) setFormData({ fullName: '', cgm: '', birthDate: '', status: StudentStatus.MATRICULADO, classId: '' }); }}
            className="flex-1 sm:flex-none flex items-center justify-center space-x-2 bg-blue-600 text-white px-4 py-2 rounded-lg font-semibold hover:bg-blue-700 transition-colors shadow-sm"
          >
            <Plus size={18} />
            <span>Novo Aluno</span>
          </button>
        </div>
      </header>

      {showForm && (
        <form onSubmit={handleSubmit} className="bg-white p-6 rounded-xl shadow-md border border-gray-200 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 animate-in fade-in slide-in-from-top-4 duration-300 mb-8">
          <div className="space-y-1">
            <label className="text-sm font-semibold text-gray-700">Nome Completo</label>
            <input
              type="text"
              required
              value={formData.fullName}
              onChange={e => setFormData({...formData, fullName: e.target.value})}
              className="w-full border rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500 bg-white text-black"
            />
          </div>
          <div className="space-y-1">
            <label className="text-sm font-semibold text-gray-700">CGM</label>
            <input
              type="text"
              required
              value={formData.cgm}
              onChange={e => setFormData({...formData, cgm: e.target.value})}
              className="w-full border rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500 bg-white text-black"
            />
          </div>
          <div className="space-y-1">
            <label className="text-sm font-semibold text-gray-700">Data de Nascimento</label>
            <input
              type="date"
              required
              value={formData.birthDate}
              onChange={e => setFormData({...formData, birthDate: e.target.value})}
              className="w-full border rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500 bg-white text-black"
            />
          </div>
          <div className="space-y-1">
            <label className="text-sm font-semibold text-gray-700">Turma</label>
            <select
              required
              value={formData.classId}
              onChange={e => setFormData({...formData, classId: e.target.value})}
              className="w-full border rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500 bg-white text-black"
            >
              <option value="">Selecione...</option>
              {state.classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div className="space-y-1">
            <label className="text-sm font-semibold text-gray-700">Situação</label>
            <select
              required
              value={formData.status}
              onChange={e => setFormData({...formData, status: e.target.value as StudentStatus})}
              className="w-full border rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500 bg-white text-black"
            >
              {Object.values(StudentStatus).map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <div className="flex items-end space-x-2">
            <button type="submit" className="flex-1 bg-blue-600 text-white py-2 rounded-lg font-bold hover:bg-blue-700 transition-colors">
              {editingId ? 'Atualizar' : 'Salvar'}
            </button>
            <button type="button" onClick={() => setShowForm(false)} className="px-4 py-2 bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200 transition-colors">
              Cancelar
            </button>
          </div>
        </form>
      )}

      <div className="space-y-8">
        {state.classes.map(turma => {
          const studentsInClass = state.students.filter(s => s.classId === turma.id);
          return (
            <div key={turma.id} className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden group hover:shadow-md transition-shadow">
              <div className="bg-blue-50 px-6 py-4 border-b border-blue-100 flex justify-between items-center">
                <div className="flex items-center space-x-3 text-blue-900">
                  <div className="p-2 bg-blue-100 rounded-lg">
                    <Users size={20} className="text-blue-700" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold">{turma.name}</h3>
                    <p className="text-sm text-blue-600">{studentsInClass.length} alunos</p>
                  </div>
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead className="bg-gray-50 border-b border-gray-100">
                    <tr>
                      <th className="px-6 py-3 text-xs font-bold text-gray-500 uppercase">CGM</th>
                      <th className="px-6 py-3 text-xs font-bold text-gray-500 uppercase">Nome</th>
                      <th className="px-6 py-3 text-xs font-bold text-gray-500 uppercase">Status</th>
                      <th className="px-6 py-3 text-xs font-bold text-gray-500 uppercase text-right">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {studentsInClass.map(student => (
                      <tr key={student.id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-6 py-4 text-sm font-mono text-gray-600">{student.cgm}</td>
                        <td className="px-6 py-4 text-sm font-medium text-gray-900">{student.fullName}</td>
                        <td className="px-6 py-4">
                          <span className={`text-[10px] px-2 py-1 rounded-full font-bold uppercase ${
                            student.status === StudentStatus.MATRICULADO ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'
                          }`}>
                            {student.status}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-right space-x-2">
                          <button 
                            onClick={() => { setEditingId(student.id); setFormData(student); setShowForm(true); }}
                            className="p-1 text-blue-600 hover:bg-blue-50 rounded transition-colors"
                          >
                            <Edit2 size={16} />
                          </button>
                          <button 
                            onClick={() => deleteStudent(student.id)}
                            className="p-1 text-red-600 hover:bg-red-50 rounded transition-colors"
                          >
                            <Trash2 size={16} />
                          </button>
                        </td>
                      </tr>
                    ))}
                    {studentsInClass.length === 0 && (
                      <tr>
                        <td colSpan={4} className="px-6 py-8 text-center text-gray-400 italic">
                          Nenhum aluno cadastrado nesta turma.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          );
        })}

        {unassignedStudents.length > 0 && (
          <div className="bg-white rounded-xl shadow-sm border border-red-200 overflow-hidden">
            <div className="bg-red-50 px-6 py-4 border-b border-red-100 flex items-center space-x-3 text-red-900">
              <AlertTriangle size={20} className="text-red-600" />
              <h3 className="text-xl font-bold">Alunos sem Turma</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <tbody className="divide-y divide-gray-100">
                  {unassignedStudents.map(student => (
                    <tr key={student.id} className="hover:bg-red-50/30 transition-colors">
                      <td className="px-6 py-4 text-sm font-mono text-gray-600">{student.cgm}</td>
                      <td className="px-6 py-4 text-sm font-medium text-gray-900">{student.fullName}</td>
                      <td className="px-6 py-4 text-right">
                         <button 
                            onClick={() => { setEditingId(student.id); setFormData(student); setShowForm(true); }}
                            className="p-1 text-blue-600 hover:bg-blue-50 rounded transition-colors"
                          >
                            <Edit2 size={16} />
                          </button>
                        <button 
                          onClick={() => deleteStudent(student.id)}
                          className="p-1 text-red-600 hover:bg-red-50 rounded transition-colors"
                        >
                          <Trash2 size={16} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default StudentManagement;
