
import React, { useState } from 'react';
import { useApp } from '../App';
import { Student, StudentStatus } from '../types';
import { Plus, Trash2, Edit2, Upload, Users, AlertTriangle, Loader2 } from 'lucide-react';

const StudentManagement: React.FC = () => {
  const { state, persistStudent, removeStudent } = useApp();
  const [formData, setFormData] = useState<Partial<Student>>({
    fullName: '',
    cgm: '',
    birthDate: '',
    status: StudentStatus.MATRICULADO,
    classId: ''
  });
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [isBusy, setIsBusy] = useState(false);

  const formatDate = (dateStr: string) => {
    if (!dateStr) return '--/--/----';
    const parts = dateStr.split('-');
    if (parts.length === 3) {
      const [year, month, day] = parts;
      return `${day}/${month}/${year}`;
    }
    return dateStr;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.classId || !formData.fullName) {
      alert('Preencha os campos obrigatórios.');
      return;
    }

    setIsBusy(true);
    try {
      const studentData: Student = {
        ...formData,
        id: editingId || Date.now().toString(),
      } as Student;

      await persistStudent(studentData);
      
      setFormData({ fullName: '', cgm: '', birthDate: '', status: StudentStatus.MATRICULADO, classId: '' });
      setShowForm(false);
      setEditingId(null);
      alert(editingId ? 'Aluno atualizado com sucesso!' : 'Aluno cadastrado com sucesso!');
    } catch (error) {
      console.error(error);
      alert('Erro ao salvar no Firestore.');
    } finally {
      setIsBusy(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      const text = event.target?.result as string;
      const lines = text.split('\n');
      let count = 0;
      let errors = 0;

      setIsBusy(true);
      for (const line of lines) {
        if (!line.trim()) continue;
        
        // Formato esperado: ano/série,nome do aluno,CGM,data de nascimento,situação
        const parts = line.split(',').map(s => s.trim());
        if (parts.length < 5) continue;
        
        const [anoSerie, nome, cgm, dataNascRaw, situacaoRaw] = parts;
        
        // 1. Localiza a turma
        const turma = state.classes.find(c => c.name.toLowerCase() === anoSerie.toLowerCase());
        if (!turma) {
          console.warn(`Turma não encontrada: ${anoSerie}`);
          errors++;
          continue;
        }

        // 2. Converte data de nascimento DD/MM/AAAA para YYYY-MM-DD
        let birthDate = dataNascRaw;
        if (dataNascRaw.includes('/')) {
          const dParts = dataNascRaw.split('/');
          if (dParts.length === 3) {
            const [d, m, y] = dParts;
            birthDate = `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
          }
        }

        // 3. Mapeia situação
        let statusValue = StudentStatus.MATRICULADO;
        const normStatus = situacaoRaw.toUpperCase();
        if (normStatus.includes('TRANSF')) statusValue = StudentStatus.TRANSFERIDO;
        else if (normStatus.includes('REMAN')) statusValue = StudentStatus.REMANEJADO;
        else if (normStatus.includes('SEM FREQU') || normStatus === 'SF') statusValue = StudentStatus.SEM_FREQUENCIA;
        else if (normStatus.includes('MATRIC')) statusValue = StudentStatus.MATRICULADO;

        const newStudent: Student = {
          id: `imp-${cgm}-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
          fullName: nome,
          cgm: cgm,
          birthDate: birthDate,
          status: statusValue,
          classId: turma.id
        };

        try {
          await persistStudent(newStudent);
          count++;
        } catch (err) {
          console.error("Erro ao importar linha:", line, err);
          errors++;
        }
      }
      setIsBusy(false);
      
      let msg = `${count} alunos importados com sucesso.`;
      if (errors > 0) msg += `\n${errors} registros falharam (verifique se as turmas existem no sistema).`;
      alert(msg);
    };
    reader.readAsText(file);
    e.target.value = ''; 
  };

  const deleteStudent = async (id: string) => {
    if (window.confirm('Deseja realmente excluir este aluno do banco de dados?')) {
      setIsBusy(true);
      try {
        await removeStudent(id);
      } catch (err) {
        alert('Erro ao excluir aluno.');
      } finally {
        setIsBusy(false);
      }
    }
  };

  // Alunos sem turma, ordenados por nome
  const unassignedStudents = state.students
    .filter(s => !s.classId || !state.classes.some(c => c.id === s.classId))
    .sort((a, b) => a.fullName.localeCompare(b.fullName));

  // Turmas ordenadas por nome para a listagem
  const sortedClasses = [...state.classes].sort((a, b) => a.name.localeCompare(b.name));

  return (
    <div className="space-y-6 pb-20">
      <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-3xl font-bold text-gray-800">Gestão de Alunos</h2>
          <p className="text-gray-500">Sincronizado com Google Firestore</p>
        </div>
        <div className="flex space-x-3 w-full sm:w-auto">
          <label className={`flex-1 sm:flex-none flex items-center justify-center space-x-2 px-4 py-2 rounded-lg font-semibold transition-colors cursor-pointer shadow-sm ${isBusy ? 'bg-gray-400 cursor-not-allowed' : 'bg-green-600 hover:bg-green-700 text-white'}`}>
            {isBusy ? <Loader2 className="animate-spin" size={18} /> : <Upload size={18} />}
            <span>{isBusy ? 'Processando...' : 'Importar .txt'}</span>
            <input type="file" accept=".txt" onChange={handleFileUpload} className="hidden" disabled={isBusy} />
          </label>
          <button
            disabled={isBusy}
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
              {sortedClasses.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
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
            <button type="submit" disabled={isBusy} className="flex-1 bg-blue-600 text-white py-2 rounded-lg font-bold hover:bg-blue-700 transition-colors flex justify-center items-center">
              {isBusy && <Loader2 className="animate-spin mr-2" size={16} />}
              {editingId ? 'Atualizar' : 'Salvar'}
            </button>
            <button type="button" onClick={() => setShowForm(false)} className="px-4 py-2 bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200 transition-colors">
              Cancelar
            </button>
          </div>
        </form>
      )}

      <div className="space-y-8">
        {sortedClasses.map(turma => {
          // Alunos da turma ordenados alfabeticamente
          const studentsInClass = state.students
            .filter(s => s.classId === turma.id)
            .sort((a, b) => a.fullName.localeCompare(b.fullName));

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
                      <th className="px-6 py-3 text-xs font-bold text-gray-500 uppercase">Nascimento</th>
                      <th className="px-6 py-3 text-xs font-bold text-gray-500 uppercase">Status</th>
                      <th className="px-6 py-3 text-xs font-bold text-gray-500 uppercase text-right">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {studentsInClass.map(student => (
                      <tr key={student.id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-6 py-4 text-sm font-mono text-gray-600">{student.cgm}</td>
                        <td className="px-6 py-4 text-sm font-medium text-gray-900">{student.fullName}</td>
                        <td className="px-6 py-4 text-sm text-gray-600 font-medium">{formatDate(student.birthDate)}</td>
                        <td className="px-6 py-4">
                          <span className={`text-[10px] px-2 py-1 rounded-full font-bold uppercase ${
                            student.status === StudentStatus.MATRICULADO ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'
                          }`}>
                            {student.status}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-right space-x-2">
                          <button 
                            disabled={isBusy}
                            onClick={() => { setEditingId(student.id); setFormData(student); setShowForm(true); }}
                            className="p-1 text-blue-600 hover:bg-blue-50 rounded transition-colors"
                          >
                            <Edit2 size={16} />
                          </button>
                          <button 
                            disabled={isBusy}
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
                        <td colSpan={5} className="px-6 py-8 text-center text-gray-400 italic">
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
                      <td className="px-6 py-4 text-sm text-gray-600 font-medium">{formatDate(student.birthDate)}</td>
                      <td className="px-6 py-4 text-right">
                         <button 
                            disabled={isBusy}
                            onClick={() => { setEditingId(student.id); setFormData(student); setShowForm(true); }}
                            className="p-1 text-blue-600 hover:bg-blue-50 rounded transition-colors"
                          >
                            <Edit2 size={16} />
                          </button>
                        <button 
                          disabled={isBusy}
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
