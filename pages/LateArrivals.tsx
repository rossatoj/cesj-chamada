
import React, { useState, useMemo } from 'react';
import { useApp } from '../AppContext';
import { Student, LateArrival, StudentStatus, UserRole } from '../types';
import { Search, Save, Loader2, Clock, Calendar, User, CheckCircle2, FileDown, ChevronDown, ChevronRight, Trash2 } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

const LateArrivals: React.FC = () => {
  const { state, persistLateArrival, removeLateArrival, currentUser } = useApp();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [selectedReason, setSelectedReason] = useState('');
  const [busy, setBusy] = useState(false);
  const [success, setSuccess] = useState(false);
  const [expandedDates, setExpandedDates] = useState<Record<string, boolean>>({});
  const [reportSearchTerm, setReportSearchTerm] = useState('');
  const [reportSelectedStudent, setReportSelectedStudent] = useState<Student | null>(null);

  const reasons = [
    'Acordou atrasado(a).',
    'Exames laboratoriais.',
    'Consulta Médica/Dentista/Fisioterapia.',
    'Transporte Escolar.',
    'Almoço demorou.',
    'Foi no Correio.',
    'Chuva.'
  ];

  const filteredStudents = useMemo(() => {
    if (searchTerm.length < 3) return [];
    return state.students.filter(s => 
      s.fullName.toLowerCase().includes(searchTerm.toLowerCase()) &&
      s.status === StudentStatus.MATRICULADO
    ).slice(0, 10);
  }, [state.students, searchTerm]);

  const groupedLateArrivals = useMemo(() => {
    const groups: Record<string, Record<string, Record<string, LateArrival[]>>> = {};
    
    state.lateArrivals.forEach(late => {
      const student = state.students.find(s => s.id === late.studentId);
      if (!student) return;
      
      const classGroup = state.classes.find(c => c.id === student.classId);
      const className = classGroup?.name || 'Sem Turma';
      const date = late.date;
      
      if (!groups[date]) groups[date] = {};
      if (!groups[date][className]) groups[date][className] = {};
      if (!groups[date][className][student.fullName]) groups[date][className][student.fullName] = [];
      
      groups[date][className][student.fullName].push(late);
    });

    const sortedGroups: typeof groups = {};
    Object.keys(groups).sort((a, b) => b.localeCompare(a)).forEach(date => {
      sortedGroups[date] = {};
      Object.keys(groups[date]).sort().forEach(className => {
        sortedGroups[date][className] = {};
        Object.keys(groups[date][className]).sort().forEach(studentName => {
          sortedGroups[date][className][studentName] = groups[date][className][studentName].sort((a, b) => 
            b.time.localeCompare(a.time)
          );
        });
      });
    });

    return sortedGroups;
  }, [state.lateArrivals, state.students, state.classes]);

  const filteredReportStudents = useMemo(() => {
    if (reportSearchTerm.length < 3) return [];
    return state.students.filter(s => 
      s.fullName.toLowerCase().includes(reportSearchTerm.toLowerCase())
    ).slice(0, 10);
  }, [state.students, reportSearchTerm]);

  const handleSave = async () => {
    if (!selectedStudent || !selectedReason) return;
    setBusy(true);

    try {
      const now = new Date();
      const date = now.toLocaleDateString('sv-SE', { timeZone: 'America/Sao_Paulo' });
      const time = now.toLocaleTimeString('pt-BR', { timeZone: 'America/Sao_Paulo', hour: '2-digit', minute: '2-digit' });

      const newLateArrival: LateArrival = {
        id: uuidv4(),
        studentId: selectedStudent.id,
        reason: selectedReason,
        date,
        time,
        createdAt: now.toISOString()
      };

      await persistLateArrival(newLateArrival);
      setSuccess(true);
      setTimeout(() => {
        setSuccess(false);
        setSelectedStudent(null);
        setSelectedReason('');
        setSearchTerm('');
      }, 3000);
    } catch (error) {
      console.error("Erro ao salvar atraso:", error);
      alert('Erro ao salvar registro de atraso.');
    } finally {
      setBusy(false);
    }
  };

  const toggleDate = (date: string) => {
    setExpandedDates(prev => ({ ...prev, [date]: !prev[date] }));
  };

  const handleDelete = async (id: string) => {
    if (confirm('Deseja realmente excluir este registro de atraso?')) {
      try {
        await removeLateArrival(id);
      } catch (error) {
        console.error("Erro ao excluir atraso:", error);
        alert('Erro ao excluir registro.');
      }
    }
  };

  const generatePDF = () => {
    const doc = new jsPDF();
    const now = new Date().toLocaleString('pt-BR');

    doc.setFontSize(18);
    doc.text('Relatório de Atrasos - C. E. São José', 14, 20);
    doc.setFontSize(10);
    doc.text(`Gerado em: ${now}`, 14, 28);

    const tableData: any[] = [];
    
    Object.entries(groupedLateArrivals).forEach(([, classes]) => {
      Object.entries(classes).forEach(([className, students]) => {
        Object.entries(students).forEach(([studentName, arrivals]) => {
          arrivals.forEach(late => {
            const [year, month, day] = late.date.split('-');
            tableData.push([
              `${day}/${month}/${year}`,
              className,
              studentName,
              late.time,
              late.reason
            ]);
          });
        });
      });
    });

    autoTable(doc, {
      startY: 35,
      head: [['Data', 'Turma', 'Aluno', 'Hora', 'Motivo']],
      body: tableData,
      theme: 'grid',
      headStyles: { fillStyle: 'F', fillColor: [10, 25, 47], textColor: [255, 255, 255], fontStyle: 'bold' },
      styles: { fontSize: 9, cellPadding: 3 },
      columnStyles: {
        0: { cellWidth: 30 },
        1: { cellWidth: 50 },
        2: { cellWidth: 25 },
        3: { cellWidth: 20 },
        4: { cellWidth: 'auto' }
      }
    });

    doc.save(`atrasos_${new Date().toLocaleDateString('sv-SE')}.pdf`);
  };

  const generateDailyPDF = (date: string, classes: Record<string, Record<string, LateArrival[]>>) => {
    const doc = new jsPDF();
    const [year, month, day] = date.split('-');
    const formattedDate = `${day}/${month}/${year}`;
    const now = new Date().toLocaleString('pt-BR');

    doc.setFontSize(18);
    doc.text(`Relatório de Atrasos - ${formattedDate}`, 14, 20);
    doc.setFontSize(10);
    doc.text('C. E. São José', 14, 28);
    doc.text(`Gerado em: ${now}`, 14, 34);

    const tableData: any[] = [];
    
    Object.entries(classes).forEach(([className, students]) => {
      Object.entries(students).forEach(([studentName, arrivals]) => {
        arrivals.forEach(late => {
          tableData.push([
            className,
            studentName,
            late.time,
            late.reason
          ]);
        });
      });
    });

    autoTable(doc, {
      startY: 40,
      head: [['Turma', 'Aluno', 'Hora', 'Motivo']],
      body: tableData,
      theme: 'grid',
      headStyles: { fillStyle: 'F', fillColor: [10, 25, 47], textColor: [255, 255, 255], fontStyle: 'bold' },
      styles: { fontSize: 9, cellPadding: 3 },
      columnStyles: {
        0: { cellWidth: 30 },
        1: { cellWidth: 50 },
        2: { cellWidth: 20 },
        3: { cellWidth: 'auto' }
      }
    });

    doc.save(`atrasos_${date}.pdf`);
  };

  const generateStudentReportPDF = (student: Student) => {
    const doc = new jsPDF();
    const now = new Date().toLocaleString('pt-BR');
    const studentArrivals = state.lateArrivals
      .filter(late => late.studentId === student.id)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    const classGroup = state.classes.find(c => c.id === student.classId);
    const className = classGroup?.name || 'Sem Turma';

    doc.setFontSize(18);
    doc.text('Relatório Individual de Atrasos', 14, 20);
    doc.setFontSize(12);
    doc.text(`Aluno: ${student.fullName}`, 14, 30);
    doc.text(`Turma: ${className}`, 14, 37);
    doc.setFontSize(10);
    doc.text(`Gerado em: ${now}`, 14, 45);

    const tableData = studentArrivals.map(late => {
      const [year, month, day] = late.date.split('-');
      return [
        `${day}/${month}/${year}`,
        late.time,
        late.reason
      ];
    });

    autoTable(doc, {
      startY: 52,
      head: [['Data', 'Hora', 'Motivo']],
      body: tableData,
      theme: 'grid',
      headStyles: { fillStyle: 'F', fillColor: [10, 25, 47], textColor: [255, 255, 255], fontStyle: 'bold' },
      styles: { fontSize: 9, cellPadding: 3 },
      columnStyles: {
        0: { cellWidth: 30 },
        1: { cellWidth: 25 },
        2: { cellWidth: 'auto' }
      }
    });

    doc.save(`atrasos_${student.fullName.replace(/\s+/g, '_')}.pdf`);
  };

  const formatDate = (dateStr: string) => {
    const [year, month, day] = dateStr.split('-');
    return `${day}/${month}/${year}`;
  };

  return (
    <div className="max-w-5xl mx-auto space-y-12 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-20">
      <header className="text-center space-y-2">
        <div className="inline-flex p-3 bg-blue-50 rounded-2xl text-blue-600 mb-2">
          <Clock size={32} />
        </div>
        <h2 className="text-4xl font-black text-gray-900 tracking-tight uppercase">Registro de Atraso</h2>
        <p className="text-gray-500 font-bold text-lg">Informe o motivo do atraso do aluno</p>
      </header>

      {/* Relatório por Aluno */}
      {currentUser && [UserRole.ADMIN, UserRole.DIRETOR, UserRole.PEDAGOGO].includes(currentUser.role) && (
        <div className="space-y-6">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
              <User size={20} />
            </div>
            <h3 className="text-2xl font-black text-gray-900 uppercase tracking-tight">Relatório por Aluno</h3>
          </div>

          <div className="bg-white p-8 rounded-[32px] border border-gray-100 shadow-sm space-y-6">
            <div className="max-w-md space-y-4">
              <label className="text-[13px] font-black text-gray-400 uppercase tracking-widest">Buscar Aluno para Relatório</label>
              <div className="relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                <input 
                  type="text"
                  placeholder="Nome do aluno..."
                  value={reportSearchTerm}
                  onChange={(e) => setReportSearchTerm(e.target.value)}
                  className="w-full pl-12 pr-4 py-4 bg-gray-50 rounded-2xl border border-gray-100 outline-none focus:ring-2 focus:ring-blue-500 font-bold text-gray-700"
                />
              </div>

              {reportSearchTerm.length >= 3 && !reportSelectedStudent && (
                <div className="space-y-2 mt-2 max-h-48 overflow-y-auto pr-2">
                  {filteredReportStudents.map(student => (
                    <button
                      key={student.id}
                      onClick={() => {
                        setReportSelectedStudent(student);
                        setReportSearchTerm('');
                      }}
                      className="w-full text-left p-4 rounded-xl hover:bg-blue-50 border border-transparent hover:border-blue-100 transition-all"
                    >
                      <p className="font-bold text-gray-900">{student.fullName}</p>
                      <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">
                        {state.classes.find(c => c.id === student.classId)?.name}
                      </p>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {reportSelectedStudent && (
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-6 bg-blue-50 rounded-3xl border border-blue-100 gap-6 animate-in zoom-in duration-300">
                <div className="flex items-center space-x-4">
                  <div className="w-14 h-14 bg-blue-600 text-white rounded-2xl flex items-center justify-center font-black text-xl">
                    {reportSelectedStudent.fullName[0]}
                  </div>
                  <div>
                    <p className="text-lg font-black text-gray-900 leading-tight">{reportSelectedStudent.fullName}</p>
                    <p className="text-xs font-bold text-blue-600 uppercase tracking-widest">
                      {state.classes.find(c => c.id === reportSelectedStudent.classId)?.name}
                    </p>
                  </div>
                </div>
                
                <div className="flex items-center space-x-3 w-full sm:w-auto">
                  <button
                    onClick={() => setReportSelectedStudent(null)}
                    className="flex-1 sm:flex-none px-6 py-3 bg-white text-gray-500 rounded-xl font-black text-[11px] uppercase tracking-widest border border-gray-200 hover:bg-gray-50 transition-all"
                  >
                    Limpar
                  </button>
                  <button
                    onClick={() => generateStudentReportPDF(reportSelectedStudent)}
                    className="flex-1 sm:flex-none flex items-center justify-center space-x-2 bg-gray-900 text-white px-6 py-3 rounded-xl font-black text-[11px] uppercase tracking-widest hover:bg-gray-800 transition-all shadow-lg shadow-gray-200"
                  >
                    <FileDown size={18} />
                    <span>Gerar Relatório</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      <div className="pt-8 border-t border-gray-100">
        {success ? (
          <div className="bg-green-50 border-2 border-green-100 p-12 rounded-[40px] text-center space-y-4 animate-in zoom-in duration-300">
            <div className="flex justify-center">
              <CheckCircle2 size={80} className="text-green-500" />
            </div>
            <h3 className="text-2xl font-black text-green-800 uppercase tracking-tight">Registro Salvo com Sucesso!</h3>
            <p className="text-green-600 font-bold">O atraso foi armazenado no sistema.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Busca de Aluno */}
            <div className="bg-white p-8 rounded-[32px] shadow-xl shadow-blue-900/5 border border-gray-100 space-y-6">
              <div className="space-y-4">
                <label className="text-[13px] font-black text-gray-400 uppercase tracking-[0.2em] flex items-center">
                  <Search size={14} className="mr-2" /> Buscar Aluno
                </label>
                <div className="relative">
                  <input 
                    type="text"
                    placeholder="Digite o nome do aluno..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full bg-gray-50 border-2 border-transparent focus:border-blue-500 focus:bg-white rounded-2xl px-6 py-4 font-bold text-gray-800 outline-none transition-all"
                  />
                </div>
              </div>

              <div className="space-y-2 min-h-[200px]">
                {selectedStudent ? (
                  <div className="p-6 bg-blue-600 rounded-2xl text-white shadow-lg shadow-blue-500/30 animate-in zoom-in duration-200">
                    <div className="flex items-center justify-between mb-4">
                      <User size={24} className="opacity-50" />
                      <button 
                        onClick={() => setSelectedStudent(null)}
                        className="text-[11px] font-black uppercase tracking-widest bg-white/20 px-3 py-1 rounded-full hover:bg-white/30 transition-colors"
                      >
                        Trocar Aluno
                      </button>
                    </div>
                    <p className="text-xl font-black leading-tight">{selectedStudent.fullName}</p>
                    <p className="text-[13px] font-bold opacity-70 mt-1 uppercase tracking-widest">
                      {state.classes.find(c => c.id === selectedStudent.classId)?.name || 'Turma não encontrada'}
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {filteredStudents.map(student => (
                      <button
                        key={student.id}
                        onClick={() => setSelectedStudent(student)}
                        className="w-full text-left p-4 rounded-2xl hover:bg-blue-50 border border-transparent hover:border-blue-100 transition-all group"
                      >
                        <p className="font-bold text-gray-900 group-hover:text-blue-700">{student.fullName}</p>
                        <p className="text-[11px] font-black text-gray-400 uppercase tracking-widest mt-0.5">
                          {state.classes.find(c => c.id === student.classId)?.name}
                        </p>
                      </button>
                    ))}
                    {searchTerm.length >= 3 && filteredStudents.length === 0 && (
                      <p className="text-center py-8 text-gray-400 font-bold uppercase text-[12px] tracking-widest">Nenhum aluno encontrado</p>
                    )}
                    {searchTerm.length > 0 && searchTerm.length < 3 && (
                      <p className="text-center py-8 text-gray-400 font-bold uppercase text-[12px] tracking-widest">Digite pelo menos 3 letras</p>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Motivo do Atraso */}
            <div className="bg-white p-8 rounded-[32px] shadow-xl shadow-blue-900/5 border border-gray-100 space-y-6">
              <div className="space-y-4">
                <label className="text-[13px] font-black text-gray-400 uppercase tracking-[0.2em] flex items-center">
                  <Clock size={14} className="mr-2" /> Selecione o Motivo
                </label>
                <div className="space-y-3">
                  {reasons.map(reason => (
                    <button
                      key={reason}
                      onClick={() => setSelectedReason(reason)}
                      className={`w-full text-left p-5 rounded-2xl font-bold transition-all border-2 ${
                        selectedReason === reason 
                        ? 'bg-blue-50 border-blue-500 text-blue-700 shadow-md' 
                        : 'bg-gray-50 border-transparent text-gray-600 hover:bg-gray-100'
                      }`}
                    >
                      {reason}
                    </button>
                  ))}
                </div>
              </div>

              <div className="pt-4">
                <button
                  onClick={handleSave}
                  disabled={!selectedStudent || !selectedReason || busy}
                  className="w-full bg-blue-600 text-white py-5 rounded-2xl font-black text-[15px] uppercase tracking-[0.2em] shadow-xl shadow-blue-500/30 hover:bg-blue-700 transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-3"
                >
                  {busy ? <Loader2 className="animate-spin" size={20} /> : <Save size={20} />}
                  <span>Salvar Registro</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Relação de Atrasados - Apenas para ADMIN, DIRETOR e PEDAGOGO */}
      {currentUser && [UserRole.ADMIN, UserRole.DIRETOR, UserRole.PEDAGOGO].includes(currentUser.role) && (
        <div className="space-y-6 pt-8 border-t border-gray-100">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <h3 className="text-2xl font-black text-gray-900 uppercase tracking-tight">Relação de Atrasados</h3>
            <button
              onClick={generatePDF}
              disabled={state.lateArrivals.length === 0}
              className="flex items-center justify-center space-x-2 bg-gray-900 text-white px-6 py-3 rounded-2xl font-black text-[12px] uppercase tracking-widest hover:bg-gray-800 transition-all active:scale-95 disabled:opacity-50"
            >
              <FileDown size={18} />
              <span>Gerar PDF</span>
            </button>
          </div>

          <div className="space-y-4">
            {Object.entries(groupedLateArrivals).length === 0 ? (
              <div className="bg-white p-12 rounded-[32px] text-center border border-dashed border-gray-200">
                <p className="text-gray-400 font-black uppercase text-[13px] tracking-widest">Nenhum registro de atraso encontrado.</p>
              </div>
            ) : (
              Object.entries(groupedLateArrivals).map(([date, classes]) => {
                const totalStudents = Object.values(classes).reduce((acc, students) => acc + Object.keys(students).length, 0);
                return (
                  <div key={date} className="bg-white rounded-[32px] border border-gray-100 overflow-hidden shadow-sm">
                    <div className="flex items-center pr-6">
                      <button
                        onClick={() => toggleDate(date)}
                        className="flex-1 flex items-center justify-between p-6 hover:bg-gray-50 transition-colors"
                      >
                        <div className="flex items-center space-x-4">
                          <div className="w-10 h-10 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center">
                            <Calendar size={20} />
                          </div>
                          <div className="flex items-center space-x-3">
                            <span className="text-lg font-black text-gray-900 uppercase tracking-tight">{formatDate(date)}</span>
                            <span className="px-2.5 py-0.5 bg-blue-100 text-blue-700 text-[11px] font-black rounded-full uppercase tracking-widest">
                              {totalStudents} {totalStudents === 1 ? 'Aluno' : 'Alunos'}
                            </span>
                          </div>
                        </div>
                        {expandedDates[date] ? <ChevronDown className="text-gray-400" /> : <ChevronRight className="text-gray-400" />}
                      </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        generateDailyPDF(date, classes);
                      }}
                      className="p-3 bg-gray-100 text-gray-600 rounded-xl hover:bg-gray-200 transition-all flex items-center space-x-2"
                      title="Gerar PDF do dia"
                    >
                      <FileDown size={18} />
                      <span className="text-[10px] font-black uppercase tracking-widest hidden sm:inline">PDF</span>
                    </button>
                  </div>

                  {expandedDates[date] && (
                    <div className="p-6 space-y-8 animate-in slide-in-from-top-2 duration-200">
                      {Object.entries(classes).map(([className, students]) => (
                        <div key={className} className="space-y-4">
                          <div className="flex items-center space-x-2 text-gray-900 border-b border-gray-50 pb-2">
                            <GraduationCap size={16} className="text-blue-600" />
                            <span className="font-black uppercase text-[14px] tracking-tight">{className}</span>
                          </div>
                          
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {Object.entries(students).map(([studentName, arrivals]) => (
                              <div key={studentName} className="space-y-3">
                                <div className="flex items-center space-x-2 text-blue-600">
                                  <User size={14} />
                                  <span className="font-black uppercase text-[12px] tracking-widest">{studentName}</span>
                                </div>
                                <div className="space-y-2 pl-4">
                                  {arrivals.map(late => (
                                    <div key={late.id} className="bg-gray-50 p-4 rounded-2xl border border-gray-100 flex flex-col space-y-2">
                                      <div className="flex items-center justify-between">
                                        <div className="flex items-center space-x-2 text-blue-600">
                                          <Clock size={12} />
                                          <span className="text-[12px] font-black">{late.time}</span>
                                        </div>
                                        {currentUser?.role === UserRole.ADMIN && (
                                          <button
                                            onClick={() => handleDelete(late.id)}
                                            className="p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
                                            title="Excluir Registro"
                                          >
                                            <Trash2 size={12} />
                                          </button>
                                        )}
                                      </div>
                                      <p className="text-[13px] font-bold text-gray-700 leading-tight">
                                        {late.reason}
                                      </p>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })
            )}
          </div>
        </div>
      )}

      <footer className="flex flex-col sm:flex-row items-center justify-center gap-6 text-gray-400 font-black text-[11px] uppercase tracking-[0.2em]">
        <div className="flex items-center">
          <Calendar size={14} className="mr-2" />
          {new Date().toLocaleDateString('pt-BR')}
        </div>
        <div className="flex items-center">
          <Clock size={14} className="mr-2" />
          {new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
        </div>
      </footer>
    </div>
  );
};

// Re-using GraduationCap icon from lucide-react (already imported in App.tsx but let's make sure it's available here)
const GraduationCap = ({ size }: { size: number }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 10v6M2 10l10-5 10 5-10 5z"/><path d="M6 12v5c3 3 9 3 12 0v-5"/></svg>
);

export default LateArrivals;
