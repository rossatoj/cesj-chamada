
import React, { useState } from 'react';
import { useApp } from '../App';
import { ClassGroup, Student, AttendanceRecord, StudentStatus } from '../types';
import { ArrowLeft, Save, ClipboardCheck, Loader2, Calendar, UserCheck } from 'lucide-react';

const AttendanceRecording: React.FC = () => {
  const { state, persistAttendance } = useApp();
  const [selectedClass, setSelectedClass] = useState<ClassGroup | null>(null);
  // Ajuste para o fuso de Brasília (America/Sao_Paulo)
  const [date, setDate] = useState(new Date().toLocaleDateString('sv-SE', { timeZone: 'America/Sao_Paulo' }));
  const [currentAttendance, setCurrentAttendance] = useState<Record<string, boolean>>({});
  const [busy, setBusy] = useState(false);

  const handleSelectClass = (cls: ClassGroup) => {
    setSelectedClass(cls);
    const existing = state.attendance.filter(a => a.classId === cls.id && a.date === date);
    const initial: Record<string, boolean> = {};
    state.students.filter(s => s.classId === cls.id).forEach(s => {
      const record = existing.find(a => a.studentId === s.id);
      initial[s.id] = record ? record.isPresent : true;
    });
    setCurrentAttendance(initial);
  };

  const saveAttendance = async () => {
    if (!selectedClass) return;
    setBusy(true);

    try {
      const newRecords: AttendanceRecord[] = Object.entries(currentAttendance).map(([studentId, isPresent]) => ({
        id: `${selectedClass.id}-${studentId}-${date}`,
        classId: selectedClass.id,
        studentId,
        date,
        isPresent: isPresent as boolean
      }));

      await persistAttendance(newRecords);
      alert('Frequência salva no Firestore!');
      setSelectedClass(null);
    } catch (err) {
      alert('Erro ao salvar frequência.');
    } finally {
      setBusy(false);
    }
  };

  const formatDate = (dateStr: string) => {
    if (!dateStr) return '--/--/----';
    const [year, month, day] = dateStr.split('-');
    return `${day}/${month}/${year}`;
  };

  const getStatusLabel = (status: StudentStatus) => {
    if (status === StudentStatus.TRANSFERIDO) return 'TRANSFERÊNCIA';
    return status;
  };

  const renderAttendanceIndicator = (student: Student) => {
    if (student.status !== StudentStatus.MATRICULADO) {
      const text = student.status === StudentStatus.SEM_FREQUENCIA ? 'SF' : student.status[0];
      return <div className="w-10 h-10 rounded-lg flex items-center justify-center text-lg font-black bg-gray-100 text-gray-400 border-2 border-gray-200 cursor-not-allowed" title="Situação impeditiva para chamada">{text}</div>;
    }
    const isPresent = currentAttendance[student.id];
    return (
      <button 
        type="button" 
        onClick={() => setCurrentAttendance(p => ({ ...p, [student.id]: !isPresent }))}
        className={`w-10 h-10 rounded-lg flex items-center justify-center text-lg font-black transition-all transform active:scale-90 ${isPresent ? 'bg-green-100 text-green-700 border-2 border-green-200 shadow-sm shadow-green-200/50' : 'bg-red-100 text-red-700 border-2 border-red-200 shadow-sm shadow-red-200/50'}`}
      >
        {isPresent ? 'C' : 'F'}
      </button>
    );
  };

  if (selectedClass) {
    const weekday = new Date(date + 'T00:00:00').toLocaleDateString('pt-BR', { weekday: 'long' });
    const displayDate = `${formatDate(date)} - ${weekday}`;

    return (
      <div className="space-y-6 animate-in fade-in duration-300">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center space-x-4">
            <button 
              onClick={() => setSelectedClass(null)} 
              className="p-3 bg-white hover:bg-gray-50 border border-gray-100 rounded-2xl shadow-sm text-blue-600 transition-all active:scale-95"
              title="Voltar para Turmas"
            >
              <ArrowLeft size={20} />
            </button>
            <div>
              <h2 className="text-3xl font-black text-gray-900 leading-none tracking-tight">{selectedClass.name}</h2>
              <p className="text-[11px] font-bold text-blue-600 uppercase tracking-widest flex items-center mt-2 bg-blue-50 w-fit px-3 py-1 rounded-full border border-blue-100">
                <Calendar size={12} className="mr-2" />
                <span className="opacity-80">{displayDate}</span>
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-3xl shadow-xl overflow-hidden border border-gray-100">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr className="text-[10px] font-black text-gray-400 uppercase tracking-widest">
                <th className="px-6 py-4 text-left">Aluno / CGM</th>
                <th className="px-6 py-4 text-center">Nascimento</th>
                <th className="px-6 py-4 text-center">Situação</th>
                <th className="px-6 py-4 text-center">Frequência</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {state.students
                .filter(s => s.classId === selectedClass.id)
                .sort((a, b) => a.fullName.localeCompare(b.fullName))
                .map(student => (
                <tr key={student.id} className="hover:bg-blue-50/30 transition-colors">
                  <td className="px-6 py-4">
                    <p className="font-bold text-gray-900 text-sm leading-tight">{student.fullName}</p>
                    <p className="text-[9px] font-black text-gray-400 uppercase tracking-tighter mt-0.5">CGM: {student.cgm}</p>
                  </td>
                  <td className="px-6 py-4 text-center text-xs font-bold text-gray-600">
                    {formatDate(student.birthDate)}
                  </td>
                  <td className="px-6 py-4 text-center">
                    <span className={`text-[8px] font-black px-2 py-1 rounded-md uppercase tracking-widest border ${
                      student.status === StudentStatus.MATRICULADO 
                      ? 'bg-green-50 text-green-600 border-green-100' 
                      : 'bg-yellow-50 text-yellow-600 border-yellow-100'
                    }`}>
                      {getStatusLabel(student.status)}
                    </span>
                  </td>
                  <td className="px-6 py-4 flex justify-center">
                    {renderAttendanceIndicator(student)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="flex justify-end pt-4">
          <button 
            onClick={saveAttendance} 
            disabled={busy} 
            className="flex items-center space-x-3 bg-blue-600 text-white px-10 py-4 rounded-2xl font-black text-[10px] uppercase tracking-[0.2em] shadow-xl shadow-blue-500/30 hover:bg-blue-700 transition-all active:scale-95 disabled:opacity-50"
          >
            {busy ? <Loader2 className="animate-spin" size={18} /> : <Save size={18} />}
            <span>Finalizar Registro de Frequência</span>
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <header>
        <h2 className="text-3xl font-black text-gray-900 tracking-tight">Registrar Frequência</h2>
        <p className="text-gray-500 font-medium">Selecione a turma para iniciar a chamada</p>
      </header>
      
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex items-center space-x-6">
        <div className="space-y-1">
          <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest flex items-center">
            <Calendar size={12} className="mr-1" /> Data do Registro
          </label>
          <input 
            type="date" 
            value={date} 
            onChange={e => setDate(e.target.value)} 
            className="border-2 border-gray-50 rounded-xl px-4 py-2 outline-none bg-gray-50 text-gray-800 font-bold focus:border-blue-500 focus:bg-white transition-all" 
          />
        </div>
        <div className="flex-1 border-l border-gray-100 pl-6 hidden md:block">
          <p className="text-[10px] font-black text-blue-600 uppercase tracking-[0.2em]">Dica de Uso</p>
          <p className="text-xs text-gray-500 mt-1">Clique em <span className="font-bold text-green-600">C</span> para Comparecimento ou <span className="font-bold text-red-600">F</span> para Falta.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {state.classes.map(cls => {
          const classStudents = state.students.filter(s => s.classId === cls.id);
          const matriculadosCount = classStudents.filter(s => s.status === StudentStatus.MATRICULADO).length;
          
          return (
            <button 
              key={cls.id} 
              onClick={() => handleSelectClass(cls)} 
              className="bg-white p-8 rounded-3xl border border-gray-100 hover:border-blue-500 transition-all text-center shadow-sm group hover:shadow-xl hover:shadow-blue-500/5 relative overflow-hidden"
            >
              <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                <UserCheck size={80} />
              </div>
              <div className="w-16 h-16 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform duration-500">
                <ClipboardCheck size={32} />
              </div>
              <h3 className="text-xl font-black text-gray-900 uppercase tracking-tighter">{cls.name}</h3>
              <div className="mt-2 flex flex-col space-y-1">
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{classStudents.length} Alunos Totais</p>
                <p className="text-[9px] font-black text-blue-500 uppercase tracking-widest">{matriculadosCount} Ativos para Chamada</p>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default AttendanceRecording;
