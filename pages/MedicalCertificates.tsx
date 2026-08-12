
import React, { useState, useMemo } from 'react';
import { useApp } from '../AppContext';
import { Search, Calendar, FileText, Plus, Trash2, User, XCircle, Edit2 } from 'lucide-react';
import { MedicalCertificate } from '../types';
import { v4 as uuidv4 } from 'uuid';

const MedicalCertificates: React.FC = () => {
  const { state, persistCertificate, removeCertificate } = useApp();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [isAdding, setIsAdding] = useState(false);
  const [editingCert, setEditingCert] = useState<MedicalCertificate | null>(null);
  const [editStartDate, setEditStartDate] = useState('');
  const [editEndDate, setEditEndDate] = useState('');

  const foundStudent = useMemo(() => {
    if (!searchTerm) return null;
    return state.students.find(s => s.cgm === searchTerm);
  }, [searchTerm, state.students]);

  const studentCertificates = useMemo(() => {
    return state.certificates.filter(c => c.studentId === selectedStudentId)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }, [state.certificates, selectedStudentId]);

  const handleAddCertificate = async () => {
    if (!selectedStudentId || !startDate || !endDate) return;

    const newCert: MedicalCertificate = {
      id: uuidv4(),
      studentId: selectedStudentId,
      startDate,
      endDate,
      createdAt: new Date().toISOString()
    };

    await persistCertificate(newCert);
    setStartDate('');
    setEndDate('');
    setIsAdding(false);
  };

  const handleUpdateCertificate = async () => {
    if (!editingCert || !editStartDate || !editEndDate) return;

    const updatedCert: MedicalCertificate = {
      ...editingCert,
      startDate: editStartDate,
      endDate: editEndDate
    };

    await persistCertificate(updatedCert);
    setEditingCert(null);
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('Tem certeza que deseja excluir este atestado?')) {
      await removeCertificate(id);
    }
  };

  const formatDate = (dateStr: string) => {
    const [year, month, day] = dateStr.split('-');
    return `${day}/${month}/${year}`;
  };

  const groupedCertificatesData = useMemo(() => {
    const data: Record<string, { student: any, totalDays: number, certificates: MedicalCertificate[] }[]> = {};

    state.certificates.forEach(cert => {
      const student = state.students.find(s => s.id === cert.studentId);
      if (!student) return;

      const classGroup = state.classes.find(c => c.id === student.classId);
      const className = classGroup?.name || 'Sem Turma';

      if (!data[className]) {
        data[className] = [];
      }

      let studentEntry = data[className].find(e => e.student.id === student.id);
      
      const start = new Date(cert.startDate);
      const end = new Date(cert.endDate);
      const diffTime = Math.abs(end.getTime() - start.getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;

      if (!studentEntry) {
        studentEntry = { student, totalDays: 0, certificates: [] };
        data[className].push(studentEntry);
      }

      studentEntry.totalDays += diffDays;
      studentEntry.certificates.push(cert);
    });

    return Object.keys(data).sort().reduce((acc, key) => {
      acc[key] = data[key].sort((a, b) => a.student.fullName.localeCompare(b.student.fullName));
      return acc;
    }, {} as typeof data);
  }, [state.certificates, state.students, state.classes]);

  const totalCertificatesInYear = useMemo(() => {
    const currentYear = new Date().getFullYear().toString();
    return state.certificates.filter(cert => cert.startDate.startsWith(currentYear)).length;
  }, [state.certificates]);

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <header>
        <h2 className="text-3xl font-black text-gray-900 tracking-tight">Gestão de Atestados</h2>
        <p className="text-gray-500 font-medium">Registro e consulta de afastamentos médicos</p>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100 space-y-4">
            <label className="text-[13px] font-black text-gray-400 uppercase tracking-widest">Buscar Aluno</label>
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
              <input 
                type="text"
                placeholder="Digite o CGM do aluno..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-12 pr-4 py-4 bg-gray-50 rounded-2xl border border-gray-100 outline-none focus:ring-2 focus:ring-blue-500 transition-all font-bold text-gray-700"
              />
            </div>

            {foundStudent ? (
              <div className="mt-6 p-4 bg-blue-50 rounded-2xl border border-blue-100 animate-in slide-in-from-top-2 duration-300">
                <div className="flex items-center space-x-4">
                  <div className="w-12 h-12 bg-blue-600 text-white rounded-xl flex items-center justify-center font-black text-lg">
                    {foundStudent.fullName[0]}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-black text-gray-900 truncate">{foundStudent.fullName}</p>
                    <p className="text-xs font-bold text-blue-600 uppercase tracking-widest">CGM: {foundStudent.cgm}</p>
                  </div>
                </div>
                <button 
                  onClick={() => {
                    setSelectedStudentId(foundStudent.id);
                    setIsAdding(true);
                  }}
                  className="w-full mt-4 flex items-center justify-center space-x-2 bg-blue-600 text-white py-3 rounded-xl font-black uppercase tracking-widest text-xs hover:bg-blue-700 transition-all shadow-md shadow-blue-200"
                >
                  <Plus size={16} />
                  <span>Novo Atestado</span>
                </button>
              </div>
            ) : searchTerm && (
              <div className="mt-6 p-4 bg-red-50 rounded-2xl border border-red-100 flex items-center space-x-3 text-red-600">
                <XCircle size={20} />
                <span className="text-sm font-bold uppercase tracking-tight">Aluno não encontrado</span>
              </div>
            )}
          </div>

          {isAdding && selectedStudentId && (
            <div className="bg-white p-6 rounded-3xl shadow-xl border-2 border-blue-500 animate-in zoom-in duration-300 space-y-6">
              <div className="flex justify-between items-center">
                <h3 className="font-black text-gray-900 uppercase tracking-tight">Novo Afastamento</h3>
                <button onClick={() => setIsAdding(false)} className="text-gray-400 hover:text-gray-600">
                  <XCircle size={20} />
                </button>
              </div>
              
              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-[11px] font-black text-gray-400 uppercase tracking-widest">Data de Início</label>
                  <input 
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full px-4 py-3 bg-gray-50 rounded-xl border border-gray-100 outline-none focus:ring-2 focus:ring-blue-500 font-bold text-gray-700"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[11px] font-black text-gray-400 uppercase tracking-widest">Data de Término</label>
                  <input 
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="w-full px-4 py-3 bg-gray-50 rounded-xl border border-gray-100 outline-none focus:ring-2 focus:ring-blue-500 font-bold text-gray-700"
                  />
                </div>
                <button 
                  onClick={handleAddCertificate}
                  disabled={!startDate || !endDate}
                  className="w-full bg-blue-600 text-white py-4 rounded-xl font-black uppercase tracking-widest text-sm hover:bg-blue-700 transition-all shadow-lg shadow-blue-200 disabled:opacity-50 disabled:shadow-none"
                >
                  Salvar Atestado
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Certificates List */}
        <div className="lg:col-span-2">
          {selectedStudentId ? (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-black text-gray-900 uppercase tracking-tight">Histórico de Atestados</h3>
                <span className="bg-gray-100 text-gray-500 px-3 py-1 rounded-full text-xs font-black uppercase">
                  {studentCertificates.length} Registros
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {studentCertificates.map((cert) => (
                  <div key={cert.id} className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100 hover:border-blue-200 transition-all group">
                    <div className="flex justify-between items-start mb-4">
                      <div className="p-3 bg-blue-50 text-blue-600 rounded-2xl">
                        <FileText size={24} />
                      </div>
                      <button 
                        onClick={() => handleDelete(cert.id)}
                        className="p-2 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                    <div className="space-y-3">
                      <div className="flex items-center space-x-3 text-gray-400">
                        <Calendar size={16} />
                        <span className="text-[11px] font-black uppercase tracking-widest">Período de Afastamento</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <div className="text-center flex-1">
                          <p className="text-[11px] font-black text-gray-400 uppercase">Início</p>
                          <p className="font-black text-gray-900">{formatDate(cert.startDate)}</p>
                        </div>
                        <div className="h-px bg-gray-100 flex-1 mx-4"></div>
                        <div className="text-center flex-1">
                          <p className="text-[11px] font-black text-gray-400 uppercase">Término</p>
                          <p className="font-black text-gray-900">{formatDate(cert.endDate)}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {studentCertificates.length === 0 && (
                <div className="bg-white p-12 rounded-3xl border border-dashed border-gray-200 text-center space-y-4">
                  <div className="w-16 h-16 bg-gray-50 text-gray-300 rounded-full flex items-center justify-center mx-auto">
                    <FileText size={32} />
                  </div>
                  <p className="text-gray-400 font-black uppercase tracking-widest text-sm">Nenhum atestado registrado para este aluno.</p>
                </div>
              )}
            </div>
          ) : (
            <div className="h-full flex flex-col items-center justify-center bg-white rounded-3xl border border-dashed border-gray-200 p-12 text-center space-y-6">
              <div className="w-24 h-24 bg-gray-50 text-gray-200 rounded-full flex items-center justify-center">
                <User size={48} />
              </div>
              <div className="max-w-xs">
                <h3 className="text-lg font-black text-gray-900 uppercase tracking-tight mb-2">Selecione um Aluno</h3>
                <p className="text-gray-400 font-medium">Use o campo de busca ao lado para encontrar um aluno pelo CGM e gerenciar seus atestados.</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Global List of Certificates */}
      <div className="space-y-6 pt-8 border-t border-gray-100">
        <div className="flex items-center justify-between">
          <h3 className="text-2xl font-black text-gray-900 uppercase tracking-tight">Resumo Geral por Turma</h3>
          <span className="bg-blue-600 text-white px-4 py-1 rounded-full text-xs font-black uppercase">
            {totalCertificatesInYear} Atestados em {new Date().getFullYear()}
          </span>
        </div>

        <div className="grid grid-cols-1 gap-8">
          {Object.entries(groupedCertificatesData).map(([className, students]) => (
            <div key={className} className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
              <div className="bg-gray-50 px-8 py-4 border-b border-gray-100 flex justify-between items-center">
                <h4 className="font-black text-gray-800 uppercase tracking-tight">{className}</h4>
                <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">{students.length} Alunos</span>
              </div>
              <div className="divide-y divide-gray-50">
                {students.map(({ student, totalDays, certificates }) => (
                  <div key={student.id} className="p-6 hover:bg-gray-50 transition-colors">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                      <div className="flex items-center space-x-4">
                        <div className="w-10 h-10 bg-gray-100 text-gray-400 rounded-xl flex items-center justify-center font-black">
                          {student.fullName[0]}
                        </div>
                        <div>
                          <p className="font-bold text-gray-900">{student.fullName}</p>
                          <p className="text-[11px] font-black text-gray-400 uppercase tracking-widest">CGM: {student.cgm}</p>
                          <div className="mt-2 space-y-1">
                            {certificates.map(cert => (
                              <p key={cert.id} className="text-[10px] font-medium text-gray-500 flex items-center">
                                <Calendar size={10} className="mr-1 text-blue-400" />
                                {formatDate(cert.startDate)} até {formatDate(cert.endDate)}
                              </p>
                            ))}
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-6">
                        <div className="flex flex-col items-end">
                          <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Total de Afastamento</p>
                          <p className="text-lg font-black text-blue-600">{totalDays} {totalDays === 1 ? 'Dia' : 'Dias'}</p>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {certificates.map((cert) => (
                            <button 
                              key={cert.id} 
                              onClick={() => {
                                setEditingCert(cert);
                                setEditStartDate(cert.startDate);
                                setEditEndDate(cert.endDate);
                              }}
                              className="w-10 h-10 rounded-xl bg-white border border-gray-100 flex items-center justify-center shadow-sm hover:border-blue-500 hover:text-blue-600 transition-all group relative"
                              title={`Editar atestado: ${formatDate(cert.startDate)} - ${formatDate(cert.endDate)}`}
                            >
                              <FileText size={16} />
                              <div className="absolute -top-1 -right-1 bg-blue-600 text-white p-0.5 rounded-full opacity-0 group-hover:opacity-100 transition-opacity">
                                <Edit2 size={8} />
                              </div>
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
          
          {Object.keys(groupedCertificatesData).length === 0 && (
            <div className="py-20 text-center bg-white rounded-3xl border border-dashed border-gray-200">
              <p className="text-gray-400 font-black uppercase tracking-widest text-sm">Nenhum atestado registrado no sistema.</p>
            </div>
          )}
        </div>
      </div>

      {/* Edit Modal */}
      {editingCert && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl p-8 space-y-6 animate-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center">
              <div>
                <h3 className="text-xl font-black text-gray-900 uppercase tracking-tight">Editar Atestado</h3>
                <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mt-1">
                  {state.students.find(s => s.id === editingCert.studentId)?.fullName}
                </p>
              </div>
              <button onClick={() => setEditingCert(null)} className="text-gray-400 hover:text-gray-600 transition-colors">
                <XCircle size={24} />
              </button>
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-[11px] font-black text-gray-400 uppercase tracking-widest">Data de Início</label>
                <input 
                  type="date"
                  value={editStartDate}
                  onChange={(e) => setEditStartDate(e.target.value)}
                  className="w-full px-4 py-3 bg-gray-50 rounded-xl border border-gray-100 outline-none focus:ring-2 focus:ring-blue-500 font-bold text-gray-700"
                />
              </div>
              <div className="space-y-2">
                <label className="text-[11px] font-black text-gray-400 uppercase tracking-widest">Data de Término</label>
                <input 
                  type="date"
                  value={editEndDate}
                  onChange={(e) => setEditEndDate(e.target.value)}
                  className="w-full px-4 py-3 bg-gray-50 rounded-xl border border-gray-100 outline-none focus:ring-2 focus:ring-blue-500 font-bold text-gray-700"
                />
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              <button 
                onClick={() => setEditingCert(null)}
                className="flex-1 px-4 py-3 bg-gray-100 text-gray-600 rounded-xl font-black uppercase tracking-widest text-xs hover:bg-gray-200 transition-all"
              >
                Cancelar
              </button>
              <button 
                onClick={handleUpdateCertificate}
                disabled={!editStartDate || !editEndDate}
                className="flex-[2] bg-blue-600 text-white py-3 rounded-xl font-black uppercase tracking-widest text-xs hover:bg-blue-700 transition-all shadow-lg shadow-blue-200 disabled:opacity-50 disabled:shadow-none"
              >
                Salvar Alterações
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MedicalCertificates;
