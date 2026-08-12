
import React, { useState } from 'react';
import { useApp } from '../AppContext';
import { Student, StudentStatus } from '../types';
import { Plus, Trash2, Edit2, Upload, Users, AlertTriangle, Loader2, Hash } from 'lucide-react';

const StudentManagement: React.FC = () => {
  const { state, persistStudent, removeStudent } = useApp();
  const [formData, setFormData] = useState<Partial<Student>>({
    fullName: '',
    callNumber: '',
    cgm: '',
    birthDate: '',
    status: StudentStatus.MATRICULADO,
    classId: ''
  });
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [isBusy, setIsBusy] = useState(false);

  const [inlineEditingId, setInlineEditingId] = useState<string | null>(null);
  const [inlineValue, setInlineValue] = useState('');

  const handleInlineSubmit = async (student: Student) => {
    if (inlineValue === student.callNumber) {
      setInlineEditingId(null);
      return;
    }
    
    setIsBusy(true);
    try {
      const padded = inlineValue.length === 1 ? inlineValue.padStart(2, '0') : inlineValue;
      await persistStudent({ ...student, callNumber: padded });
      setInlineEditingId(null);
    } catch {
      alert('Erro ao atualizar número.');
    } finally {
      setIsBusy(false);
    }
  };

  const renumberClass = async (classId: string) => {
    const classStudents = state.students
      .filter(s => s.classId === classId)
      .sort((a, b) => a.fullName.localeCompare(b.fullName));

    if (classStudents.length === 0) return;
    if (!window.confirm(`Deseja reatribuir os números de chamada para os ${classStudents.length} alunos desta turma em ordem alfabética?`)) return;

    setIsBusy(true);
    try {
      for (let i = 0; i < classStudents.length; i++) {
        const student = classStudents[i];
        const newNumber = (i + 1).toString().padStart(2, '0');
        if (student.callNumber !== newNumber) {
          await persistStudent({ ...student, callNumber: newNumber });
        }
      }
      alert('Turma renumerada com sucesso!');
    } catch {
      alert('Erro ao renumerar turma.');
    } finally {
      setIsBusy(false);
    }
  };

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
      
      setFormData({ fullName: '', callNumber: '', cgm: '', birthDate: '', status: StudentStatus.MATRICULADO, classId: '' });
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
          callNumber: '', // Default empty for import
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
      } catch {
        alert('Erro ao excluir aluno.');
      } finally {
        setIsBusy(false);
      }
    }
  };

  // Alunos sem turma, ordenados por número de chamada e depois nome
  const unassignedStudents = state.students
    .filter(s => !s.classId || !state.classes.some(c => c.id === s.classId))
    .sort((a, b) => {
      const aNum = a.callNumber && a.callNumber.trim() !== '' ? a.callNumber : null;
      const bNum = b.callNumber && b.callNumber.trim() !== '' ? b.callNumber : null;
      if (aNum && bNum) return aNum.localeCompare(bNum);
      if (aNum) return -1;
      if (bNum) return 1;
      return a.fullName.localeCompare(b.fullName);
    });

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
          <label className={`flex-1 sm:flex-none flex items-center justify-center space-x-2 px-4 py-2 rounded-lg font-semibold transition-colors cursor-pointer shadow-sm text-[15px] ${isBusy ? 'bg-gray-400 cursor-not-allowed' : 'bg-green-600 hover:bg-green-700 text-white'}`}>
            {isBusy ? <Loader2 className="animate-spin" size={18} /> : <Upload size={18} />}
            <span>{isBusy ? 'Processando...' : 'Importar .txt'}</span>
            <input type="file" accept=".txt" onChange={handleFileUpload} className="hidden" disabled={isBusy} />
          </label>
          <button
            disabled={isBusy}
            onClick={() => { setShowForm(!showForm); setEditingId(null); if (!showForm) setFormData({ fullName: '', callNumber: '', cgm: '', birthDate: '', status: StudentStatus.MATRICULADO, classId: '' }); }}
            className="flex-1 sm:flex-none flex items-center justify-center space-x-2 bg-blue-600 text-white px-4 py-2 rounded-lg font-semibold hover:bg-blue-700 transition-colors shadow-sm text-[15px]"
          >
            <Plus size={18} />
            <span>Novo Aluno</span>
          </button>
        </div>
      </header>

      {showForm && (
        <form onSubmit={handleSubmit} className="bg-white p-6 rounded-xl shadow-md border border-gray-200 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 animate-in fade-in slide-in-from-top-4 duration-300 mb-8">
          <div className="space-y-1">
            <label className="text-[15px] font-semibold text-gray-700">Nome Completo</label>
            <input
              type="text"
              required
              value={formData.fullName || ''}
              onChange={e => setFormData({...formData, fullName: e.target.value})}
              className="w-full border rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500 bg-white text-black text-[15px]"
            />
          </div>
          <div className="space-y-1">
            <label className="text-[15px] font-semibold text-gray-700">Nº Chamada</label>
            <input
              type="text"
              placeholder="Ex: 01"
              value={formData.callNumber || ''}
              onChange={e => {
                const val = e.target.value.replace(/\D/g, '').slice(0, 2);
                setFormData({...formData, callNumber: val});
              }}
              onBlur={e => {
                const val = e.target.value;
                if (val && val.length === 1) {
                  setFormData({...formData, callNumber: val.padStart(2, '0')});
                }
              }}
              className="w-full border rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500 bg-white text-black text-[15px] font-mono"
            />
          </div>
          <div className="space-y-1">
            <label className="text-[15px] font-semibold text-gray-700">CGM</label>
            <input
              type="text"
              required
              value={formData.cgm || ''}
              onChange={e => setFormData({...formData, cgm: e.target.value})}
              className="w-full border rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500 bg-white text-black text-[15px]"
            />
          </div>
          <div className="space-y-1">
            <label className="text-[15px] font-semibold text-gray-700">Data de Nascimento</label>
            <input
              type="date"
              required
              value={formData.birthDate || ''}
              onChange={e => setFormData({...formData, birthDate: e.target.value})}
              className="w-full border rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500 bg-white text-black text-[15px]"
            />
          </div>
          <div className="space-y-1">
            <label className="text-[15px] font-semibold text-gray-700">Turma</label>
            <select
              required
              value={formData.classId || ''}
              onChange={e => setFormData({...formData, classId: e.target.value})}
              className="w-full border rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500 bg-white text-black text-[15px]"
            >
              <option value="">Selecione...</option>
              {sortedClasses.map(c => <option key={c.id} value={c.id}>{c.name} ({c.shift || 'N/A'})</option>)}
            </select>
          </div>
          <div className="space-y-1">
            <label className="text-[15px] font-semibold text-gray-700">Situação</label>
            <select
              required
              value={formData.status || StudentStatus.MATRICULADO}
              onChange={e => setFormData({...formData, status: e.target.value as StudentStatus})}
              className="w-full border rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500 bg-white text-black text-[15px]"
            >
              {Object.values(StudentStatus).map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <div className="flex items-end space-x-2">
            <button type="submit" disabled={isBusy} className="flex-1 bg-blue-600 text-white py-2 rounded-lg font-bold hover:bg-blue-700 transition-colors flex justify-center items-center text-[15px]">
              {isBusy && <Loader2 className="animate-spin mr-2" size={16} />}
              {editingId ? 'Atualizar' : 'Salvar'}
            </button>
            <button type="button" onClick={() => setShowForm(false)} className="px-4 py-2 bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200 transition-colors text-[15px]">
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
            .sort((a, b) => {
              const aNum = a.callNumber && a.callNumber.trim() !== '' ? a.callNumber : null;
              const bNum = b.callNumber && b.callNumber.trim() !== '' ? b.callNumber : null;
              if (aNum && bNum) return aNum.localeCompare(bNum);
              if (aNum) return -1;
              if (bNum) return 1;
              return a.fullName.localeCompare(b.fullName);
            });

          return (
            <div key={turma.id} className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden group hover:shadow-md transition-shadow">
              <div className="bg-blue-50 px-6 py-4 border-b border-blue-100 flex justify-between items-center">
                <div className="flex items-center space-x-3 text-blue-900">
                  <div className="p-2 bg-blue-100 rounded-lg">
                    <Users size={20} className="text-blue-700" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold">{turma.name}</h3>
                    <div className="flex items-center space-x-3">
                      <p className="text-[15px] text-blue-600 font-medium">{studentsInClass.length} alunos</p>
                      <span className="text-xs bg-blue-200 text-blue-800 px-2 py-0.5 rounded-full font-black uppercase tracking-widest">
                        {turma.shift || 'N/A'}
                      </span>
                    </div>
                  </div>
                </div>
                <button
                  disabled={isBusy || studentsInClass.length === 0}
                  onClick={() => renumberClass(turma.id)}
                  className="flex items-center space-x-2 bg-white text-blue-600 border border-blue-200 px-3 py-1.5 rounded-lg text-[13px] font-bold hover:bg-blue-50 transition-colors shadow-sm disabled:opacity-50"
                  title="Atribuir números de chamada em ordem alfabética"
                >
                  <Hash size={14} />
                  <span>Renumerar</span>
                </button>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead className="bg-gray-50 border-b border-gray-100">
                    <tr>
                      <th className="px-6 py-3 text-[13px] font-bold text-gray-500 uppercase">Nº</th>
                      <th className="px-6 py-3 text-[13px] font-bold text-gray-500 uppercase">CGM</th>
                      <th className="px-6 py-3 text-[13px] font-bold text-gray-500 uppercase">Nome</th>
                      <th className="px-6 py-3 text-[13px] font-bold text-gray-500 uppercase">Nascimento</th>
                      <th className="px-6 py-3 text-[13px] font-bold text-gray-500 uppercase">Status</th>
                      <th className="px-6 py-3 text-[13px] font-bold text-gray-500 uppercase text-right">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {studentsInClass.map(student => (
                      <tr key={student.id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-6 py-4 text-[15px] font-bold text-blue-600">
                          {inlineEditingId === student.id ? (
                            <input
                              autoFocus
                              type="text"
                              className="w-12 border rounded px-1 py-0.5 text-center outline-none focus:ring-2 focus:ring-blue-500"
                              value={inlineValue}
                              onChange={e => setInlineValue(e.target.value.replace(/\D/g, '').slice(0, 2))}
                              onBlur={() => handleInlineSubmit(student)}
                              onKeyDown={e => {
                                if (e.key === 'Enter') handleInlineSubmit(student);
                                if (e.key === 'Escape') setInlineEditingId(null);
                              }}
                            />
                          ) : (
                            <span 
                              className="cursor-pointer hover:bg-blue-100 px-2 py-1 rounded transition-colors"
                              onClick={() => {
                                setInlineEditingId(student.id);
                                setInlineValue(student.callNumber || '');
                              }}
                              title="Clique para editar número"
                            >
                              {student.callNumber || '--'}
                            </span>
                          )}
                        </td>
                        <td className="px-6 py-4 text-[15px] font-mono text-gray-600">{student.cgm}</td>
                        <td className="px-6 py-4 text-[15px] font-medium text-gray-900">{student.fullName}</td>
                        <td className="px-6 py-4 text-[15px] text-gray-600 font-medium">{formatDate(student.birthDate)}</td>
                        <td className="px-6 py-4">
                          <span className={`text-[13px] px-2 py-1 rounded-full font-bold uppercase ${
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
                        <td colSpan={5} className="px-6 py-8 text-center text-gray-400 italic text-[15px]">
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
                      <td className="px-6 py-4 text-[15px] font-bold text-red-600">
                        {inlineEditingId === student.id ? (
                          <input
                            autoFocus
                            type="text"
                            className="w-12 border rounded px-1 py-0.5 text-center outline-none focus:ring-2 focus:ring-blue-500"
                            value={inlineValue}
                            onChange={e => setInlineValue(e.target.value.replace(/\D/g, '').slice(0, 2))}
                            onBlur={() => handleInlineSubmit(student)}
                            onKeyDown={e => {
                              if (e.key === 'Enter') handleInlineSubmit(student);
                              if (e.key === 'Escape') setInlineEditingId(null);
                            }}
                          />
                        ) : (
                          <span 
                            className="cursor-pointer hover:bg-red-100 px-2 py-1 rounded transition-colors"
                            onClick={() => {
                              setInlineEditingId(student.id);
                              setInlineValue(student.callNumber || '');
                            }}
                            title="Clique para editar número"
                          >
                            {student.callNumber || '--'}
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-[15px] font-mono text-gray-600">{student.cgm}</td>
                      <td className="px-6 py-4 text-[15px] font-medium text-gray-900">{student.fullName}</td>
                      <td className="px-6 py-4 text-[15px] text-gray-600 font-medium">{formatDate(student.birthDate)}</td>
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
