
import React, { useState } from 'react';
import { useApp } from '../App';
import { ClassGroup, Student, AttendanceRecord, StudentStatus } from '../types';
import { ArrowLeft, Save, ClipboardCheck } from 'lucide-react';

const AttendanceRecording: React.FC = () => {
  const { state, setState } = useApp();
  const [selectedClass, setSelectedClass] = useState<ClassGroup | null>(null);
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [currentAttendance, setCurrentAttendance] = useState<Record<string, boolean>>({});

  const handleSelectClass = (cls: ClassGroup) => {
    setSelectedClass(cls);
    
    // Load existing attendance for that date if any
    const existing = state.attendance.filter(a => a.classId === cls.id && a.date === date);
    const initial: Record<string, boolean> = {};
    
    state.students
      .filter(s => s.classId === cls.id)
      .forEach(s => {
        const record = existing.find(a => a.studentId === s.id);
        // Default to present (true/C) for all students if no record exists
        // Prompt says "todos os alunos matriculados estarão com a letra C" initially.
        initial[s.id] = record ? record.isPresent : true;
      });
      
    setCurrentAttendance(initial);
  };

  const toggleAttendance = (studentId: string) => {
    const student = state.students.find(s => s.id === studentId);
    // Only MATRICULADO students can have their attendance toggled
    if (student?.status !== StudentStatus.MATRICULADO) return;

    setCurrentAttendance(prev => ({
      ...prev,
      [studentId]: !prev[studentId]
    }));
  };

  const saveAttendance = () => {
    if (!selectedClass) return;

    const newRecords: AttendanceRecord[] = Object.entries(currentAttendance).map(([studentId, isPresent]) => ({
      id: `${selectedClass.id}-${studentId}-${date}`,
      classId: selectedClass.id,
      studentId,
      date,
      isPresent: isPresent as boolean
    }));

    setState(prev => {
      const filtered = prev.attendance.filter(a => !(a.classId === selectedClass.id && a.date === date));
      return {
        ...prev,
        attendance: [...filtered, ...newRecords]
      };
    });

    alert('Frequência salva com sucesso!');
    setSelectedClass(null);
  };

  const renderAttendanceIndicator = (student: Student) => {
    // 1 - REMANEJADO: Letra R em amarelo escuro com fundo amarelo claro
    if (student.status === StudentStatus.REMANEJADO) {
      return (
        <div className="w-12 h-12 rounded-lg flex items-center justify-center text-2xl font-bold bg-yellow-100 text-yellow-800 border-2 border-yellow-200 shadow-sm cursor-default">
          R
        </div>
      );
    }
    // 2 - TRANSFERIDO: Letra T em amarelo escuro com fundo amarelo claro
    if (student.status === StudentStatus.TRANSFERIDO) {
      return (
        <div className="w-12 h-12 rounded-lg flex items-center justify-center text-2xl font-bold bg-yellow-100 text-yellow-800 border-2 border-yellow-200 shadow-sm cursor-default">
          T
        </div>
      );
    }
    // 3 - SEM FREQUÊNCIA: Letras SF em amarelo escuro com fundo amarelo claro
    if (student.status === StudentStatus.SEM_FREQUENCIA) {
      return (
        <div className="w-12 h-12 rounded-lg flex items-center justify-center text-xl font-bold bg-yellow-100 text-yellow-800 border-2 border-yellow-200 shadow-sm cursor-default">
          SF
        </div>
      );
    }

    // Default: MATRICULADO - Letra C (Verde) ou F (Vermelho)
    // Toggling happens automatically when clicking C
    return (
      <button
        type="button"
        onClick={() => toggleAttendance(student.id)}
        className={`
          w-12 h-12 rounded-lg flex items-center justify-center text-2xl font-bold transition-all shadow-sm
          ${currentAttendance[student.id] 
            ? 'bg-green-100 text-green-800 border-2 border-green-200 hover:bg-green-200' 
            : 'bg-red-100 text-red-800 border-2 border-red-200 hover:bg-red-200'
          }
        `}
      >
        {currentAttendance[student.id] ? 'C' : 'F'}
      </button>
    );
  };

  if (selectedClass) {
    const classStudents = state.students.filter(s => s.classId === selectedClass.id);

    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <button onClick={() => setSelectedClass(null)} className="flex items-center text-blue-600 hover:text-blue-800">
            <ArrowLeft size={20} className="mr-2" /> Voltar
          </button>
          <div className="text-right">
            <h2 className="text-2xl font-bold">{selectedClass.name}</h2>
            <p className="text-gray-500">{new Date(date).toLocaleDateString('pt-BR')}</p>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-md overflow-hidden border border-gray-200">
          <table className="w-full text-left">
            <thead className="bg-gray-100 border-b border-gray-200">
              <tr>
                <th className="px-6 py-4 font-semibold text-gray-700">Aluno</th>
                <th className="px-6 py-4 font-semibold text-gray-700 text-center">Frequência</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {classStudents.map(student => (
                <tr key={student.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4">
                    <div>
                      <p className="font-medium text-gray-900">{student.fullName}</p>
                      <div className="flex space-x-2 items-center">
                        <p className="text-xs text-gray-500">CGM: {student.cgm}</p>
                        {student.status !== StudentStatus.MATRICULADO && (
                          <span className="text-[10px] px-1 bg-gray-100 text-gray-600 rounded font-bold uppercase">
                            {student.status}
                          </span>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 flex justify-center">
                    {renderAttendanceIndicator(student)}
                  </td>
                </tr>
              ))}
              {classStudents.length === 0 && (
                <tr>
                  <td colSpan={2} className="px-6 py-12 text-center text-gray-400">Nenhum aluno cadastrado nesta turma.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="flex justify-end">
          <button
            onClick={saveAttendance}
            disabled={classStudents.length === 0}
            className="flex items-center space-x-2 bg-blue-600 text-white px-8 py-3 rounded-lg hover:bg-blue-700 transition-colors shadow-lg disabled:bg-gray-300"
          >
            <Save size={20} />
            <span className="font-semibold">SALVAR FREQUÊNCIA</span>
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <header>
        <h2 className="text-3xl font-bold text-gray-800">Registrar Frequência</h2>
        <p className="text-gray-500">Selecione uma turma para realizar a chamada</p>
      </header>

      <div className="flex flex-col md:flex-row md:items-center space-y-4 md:space-y-0 md:space-x-4 bg-white p-4 rounded-xl shadow-sm border border-gray-100">
        <label className="font-semibold text-gray-700">Data da Chamada:</label>
        <input 
          type="date" 
          value={date} 
          onChange={(e) => setDate(e.target.value)}
          className="border rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 outline-none bg-white text-black"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {state.classes.map(cls => (
          <button
            key={cls.id}
            onClick={() => handleSelectClass(cls)}
            className="bg-white p-8 rounded-2xl shadow-sm border border-gray-200 hover:border-blue-500 hover:shadow-md transition-all text-center group"
          >
            <div className="w-16 h-16 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center mx-auto mb-4 group-hover:bg-blue-600 group-hover:text-white transition-colors">
              <ClipboardCheck size={32} />
            </div>
            <h3 className="text-xl font-bold text-gray-800">{cls.name}</h3>
            <p className="text-gray-500 text-sm mt-1">
              {state.students.filter(s => s.classId === cls.id).length} Alunos
            </p>
          </button>
        ))}
      </div>
    </div>
  );
};

export default AttendanceRecording;
