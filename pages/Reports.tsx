
import React, { useState, useMemo } from 'react';
import { useApp } from '../App';
import { FileDown, Table, Calendar } from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

const Reports: React.FC = () => {
  const { state } = useApp();
  const [filterType, setFilterType] = useState<'daily' | 'weekly' | 'monthly'>('daily');
  // Ajuste para o fuso de Brasília (America/Sao_Paulo)
  const [selectedDate, setSelectedDate] = useState(new Date().toLocaleDateString('sv-SE', { timeZone: 'America/Sao_Paulo' }));

  const reportData = useMemo(() => {
    return state.classes.map(turma => {
      const classStudents = state.students.filter(s => s.classId === turma.id);
      const studentCount = classStudents.length;
      
      let filteredAttendance = [];
      if (filterType === 'daily') {
        filteredAttendance = state.attendance.filter(a => a.classId === turma.id && a.date === selectedDate);
      } else if (filterType === 'weekly') {
        // Simple logic for week: last 7 days from selected
        const dateObj = new Date(selectedDate);
        const sevenDaysAgo = new Date(dateObj);
        sevenDaysAgo.setDate(dateObj.getDate() - 7);
        filteredAttendance = state.attendance.filter(a => 
          a.classId === turma.id && 
          new Date(a.date) >= sevenDaysAgo && 
          new Date(a.date) <= dateObj
        );
      } else {
        // Monthly logic
        const targetMonth = selectedDate.substring(0, 7);
        filteredAttendance = state.attendance.filter(a => 
          a.classId === turma.id && 
          a.date.startsWith(targetMonth)
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
  }, [state, filterType, selectedDate]);

  const exportPDF = () => {
    const doc = new jsPDF();
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
      headStyles: { fillStyle: 'F', fillColor: [30, 64, 175] }
    });

    doc.save(`relatorio-frequencia-${selectedDate}.pdf`);
  };

  return (
    <div className="space-y-6">
      <header className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-bold text-gray-800">Relatórios</h2>
          <p className="text-gray-500">Acompanhamento de presença e exportação</p>
        </div>
        <button
          onClick={exportPDF}
          className="flex items-center space-x-2 bg-red-600 text-white px-4 py-2 rounded-lg font-semibold hover:bg-red-700 transition-colors shadow-sm"
        >
          <FileDown size={20} />
          <span>Salvar em PDF</span>
        </button>
      </header>

      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 flex flex-col md:flex-row gap-6">
        <div className="flex-1 space-y-2">
          <label className="text-sm font-semibold flex items-center"><Table size={16} className="mr-1"/> Tipo de Relatório</label>
          <div className="flex border rounded-lg overflow-hidden">
            {(['daily', 'weekly', 'monthly'] as const).map(type => (
              <button
                key={type}
                onClick={() => setFilterType(type)}
                className={`flex-1 py-2 font-medium transition-colors ${filterType === type ? 'bg-blue-600 text-white' : 'bg-gray-50 text-gray-600 hover:bg-gray-100'}`}
              >
                {type === 'daily' ? 'Diário' : type === 'weekly' ? 'Semanal' : 'Mensal'}
              </button>
            ))}
          </div>
        </div>
        <div className="flex-1 space-y-2">
          <label className="text-sm font-semibold flex items-center"><Calendar size={16} className="mr-1"/> Data de Referência</label>
          <input
            type="date"
            className="w-full border rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500 bg-white text-black"
            value={selectedDate}
            onChange={e => setSelectedDate(e.target.value)}
          />
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <table className="w-full text-left">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="px-6 py-4 font-semibold text-gray-700">Turma</th>
              <th className="px-6 py-4 font-semibold text-gray-700">Total Alunos</th>
              <th className="px-6 py-4 font-semibold text-gray-700">Presenças</th>
              <th className="px-6 py-4 font-semibold text-gray-700">Faltas</th>
              <th className="px-6 py-4 font-semibold text-gray-700">Freq. %</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {reportData.map((row, idx) => (
              <tr key={idx} className="hover:bg-gray-50">
                <td className="px-6 py-4 font-bold text-gray-800">{row.turma}</td>
                <td className="px-6 py-4 text-gray-600">{row.totalAlunos}</td>
                <td className="px-6 py-4 text-green-600 font-semibold">{row.presencas}</td>
                <td className="px-6 py-4 text-red-600 font-semibold">{row.faltas}</td>
                <td className="px-6 py-4">
                  <div className="flex items-center space-x-2">
                    <span className="font-bold">{row.porcentagem}</span>
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
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default Reports;
