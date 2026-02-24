
import React, { useState, useMemo } from 'react';
import { useApp } from '../AppContext';
import { FileDown, Table, Calendar } from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { UserRole } from '../types';

const Reports: React.FC = () => {
  const { state, currentUser } = useApp();
  const [filterType, setFilterType] = useState<'daily' | 'weekly' | 'monthly' | 'absentees_daily'>('daily');
  // Ajuste para o fuso de Brasília (America/Sao_Paulo)
  const [selectedDate, setSelectedDate] = useState(new Date().toLocaleDateString('sv-SE', { timeZone: 'America/Sao_Paulo' }));

  const filteredClasses = useMemo(() => {
    if (currentUser?.role === UserRole.AETE) {
      // Perfil AETE vê SOMENTE o relatório da turma AETE
      return state.classes.filter(c => c.name.toUpperCase().trim() === 'AETE');
    }
    // Outros perfis NÃO vêem a turma AETE nos relatórios institucionais
    return state.classes.filter(c => c.name.toUpperCase().trim() !== 'AETE');
  }, [state.classes, currentUser]);

  const reportData = useMemo(() => {
    return filteredClasses.map(turma => {
      const classStudents = state.students.filter(s => s.classId === turma.id);
      const studentCount = classStudents.length;
      
      let filteredAttendance = [];
      if (filterType === 'daily') {
        filteredAttendance = state.attendance.filter(a => a.classId === turma.id && a.date === selectedDate && (a.type === 'regular' || !a.type));
      } else if (filterType === 'weekly') {
        // Simple logic for week: last 7 days from selected
        const dateObj = new Date(selectedDate);
        const sevenDaysAgo = new Date(dateObj);
        sevenDaysAgo.setDate(dateObj.getDate() - 7);
        filteredAttendance = state.attendance.filter(a => 
          a.classId === turma.id && 
          new Date(a.date) >= sevenDaysAgo && 
          new Date(a.date) <= dateObj &&
          (a.type === 'regular' || !a.type)
        );
      } else {
        // Monthly logic
        const targetMonth = selectedDate.substring(0, 7);
        filteredAttendance = state.attendance.filter(a => 
          a.classId === turma.id && 
          a.date.startsWith(targetMonth) &&
          (a.type === 'regular' || !a.type)
        );
      }

      const presenceCount = filteredAttendance.filter(a => a.isPresent).length;
      const absenceCount = filteredAttendance.length - presenceCount;
      const percentage = filteredAttendance.length > 0 ? (presenceCount / filteredAttendance.length) * 100 : 0;

      return {
        turma: turma.name,
        totalAlunos: studentCount,
        presencas: presenceCount,
        faltas: absenceCount,
        porcentagem: percentage.toFixed(1) + '%'
      };
    });
  }, [filteredClasses, state.students, state.attendance, filterType, selectedDate]);

  const absenteesReportData = useMemo(() => {
    if (filterType !== 'absentees_daily') return [];
    
    return filteredClasses.map(turma => {
      const classAttendance = state.attendance.filter(a => 
        a.classId === turma.id && 
        a.date === selectedDate && 
        !a.isPresent && 
        (a.type === 'regular' || !a.type)
      );
      const absentees = classAttendance.map(a => {
        const student = state.students.find(s => s.id === a.studentId);
        return {
          callNumber: student?.callNumber || '--',
          fullName: student?.fullName || 'Desconhecido'
        };
      }).sort((a, b) => {
        if (a.callNumber && b.callNumber) return a.callNumber.localeCompare(b.callNumber);
        return a.fullName.localeCompare(b.fullName);
      });

      return {
        turma: turma.name,
        absentees
      };
    }).filter(t => t.absentees.length > 0);
  }, [filteredClasses, state.attendance, state.students, filterType, selectedDate]);

  const formatDate = (dateStr: string) => {
    if (!dateStr) return '--/--/----';
    const [year, month, day] = dateStr.split('-');
    return `${day}/${month}/${year}`;
  };

  const exportPDF = () => {
    const doc = new jsPDF();
    
    if (filterType === 'absentees_daily') {
      const title = `Relatório de Alunos Faltosos - ${formatDate(selectedDate)}`;
      
      doc.setFontSize(18);
      doc.text('Colégio Estadual São José', 105, 15, { align: 'center' });
      doc.setFontSize(14);
      doc.text(title, 105, 25, { align: 'center' });
      doc.setFontSize(10);
      doc.text(`Gerado em: ${new Date().toLocaleString('pt-BR')}`, 200, 35, { align: 'right' });

      let currentY = 45;

      absenteesReportData.forEach((turmaData) => {
        if (currentY > 250) {
          doc.addPage();
          currentY = 20;
        }

        doc.setFontSize(12);
        doc.setFont('helvetica', 'bold');
        doc.text(`Turma: ${turmaData.turma}`, 14, currentY);
        currentY += 5;

        autoTable(doc, {
          startY: currentY,
          head: [['Nº', 'Nome do Aluno']],
          body: turmaData.absentees.map(a => [a.callNumber, a.fullName]),
          theme: 'grid',
          headStyles: { fillColor: [185, 28, 28] }, // Red for absentees
          margin: { left: 14 },
          styles: { fontSize: 10 }
        });

        currentY = (doc as any).lastAutoTable.finalY + 10;
      });

      doc.save(`faltosos-${selectedDate}.pdf`);
      return;
    }

    const title = `Relatório de Frequência - ${filterType.toUpperCase()} - ${selectedDate}`;
    
    doc.setFontSize(18);
    doc.text('Colégio Estadual São José', 105, 15, { align: 'center' });
    doc.setFontSize(14);
    doc.text(title, 105, 25, { align: 'center' });
    doc.setFontSize(10);
    doc.text(`Gerado em: ${new Date().toLocaleString('pt-BR')}`, 200, 35, { align: 'right' });

    const tableRows = reportData.map(r => [
      r.turma,
      r.totalAlunos.toString(),
      r.presencas.toString(),
      r.faltas.toString(),
      r.porcentagem
    ]);

    autoTable(doc, {
      startY: 40,
      head: [['Turma', 'Alunos', 'Presenças', 'Faltas', 'Freq %']],
      body: tableRows,
      theme: 'striped',
      // Fix: Removing 'fillStyle' property as it is not a valid property in 'Styles' object of jspdf-autotable
      headStyles: { fillColor: [30, 64, 175] }
    });

    doc.save(`relatorio-frequencia-${selectedDate}.pdf`);
  };

  return (
    <div className="space-y-6">
      <header className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-bold text-gray-800">Relatórios</h2>
          <p className="text-gray-500">Acompanhamento de presença {currentUser?.role === UserRole.AETE ? ' - Turma AETE' : '(Exceto AETE)'}</p>
        </div>
        <button
          onClick={exportPDF}
          disabled={reportData.length === 0}
          className="flex items-center space-x-2 bg-red-600 text-white px-4 py-2 rounded-lg font-semibold hover:bg-red-700 transition-colors shadow-sm disabled:opacity-50 text-[15px]"
        >
          <FileDown size={20} />
          <span>Salvar em PDF</span>
        </button>
      </header>

      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 flex flex-col md:flex-row gap-6">
        <div className="flex-1 space-y-2">
          <label className="text-[15px] font-semibold flex items-center"><Table size={16} className="mr-1"/> Tipo de Relatório</label>
          <div className="flex border rounded-lg overflow-hidden text-[15px]">
            {(['daily', 'weekly', 'monthly', 'absentees_daily'] as const).map(type => (
              <button
                key={type}
                onClick={() => setFilterType(type)}
                className={`flex-1 py-2 font-medium transition-colors ${filterType === type ? 'bg-blue-600 text-white' : 'bg-gray-50 text-gray-600 hover:bg-gray-100'}`}
              >
                {type === 'daily' ? 'Diário' : type === 'weekly' ? 'Semanal' : type === 'monthly' ? 'Mensal' : 'Faltosos (Dia)'}
              </button>
            ))}
          </div>
        </div>
        <div className="flex-1 space-y-2">
          <label className="text-[15px] font-semibold flex items-center"><Calendar size={16} className="mr-1"/> Data de Referência</label>
          <input
            type="date"
            className="w-full border rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500 bg-white text-black text-[15px]"
            value={selectedDate}
            onChange={e => setSelectedDate(e.target.value)}
          />
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        {filterType === 'absentees_daily' ? (
          <div className="p-6 space-y-8">
            {absenteesReportData.map((turmaData, idx) => (
              <div key={idx} className="space-y-4">
                <div className="bg-red-50 px-4 py-2 rounded-lg border border-red-100 flex justify-between items-center">
                  <h3 className="font-bold text-red-800 uppercase tracking-tight">{turmaData.turma}</h3>
                  <span className="bg-red-200 text-red-800 px-2 py-0.5 rounded-full text-xs font-black">
                    {turmaData.absentees.length} FALTAS
                  </span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {turmaData.absentees.map((student, sIdx) => (
                    <div key={sIdx} className="flex items-center space-x-3 p-3 bg-gray-50 rounded-xl border border-gray-100">
                      <span className="w-8 h-8 bg-white border border-gray-200 rounded-lg flex items-center justify-center font-black text-red-600 text-sm">
                        {student.callNumber}
                      </span>
                      <span className="font-bold text-gray-800 text-[14px] truncate">{student.fullName}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
            {absenteesReportData.length === 0 && (
              <div className="py-12 text-center text-gray-400 italic text-[15px]">
                Nenhum aluno faltoso registrado nesta data.
              </div>
            )}
          </div>
        ) : (
          <table className="w-full text-left">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-4 font-semibold text-gray-700 text-[15px]">Turma</th>
                <th className="px-6 py-4 font-semibold text-gray-700 text-[15px]">Total Alunos</th>
                <th className="px-6 py-4 font-semibold text-gray-700 text-[15px]">Presenças</th>
                <th className="px-6 py-4 font-semibold text-gray-700 text-[15px]">Faltas</th>
                <th className="px-6 py-4 font-semibold text-gray-700 text-[15px]">Freq. %</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {reportData.map((row, idx) => (
                <tr key={idx} className="hover:bg-gray-50">
                  <td className="px-6 py-4 font-bold text-gray-800 text-[15px]">{row.turma}</td>
                  <td className="px-6 py-4 text-gray-600 text-[15px]">{row.totalAlunos}</td>
                  <td className="px-6 py-4 text-green-600 font-semibold text-[15px]">{row.presencas}</td>
                  <td className="px-6 py-4 text-red-600 font-semibold text-[15px]">{row.faltas}</td>
                  <td className="px-6 py-4">
                    <div className="flex items-center space-x-2">
                      <span className="font-bold text-[15px]">{row.porcentagem}</span>
                      <div className="w-24 bg-gray-200 rounded-full h-2">
                        <div 
                          className="bg-blue-600 h-2 rounded-full" 
                          style={{ width: row.porcentagem }}
                        ></div>
                      </div>
                    </div>
                  </td>
                </tr>
              ))}
              {reportData.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-gray-400 italic text-[15px]">
                    Nenhum dado encontrado para os filtros selecionados.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};

export default Reports;
