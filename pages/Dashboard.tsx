
import React, { useMemo, useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { useApp } from '../App';
import { StudentStatus } from '../types';
import { Calendar, Filter } from 'lucide-react';

const Dashboard: React.FC = () => {
  const { state } = useApp();
  const [period, setPeriod] = useState<'diario' | 'semanal' | 'mensal'>('diario');
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);

  const stats = useMemo(() => {
    const totalStudents = state.students.length;
    const matriculados = state.students.filter(s => s.status === StudentStatus.MATRICULADO).length;
    const turmas = state.classes.length;
    
    const todaysPresence = state.attendance.filter(a => a.date === selectedDate && a.isPresent).length;
    const todaysTotal = state.attendance.filter(a => a.date === selectedDate).length;
    const presencePct = todaysTotal > 0 ? Math.round((todaysPresence / todaysTotal) * 100) : 0;

    return { totalStudents, matriculados, turmas, presencePct };
  }, [state, selectedDate]);

  const chartData = useMemo(() => {
    return state.classes.map(turma => {
      let filteredAttendance = [];
      const dateObj = new Date(selectedDate);

      if (period === 'diario') {
        filteredAttendance = state.attendance.filter(a => a.classId === turma.id && a.date === selectedDate);
      } else if (period === 'semanal') {
        const startOfWeek = new Date(dateObj);
        startOfWeek.setDate(dateObj.getDate() - 7);
        filteredAttendance = state.attendance.filter(a => 
          a.classId === turma.id && 
          new Date(a.date) >= startOfWeek && 
          new Date(a.date) <= dateObj
        );
      } else {
        const targetMonth = selectedDate.substring(0, 7);
        filteredAttendance = state.attendance.filter(a => 
          a.classId === turma.id && 
          a.date.startsWith(targetMonth)
        );
      }

      const totalRecords = filteredAttendance.length;
      const presenceCount = filteredAttendance.filter(a => a.isPresent).length;
      const presenceRate = totalRecords > 0 ? (presenceCount / totalRecords) * 100 : 0;

      return {
        name: turma.name,
        porcentagem: Math.round(presenceRate),
      };
    });
  }, [state, period, selectedDate]);

  return (
    <div className="space-y-8">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold text-gray-800">Painel de Controle</h2>
          <p className="text-gray-500">Resumo da situação atual do colégio</p>
        </div>
        <div className="flex flex-wrap gap-3 bg-white p-2 rounded-xl border border-gray-200 shadow-sm">
          <div className="flex border rounded-lg overflow-hidden">
            {(['diario', 'semanal', 'mensal'] as const).map(p => (
              <button
                key={p}
                onClick={() => setPeriod(p)}
                className={`px-4 py-2 text-sm font-semibold transition-colors uppercase
                  ${period === p ? 'bg-blue-600 text-white' : 'bg-transparent text-gray-500 hover:bg-gray-50'}
                `}
              >
                {p}
              </button>
            ))}
          </div>
          <div className="relative">
            <input 
              type="date" 
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="pl-9 pr-3 py-2 text-sm border rounded-lg outline-none focus:ring-2 focus:ring-blue-500 bg-white text-black"
            />
            <Calendar size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          </div>
        </div>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <StatCard title="Total Alunos" value={stats.totalStudents} color="bg-blue-600" />
        <StatCard title="Matriculados" value={stats.matriculados} color="bg-green-600" />
        <StatCard title="Total Turmas" value={stats.turmas} color="bg-purple-600" />
        <StatCard title="Presença Período" value={`${stats.presencePct}%`} color="bg-orange-600" />
      </div>

      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-xl font-bold text-gray-700">Frequência por Turma ({period})</h3>
          <Filter size={20} className="text-gray-300" />
        </div>
        <div className="h-[400px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} margin={{ top: 20, right: 30, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="name" />
              <YAxis domain={[0, 100]} unit="%" />
              <Tooltip cursor={{ fill: '#f3f4f6' }} />
              <Legend verticalAlign="top" height={36}/>
              <Bar 
                dataKey="porcentagem" 
                name="Frequência (%)" 
                fill="#1e40af" 
                radius={[6, 6, 0, 0]} 
                barSize={40}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};

const StatCard: React.FC<{ title: string; value: string | number; color: string }> = ({ title, value, color }) => (
  <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex flex-col items-center justify-center text-center">
    <span className="text-gray-400 text-xs font-bold mb-1 uppercase tracking-widest">{title}</span>
    <span className="text-3xl font-black text-gray-800">{value}</span>
    <div className={`h-1.5 w-10 mt-4 rounded-full ${color}`}></div>
  </div>
);

export default Dashboard;
