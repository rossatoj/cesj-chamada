
import React, { useMemo, useState } from 'react';
import { useApp } from '../AppContext';
import { UserRole, StudentStatus } from '../types';
import { UserMinus, Calendar, Search, Filter, ChevronDown } from 'lucide-react';

const Absentees: React.FC = () => {
  const { state, currentUser } = useApp();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedClassId, setSelectedClassId] = useState<string>('all');
  
  // Get current year
  const currentYear = new Date().getFullYear().toString();
  const [selectedYear, setSelectedYear] = useState(currentYear);

  const absenteesData = useMemo(() => {
    // Pre-calculate yearly absences and yearly certificate counts for all students in the selected year
    const yearlyAbsencesMap: Record<string, string[]> = {};
    state.attendance.forEach(a => {
      if (a.date.startsWith(selectedYear) && !a.isPresent && (a.type === 'regular' || !a.type)) {
        if (!yearlyAbsencesMap[a.studentId]) yearlyAbsencesMap[a.studentId] = [];
        yearlyAbsencesMap[a.studentId].push(a.date);
      }
    });

    const yearlyRealAbsencesMap: Record<string, number> = {};
    const yearlyCertificatesMap: Record<string, number> = {};
    Object.entries(yearlyAbsencesMap).forEach(([studentId, dates]) => {
      const certCount = dates.filter(date => 
        state.certificates.some(cert => 
          cert.studentId === studentId && date >= cert.startDate && date <= cert.endDate
        )
      ).length;
      yearlyCertificatesMap[studentId] = certCount;
      yearlyRealAbsencesMap[studentId] = dates.length - certCount;
    });

    // Map to student details and filter by search/class/status
    return Object.entries(yearlyAbsencesMap).map(([studentId, dates]) => {
      const student = state.students.find(s => s.id === studentId);
      if (!student) return null;
      
      // Exclude inactive students
      if (
        student.status === StudentStatus.TRANSFERIDO || 
        student.status === StudentStatus.REMANEJADO || 
        student.status === StudentStatus.CONCLUINTE
      ) return null;
      
      const turma = state.classes.find(c => c.id === student.classId);
      
      // Filter by class
      if (selectedClassId !== 'all' && student.classId !== selectedClassId) return null;
      
      // Filter by search term
      if (searchTerm && !student.fullName.toLowerCase().includes(searchTerm.toLowerCase())) return null;

      // Filter by AETE role restrictions (if applicable)
      if (currentUser?.role === UserRole.AETE && turma?.name.toUpperCase() !== 'AETE') return null;
      if (currentUser?.role !== UserRole.AETE && currentUser?.role !== UserRole.ADMIN && currentUser?.role !== UserRole.PEDAGOGO && currentUser?.role !== UserRole.DIRETOR && turma?.name.toUpperCase() === 'AETE') return null;

      return {
        student,
        turma,
        dates: dates.sort((a, b) => b.localeCompare(a)), // Sort dates descending
        yearlyCount: dates.length,
        yearlyCertCount: yearlyCertificatesMap[studentId] || 0,
        realAbsences: yearlyRealAbsencesMap[studentId] || 0
      };
    })
    .filter((item): item is NonNullable<typeof item> => item !== null)
    .sort((a, b) => {
      const classA = a.turma?.name || '';
      const classB = b.turma?.name || '';
      if (classA !== classB) return classA.localeCompare(classB);
      
      const numA = a.student.callNumber || '';
      const numB = b.student.callNumber || '';
      if (numA && numB) return numA.localeCompare(numB);
      
      return a.student.fullName.localeCompare(b.student.fullName);
    });
  }, [state.attendance, state.students, state.classes, state.certificates, selectedYear, selectedClassId, searchTerm, currentUser]);

  const groupedAbsentees = useMemo(() => {
    const groups: Record<string, typeof absenteesData> = {};
    
    absenteesData.forEach(item => {
      const classId = item.turma?.id || 'unassigned';
      if (!groups[classId]) groups[classId] = [];
      groups[classId].push(item);
    });

    return groups;
  }, [absenteesData]);

  const filteredClasses = useMemo(() => {
    if (currentUser?.role === UserRole.AETE) {
      return state.classes.filter(c => c.name.toUpperCase() === 'AETE');
    }
    if (currentUser?.role === UserRole.ADMIN || currentUser?.role === UserRole.PEDAGOGO || currentUser?.role === UserRole.DIRETOR) {
      return state.classes;
    }
    return state.classes.filter(c => c.name.toUpperCase() !== 'AETE');
  }, [state.classes, currentUser]);

  const sortedGroupKeys = useMemo(() => {
    return Object.keys(groupedAbsentees).sort((a, b) => {
      if (a === 'unassigned') return 1;
      if (b === 'unassigned') return -1;
      const nameA = state.classes.find(c => c.id === a)?.name || '';
      const nameB = state.classes.find(c => c.id === b)?.name || '';
      return nameA.localeCompare(nameB);
    });
  }, [groupedAbsentees, state.classes]);

  const formatDate = (dateStr: string) => {
    const [, month, day] = dateStr.split('-');
    return `${day}/${month}`;
  };

  const hasCertificate = (studentId: string, dateStr: string) => {
    return state.certificates.some(cert => {
      if (cert.studentId !== studentId) return false;
      return dateStr >= cert.startDate && dateStr <= cert.endDate;
    });
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-3xl font-black text-gray-900 tracking-tight">Alunos Faltosos</h2>
          <p className="text-gray-500 font-medium">Controle de ausências no ano de referência</p>
        </div>
        <div className="flex items-center space-x-3 bg-white p-2 rounded-2xl border border-gray-100 shadow-sm">
          <Calendar size={18} className="text-blue-600 ml-2" />
          <select 
            value={selectedYear}
            onChange={(e) => setSelectedYear(e.target.value)}
            className="border-none outline-none font-bold text-gray-700 bg-transparent text-[15px] pr-4"
          >
            {[...Array(5)].map((_, i) => {
              const year = (new Date().getFullYear() - i).toString();
              return <option key={year} value={year}>{year}</option>;
            })}
          </select>
        </div>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="md:col-span-2 relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
          <input 
            type="text"
            placeholder="Buscar aluno pelo nome..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-12 pr-4 py-4 bg-white rounded-2xl border border-gray-100 shadow-sm outline-none focus:ring-2 focus:ring-blue-500 transition-all font-medium text-[15px]"
          />
        </div>
        <div className="relative">
          <Filter className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
          <select
            value={selectedClassId}
            onChange={(e) => setSelectedClassId(e.target.value)}
            className="w-full pl-12 pr-4 py-4 bg-white rounded-2xl border border-gray-100 shadow-sm outline-none focus:ring-2 focus:ring-blue-500 transition-all font-bold text-gray-700 appearance-none text-[15px]"
          >
            <option value="all">Todas as Turmas</option>
            {filteredClasses.map(c => (
              <option key={c.id} value={c.id}>{c.name} ({c.shift || 'N/A'})</option>
            ))}
          </select>
          <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" size={20} />
        </div>
      </div>

      <div className="space-y-8">
        {sortedGroupKeys.map(classId => {
          const students = groupedAbsentees[classId];
          const turma = state.classes.find(c => c.id === classId);
          const className = classId === 'unassigned' ? 'Sem Turma' : (turma?.name || 'Turma Desconhecida');

          return (
            <div key={classId} className="bg-white rounded-3xl shadow-xl border border-gray-100 overflow-hidden">
              <div className="bg-gray-50 px-8 py-4 border-b border-gray-100 flex justify-between items-center">
                <div className="flex items-center space-x-3">
                  <h3 className="text-xl font-black text-gray-800 uppercase tracking-tight">{className}</h3>
                  {turma && (
                    <span className="text-[11px] font-black bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full uppercase tracking-widest">
                      {turma.shift || 'N/A'}
                    </span>
                  )}
                </div>
                <span className="bg-blue-100 text-blue-700 px-3 py-1 rounded-full text-[13px] font-black uppercase">
                  {students.length} {students.length === 1 ? 'Aluno' : 'Alunos'}
                </span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead className="bg-gray-50/50 border-b border-gray-100">
                    <tr className="text-[12px] font-black text-gray-400 uppercase tracking-widest">
                      <th className="px-8 py-4">Nº / Aluno</th>
                      <th className="px-8 py-4 text-center">Total de Faltas</th>
                      <th className="px-8 py-4 text-center">Dias com Atestados</th>
                      <th className="px-8 py-4 text-center" title="Total de faltas no ano subtraindo os atestados do ano">Faltas Reais</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {students.map(({ student, dates, realAbsences, yearlyCount, yearlyCertCount }) => (
                      <tr key={student.id} className="hover:bg-blue-50/30 transition-colors group">
                        <td className="px-8 py-5">
                          <div className="flex items-center space-x-4">
                            <div className="w-10 h-10 bg-red-50 text-red-600 rounded-xl flex items-center justify-center font-black text-md shadow-sm border border-red-100 group-hover:scale-110 transition-transform">
                              {student.callNumber || student.fullName[0]}
                            </div>
                            <div>
                              <p className="font-bold text-gray-900 text-[15px] leading-tight">{student.fullName}</p>
                              <p className="text-[11px] font-black text-gray-400 uppercase tracking-widest mt-0.5">CGM: {student.cgm}</p>
                              <div className="flex flex-wrap gap-1 mt-2">
                                {dates.map(date => {
                                  const isCovered = hasCertificate(student.id, date);
                                  return (
                                    <span 
                                      key={date} 
                                      className={`px-1.5 py-0.5 rounded text-[10px] font-bold border ${
                                        isCovered 
                                          ? 'bg-yellow-100 text-yellow-700 border-yellow-200' 
                                          : 'bg-red-50 text-red-600 border-red-100'
                                      }`}
                                      title={isCovered ? 'Afastamento por Atestado Médico' : undefined}
                                    >
                                      {formatDate(date)}
                                    </span>
                                  );
                                })}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="px-8 py-5 text-center">
                          <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-gray-100 text-gray-600 font-black text-sm border border-gray-200">
                            {yearlyCount}
                          </span>
                        </td>
                        <td className="px-8 py-5 text-center">
                          <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-yellow-50 text-yellow-700 font-black text-sm border border-yellow-100">
                            {yearlyCertCount}
                          </span>
                        </td>
                        <td className="px-8 py-5 text-center" title="Saldo anual de faltas (Anual - Atestados do Ano)">
                          <span className={`inline-flex items-center justify-center w-8 h-8 rounded-full font-black text-sm ${
                            realAbsences > 0 ? 'bg-blue-100 text-blue-700' : 'bg-green-100 text-green-700'
                          }`}>
                            {realAbsences}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          );
        })}

        {absenteesData.length === 0 && (
          <div className="bg-white rounded-3xl shadow-xl border border-gray-100 p-20 text-center">
            <div className="flex flex-col items-center space-y-4">
              <div className="p-6 bg-gray-50 rounded-full text-gray-300">
                <UserMinus size={48} />
              </div>
              <p className="text-gray-400 font-black text-[15px] uppercase tracking-widest">Nenhum aluno faltoso encontrado neste período.</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Absentees;
