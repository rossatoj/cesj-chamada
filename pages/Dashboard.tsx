
import React, { useMemo, useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { useApp } from '../App';
import { StudentStatus } from '../types';
// Added X to the imports
import { ShieldAlert, ExternalLink, Copy, Check, Info, X } from 'lucide-react';

const Dashboard: React.FC = () => {
  const { state, dbStatus, lastError } = useApp();
  const [period, setPeriod] = useState<'diario' | 'semanal' | 'mensal'>('diario');
  // Ajuste para o fuso de Brasília (America/Sao_Paulo)
  const [selectedDate, setSelectedDate] = useState(new Date().toLocaleDateString('sv-SE', { timeZone: 'America/Sao_Paulo' }));
  const [copied, setCopied] = useState(false);
  const [showFixGuide, setShowFixGuide] = useState(dbStatus === 'permission-denied');

  const stats = useMemo(() => {
    const totalStudents = state.students.length;
    const matriculados = state.students.filter(s => s.status === StudentStatus.MATRICULADO).length;
    const turmas = state.classes.length;
    
    const todaysTotal = state.attendance.filter(a => a.date === selectedDate).length;
    const todaysPresence = state.attendance.filter(a => a.date === selectedDate && a.isPresent).length;
    const presencePct = todaysTotal > 0 ? Math.round((todaysPresence / todaysTotal) * 100) : 0;

    return { totalStudents, matriculados, turmas, presencePct };
  }, [state, selectedDate]);

  const copyRules = () => {
    const rules = `rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /{document=**} {
      allow read, write: if true;
    }
  }
}`;
    navigator.clipboard.writeText(rules);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const chartData = useMemo(() => {
    return state.classes.map(turma => {
      let filteredAttendance = [];
      const dateObj = new Date(selectedDate);

      if (period === 'diario') {
        filteredAttendance = state.attendance.filter(a => a.classId === turma.id && a.date === selectedDate);
      } else if (period === 'semanal') {
        const startOfWeek = new Date(dateObj);
        startOfWeek.setDate(dateObj.getDate() - 7);
        filteredAttendance = state.attendance.filter(a => a.classId === turma.id && new Date(a.date) >= startOfWeek && new Date(a.date) <= dateObj);
      } else {
        const targetMonth = selectedDate.substring(0, 7);
        filteredAttendance = state.attendance.filter(a => a.classId === turma.id && a.date.startsWith(targetMonth));
      }

      const totalRecords = filteredAttendance.length;
      const presenceCount = filteredAttendance.filter(a => a.isPresent).length;
      return {
        name: turma.name,
        porcentagem: totalRecords > 0 ? Math.round((presenceCount / totalRecords) * 100) : 0
      };
    });
  }, [state, period, selectedDate]);

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-black text-gray-900 tracking-tight flex items-center">
            Painel de Controle 
            {dbStatus === 'online' && <span className="ml-3 px-2 py-0.5 bg-green-100 text-green-700 text-[10px] rounded-full uppercase tracking-widest font-bold border border-green-200">Sincronizado</span>}
          </h2>
          <p className="text-gray-500 font-medium">Monitoramento de frequência e gestão escolar</p>
        </div>
        <div className="flex bg-white p-1 rounded-xl border border-gray-200 shadow-sm">
          <input 
            type="date" 
            value={selectedDate} 
            onChange={(e) => setSelectedDate(e.target.value)}
            className="px-4 py-2 text-sm border-none outline-none bg-white text-gray-800 font-bold focus:ring-0"
          />
        </div>
      </header>

      {/* Alerta Discreto de Erro no Banco */}
      {dbStatus === 'permission-denied' && !showFixGuide && (
        <button 
          onClick={() => setShowFixGuide(true)}
          className="w-full bg-red-50 border border-red-200 p-4 rounded-2xl flex items-center justify-between group hover:bg-red-100 transition-colors"
        >
          <div className="flex items-center space-x-3 text-red-700">
            <ShieldAlert size={20} className="animate-pulse" />
            <span className="text-xs font-black uppercase tracking-tight">O Banco de Dados está bloqueado! Clique para ver como resolver.</span>
          </div>
          <Info size={16} className="text-red-400 group-hover:text-red-600" />
        </button>
      )}

      {/* Guia de Resolução Expansível */}
      {showFixGuide && (
        <div className="bg-white border-2 border-red-200 rounded-3xl shadow-xl overflow-hidden animate-in zoom-in duration-500">
          <div className="bg-red-600 p-5 text-white flex items-center justify-between">
            <div className="flex items-center">
              <ShieldAlert size={24} className="mr-3 shrink-0" />
              <h3 className="font-black uppercase tracking-widest text-sm">Resolução de Erro de Permissão</h3>
            </div>
            <button onClick={() => setShowFixGuide(false)} className="text-white/60 hover:text-white transition-colors">
              <X size={24} />
            </button>
          </div>
          <div className="p-8 grid grid-cols-1 md:grid-cols-2 gap-10">
            <div className="space-y-5">
              <p className="text-sm text-gray-600 leading-relaxed font-medium">
                O Google Firestore exige que as regras de segurança sejam configuradas. Atualmente, o servidor está negando suas solicitações.
              </p>
              <div className="space-y-3">
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Guia Rápido:</p>
                <ol className="text-xs text-gray-700 space-y-3 font-semibold">
                  <li className="flex items-center space-x-2">
                    <span className="w-5 h-5 bg-red-100 text-red-600 rounded-full flex items-center justify-center shrink-0">1</span>
                    <span>Acesse o <a href="https://console.firebase.google.com/" target="_blank" rel="noreferrer" className="text-blue-600 underline">Console Firebase</a></span>
                  </li>
                  <li className="flex items-center space-x-2">
                    <span className="w-5 h-5 bg-red-100 text-red-600 rounded-full flex items-center justify-center shrink-0">2</span>
                    <span>Firestore Database > Aba Rules</span>
                  </li>
                  <li className="flex items-center space-x-2">
                    <span className="w-5 h-5 bg-red-100 text-red-600 rounded-full flex items-center justify-center shrink-0">3</span>
                    <span>Cole o código ao lado e clique em Publish</span>
                  </li>
                </ol>
              </div>
            </div>
            <div className="relative">
              <pre className="bg-gray-900 text-green-400 p-5 rounded-2xl font-mono text-[10px] overflow-x-auto border border-black shadow-inner">
{`rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /{document=**} {
      allow read, write: if true;
    }
  }
}`}
              </pre>
              <button 
                onClick={copyRules}
                className="absolute top-2 right-2 bg-white/10 hover:bg-white/20 text-white p-2 rounded-lg transition-colors flex items-center space-x-2 text-[10px] font-bold"
              >
                {copied ? <Check size={14} className="text-green-400" /> : <Copy size={14} />}
                <span>{copied ? 'Copiado!' : 'Copiar'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <StatCard title="Total Alunos" value={stats.totalStudents} color="bg-blue-600" />
        <StatCard title="Matriculados" value={stats.matriculados} color="bg-emerald-600" />
        <StatCard title="Total Turmas" value={stats.turmas} color="bg-indigo-600" />
        <StatCard title="Presença Período" value={`${stats.presencePct}%`} color="bg-orange-600" />
      </div>

      <div className="bg-white p-8 rounded-3xl shadow-sm border border-gray-100">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-8 gap-4">
          <h3 className="text-xl font-black text-gray-900 uppercase tracking-tighter">Frequência por Turma (%)</h3>
          <div className="flex bg-gray-50 p-1.5 rounded-xl text-[10px] font-black border border-gray-100">
            {(['diario', 'semanal', 'mensal'] as const).map(p => (
              <button
                key={p}
                onClick={() => setPeriod(p)}
                className={`px-6 py-2 rounded-lg uppercase transition-all tracking-widest ${period === p ? 'bg-white text-blue-700 shadow-md border border-gray-100' : 'text-gray-400 hover:text-gray-600'}`}
              >
                {p}
              </button>
            ))}
          </div>
        </div>
        <div className="h-[450px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
              <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 11, fontWeight: 700}} />
              <YAxis domain={[0, 100]} unit="%" axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 11, fontWeight: 700}} />
              <Tooltip 
                cursor={{ fill: '#f8fafc' }} 
                contentStyle={{borderRadius: '16px', border: 'none', boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)', fontWeight: 800, fontSize: '12px'}} 
              />
              <Bar dataKey="porcentagem" name="Presença" fill="#1d4ed8" radius={[10, 10, 0, 0]} barSize={45} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};

const StatCard: React.FC<{ title: string; value: string | number; color: string }> = ({ title, value, color }) => (
  <div className="bg-white p-8 rounded-3xl shadow-sm border border-gray-50 flex flex-col items-center justify-center text-center group hover:border-blue-500/20 hover:shadow-xl hover:shadow-blue-500/5 transition-all duration-300">
    <span className="text-gray-400 text-[10px] font-black mb-1 uppercase tracking-[0.2em]">{title}</span>
    <span className="text-4xl font-black text-gray-900 tracking-tighter">{value}</span>
    <div className={`h-1.5 w-10 mt-6 rounded-full ${color} opacity-20 group-hover:opacity-100 transition-all group-hover:w-16`}></div>
  </div>
);

export default Dashboard;
