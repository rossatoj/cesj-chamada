
import React, { useMemo, useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LabelList } from 'recharts';
import { useApp } from '../AppContext';
import { StudentStatus, UserRole, Shift, Student } from '../types';
import { ShieldAlert, Copy, Check, Info, X } from 'lucide-react';

const Dashboard: React.FC = () => {
  const { state, dbStatus, currentUser } = useApp();
  const [period, setPeriod] = useState<'diario' | 'semanal' | 'mensal'>('diario');
  const [selectedDate, setSelectedDate] = useState(new Date().toLocaleDateString('sv-SE', { timeZone: 'America/Sao_Paulo' }));
  const [copied, setCopied] = useState(false);
  const [showFixGuide, setShowFixGuide] = useState(dbStatus === 'permission-denied');

  const filteredData = useMemo(() => {
    let classes = state.classes;
    let students = state.students;
    let attendance = state.attendance;

    if (currentUser?.role === UserRole.AETE) {
      // Perfil AETE vê SOMENTE a turma AETE
      const aeteClass = state.classes.find(c => c.name.toUpperCase().trim() === 'AETE');
      if (aeteClass) {
        classes = [aeteClass];
        students = state.students.filter(s => s.classId === aeteClass.id);
        attendance = state.attendance.filter(a => a.classId === aeteClass.id && (a.type === 'regular' || !a.type));
      } else {
        classes = [];
        students = [];
        attendance = [];
      }
    } else {
      // Outros perfis NÃO vêem a turma AETE no dashboard/contagem geral
      classes = state.classes.filter(c => c.name.toUpperCase().trim() !== 'AETE');
      const excludedClassIds = state.classes
        .filter(c => c.name.toUpperCase().trim() === 'AETE')
        .map(c => c.id);
      
      students = state.students.filter(s => !excludedClassIds.includes(s.classId));
      attendance = state.attendance.filter(a => !excludedClassIds.includes(a.classId) && (a.type === 'regular' || !a.type));
    }

    return { classes, students, attendance };
  }, [state, currentUser]);

  const stats = useMemo(() => {
    // Alunos ativos (Não Transferidos, Remanejados nem Concluintes)
    const activeStudents = filteredData.students.filter(s => 
      s.status !== StudentStatus.TRANSFERIDO && 
      s.status !== StudentStatus.REMANEJADO &&
      s.status !== StudentStatus.CONCLUINTE
    );
    const activeStudentIds = new Set(activeStudents.map(s => s.id));

    const todaysAttendance = filteredData.attendance.filter(a => 
      a.date === selectedDate && 
      activeStudentIds.has(a.studentId)
    );

    const todaysTotal = todaysAttendance.length;
    const todaysPresence = todaysAttendance.filter(a => a.isPresent).length;
    const presencePct = todaysTotal > 0 ? Math.round((todaysPresence / todaysTotal) * 100) : 100;

    // Alunos presentes hoje
    const presentToday = todaysAttendance.filter(a => a.isPresent);
    // Alunos faltosos hoje (com registro de falta)
    const absentToday = todaysAttendance.filter(a => !a.isPresent);

    const totalStudents = filteredData.students.length;
    const matriculados = filteredData.students.filter(s => s.status === StudentStatus.MATRICULADO).length;
    const transferidos = filteredData.students.filter(s => s.status === StudentStatus.TRANSFERIDO).length;
    const remanejados = filteredData.students.filter(s => s.status === StudentStatus.REMANEJADO).length;
    const concluintes = filteredData.students.filter(s => s.status === StudentStatus.CONCLUINTE).length;
    const turmas = filteredData.classes.length;

    // Estatísticas por Turno (Presentes Hoje)
    const matutinoStudents = presentToday.filter(a => {
      const cls = filteredData.classes.find(c => c.id === a.classId);
      return cls?.shift === Shift.MATUTINO;
    }).length;
    const matutinoTotal = activeStudents.filter(s => {
      const cls = filteredData.classes.find(c => c.id === s.classId);
      return cls?.shift === Shift.MATUTINO;
    }).length;

    const vespertinoStudents = presentToday.filter(a => {
      const cls = filteredData.classes.find(c => c.id === a.classId);
      return cls?.shift === Shift.VESPERTINO;
    }).length;
    const vespertinoTotal = activeStudents.filter(s => {
      const cls = filteredData.classes.find(c => c.id === s.classId);
      return cls?.shift === Shift.VESPERTINO;
    }).length;

    const integralStudents = presentToday.filter(a => {
      const cls = filteredData.classes.find(c => c.id === a.classId);
      return cls?.shift === Shift.INTEGRAL;
    }).length;
    const integralTotal = activeStudents.filter(s => {
      const cls = filteredData.classes.find(c => c.id === s.classId);
      return cls?.shift === Shift.INTEGRAL;
    }).length;

    const matutinoAbsent = absentToday.filter(a => {
      const cls = filteredData.classes.find(c => c.id === a.classId);
      return cls?.shift === Shift.MATUTINO;
    }).length;
    const vespertinoAbsent = absentToday.filter(a => {
      const cls = filteredData.classes.find(c => c.id === a.classId);
      return cls?.shift === Shift.VESPERTINO;
    }).length;
    const integralAbsent = absentToday.filter(a => {
      const cls = filteredData.classes.find(c => c.id === a.classId);
      return cls?.shift === Shift.INTEGRAL;
    }).length;

    const fundamentalStudents = matutinoStudents + integralStudents;
    const fundamentalTotal = matutinoTotal + integralTotal;
    const fundamentalAbsent = matutinoAbsent + integralAbsent;

    const medioStudents = vespertinoStudents + integralStudents;
    const medioTotal = vespertinoTotal + integralTotal;
    const medioAbsent = vespertinoAbsent + integralAbsent;

    const totalAbsent = absentToday.length;

    const todaysLateCount = state.lateArrivals.filter(l => 
      l.date === selectedDate && 
      filteredData.students.some(s => s.id === l.studentId)
    ).length;

    // Função auxiliar para contar atestados em uma lista de alunos (que não estão presentes hoje)
    const getCertCount = (studentList: Student[]) => {
      return studentList.filter(s => {
        const isPresent = presentToday.some(a => a.studentId === s.id);
        if (isPresent) return false;
        return state.certificates.some(cert => 
          cert.studentId === s.id &&
          selectedDate >= cert.startDate &&
          selectedDate <= cert.endDate
        );
      }).length;
    };

    const matutinoCert = getCertCount(activeStudents.filter(s => {
      const cls = filteredData.classes.find(c => c.id === s.classId);
      return cls?.shift === Shift.MATUTINO;
    }));
    const vespertinoCert = getCertCount(activeStudents.filter(s => {
      const cls = filteredData.classes.find(c => c.id === s.classId);
      return cls?.shift === Shift.VESPERTINO;
    }));
    const integralCert = getCertCount(activeStudents.filter(s => {
      const cls = filteredData.classes.find(c => c.id === s.classId);
      return cls?.shift === Shift.INTEGRAL;
    }));
    const fundamentalCert = matutinoCert + integralCert;
    const medioCert = vespertinoCert + integralCert;
    const totalCert = getCertCount(activeStudents);

    return { 
      totalStudents, matriculados, transferidos, remanejados, concluintes, turmas, presencePct, totalAbsent,
      todaysLateCount,
      absentWithCertificate: totalCert,
      matutinoStudents, vespertinoStudents, integralStudents,
      fundamentalStudents,
      medioStudents,
      matutinoTotal, vespertinoTotal, integralTotal,
      fundamentalTotal,
      medioTotal,
      matutinoAbsent,
      vespertinoAbsent,
      integralAbsent,
      fundamentalAbsent,
      medioAbsent,
      matutinoCert,
      vespertinoCert,
      integralCert,
      fundamentalCert,
      medioCert,
      totalCert
    };
  }, [filteredData, selectedDate, state.certificates, state.lateArrivals]);

  const copyRules = () => {
    const rules = `rules_version = '2';\nservice cloud.firestore {\n  match /databases/{database}/documents {\n    match /{document=**} {\n      allow read, write: if true;\n    }\n  }\n}`;
    navigator.clipboard.writeText(rules);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const chartData = useMemo(() => {
    return filteredData.classes.map(turma => {
      let filteredAttendance = [];
      const dateObj = new Date(selectedDate);

      if (period === 'diario') {
        filteredAttendance = filteredData.attendance.filter(a => a.classId === turma.id && a.date === selectedDate);
      } else if (period === 'semanal') {
        const startOfWeek = new Date(dateObj);
        startOfWeek.setDate(dateObj.getDate() - 7);
        filteredAttendance = filteredData.attendance.filter(a => a.classId === turma.id && new Date(a.date) >= startOfWeek && new Date(a.date) <= dateObj);
      } else {
        const targetMonth = selectedDate.substring(0, 7);
        filteredAttendance = filteredData.attendance.filter(a => a.classId === turma.id && a.date.startsWith(targetMonth));
      }

      const totalRecords = filteredAttendance.length;
      const presenceCount = filteredAttendance.filter(a => a.isPresent).length;
      return {
        name: turma.name,
        porcentagem: totalRecords > 0 ? Math.round((presenceCount / totalRecords) * 100) : 0
      };
    });
  }, [filteredData, period, selectedDate]);

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-[33px] font-black text-gray-900 tracking-tight flex items-center">
            Painel de Controle 
            {dbStatus === 'online' && <span className="ml-3 px-2 py-0.5 bg-green-100 text-green-700 text-[14.3px] rounded-full uppercase tracking-widest font-bold border border-green-200">Sincronizado</span>}
          </h2>
          <p className="text-[17.6px] text-gray-500 font-medium">Monitoramento de frequência {currentUser?.role === UserRole.AETE ? ' - Turma AETE' : 'e gestão escolar (Exceto AETE)'}</p>
        </div>
        <div className="flex bg-white p-1 rounded-xl border border-gray-200 shadow-sm">
          <input 
            type="date" 
            value={selectedDate} 
            onChange={(e) => setSelectedDate(e.target.value)}
            className="px-4 py-2 text-[16.5px] border-none outline-none bg-white text-gray-800 font-bold focus:ring-0"
          />
        </div>
      </header>

      {dbStatus === 'permission-denied' && !showFixGuide && (
        <button 
          onClick={() => setShowFixGuide(true)}
          className="w-full bg-red-50 border border-red-200 p-4 rounded-2xl flex items-center justify-between group hover:bg-red-100 transition-colors"
        >
          <div className="flex items-center space-x-3 text-red-700">
            <ShieldAlert size={20} className="animate-pulse" />
            <span className="text-[14.3px] font-black uppercase tracking-tight">O Banco de Dados está bloqueado! Clique para ver como resolver.</span>
          </div>
          <Info size={16} className="text-red-400 group-hover:text-red-600" />
        </button>
      )}

      {showFixGuide && (
        <div className="bg-white border-2 border-red-200 rounded-3xl shadow-xl overflow-hidden animate-in zoom-in duration-500">
          <div className="bg-red-600 p-5 text-white flex items-center justify-between">
            <div className="flex items-center">
              <ShieldAlert size={24} className="mr-3 shrink-0" />
              <h3 className="font-black uppercase tracking-widest text-[14.3px]">Resolução de Erro de Permissão</h3>
            </div>
            <button onClick={() => setShowFixGuide(false)} className="text-white/60 hover:text-white transition-colors">
              <X size={24} />
            </button>
          </div>
          <div className="p-8 grid grid-cols-1 md:grid-cols-2 gap-10">
            <div className="space-y-5">
              <p className="text-[16.5px] text-gray-600 leading-relaxed font-medium">
                O Google Firestore exige que as regras de segurança sejam configuradas. Atualmente, o servidor está negando suas solicitações.
              </p>
              <div className="space-y-3">
                <p className="text-[14.3px] font-black text-gray-400 uppercase tracking-widest">Guia Rápido:</p>
                <ol className="text-[16.5px] text-gray-700 space-y-3 font-semibold">
                  <li className="flex items-center space-x-2">
                    <span className="w-5 h-5 bg-red-100 text-red-600 rounded-full flex items-center justify-center shrink-0">1</span>
                    <span>Acesse o <a href="https://console.firebase.google.com/" target="_blank" rel="noreferrer" className="text-blue-600 underline">Console Firebase</a></span>
                  </li>
                  <li className="flex items-center space-x-2">
                    <span className="w-5 h-5 bg-red-100 text-red-600 rounded-full flex items-center justify-center shrink-0">2</span>
                    <span>Firestore Database &gt; Aba Rules</span>
                  </li>
                  <li className="flex items-center space-x-2">
                    <span className="w-5 h-5 bg-red-100 text-red-600 rounded-full flex items-center justify-center shrink-0">3</span>
                    <span>Cole o código ao lado e clique em Publish</span>
                  </li>
                </ol>
              </div>
            </div>
            <div className="relative">
              <pre className="bg-gray-900 text-green-400 p-5 rounded-2xl font-mono text-[14.3px] overflow-x-auto border border-black shadow-inner">
{`rules_version = '2';\nservice cloud.firestore {\n  match /databases/{database}/documents {\n    match /{document=**} {\n      allow read, write: if true;\n    }\n  }\n}`}
              </pre>
              <button 
                onClick={copyRules}
                className="absolute top-2 right-2 bg-white/10 hover:bg-white/20 text-white p-2 rounded-lg transition-colors flex items-center space-x-2 text-[14.3px] font-bold"
              >
                {copied ? <Check size={14} className="text-green-400" /> : <Copy size={14} />}
                <span>{copied ? 'Copiado!' : 'Copiar'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-7 gap-4">
        <StatCard title="ALUNOS" value={stats.totalStudents} color="bg-blue-600" />
        <StatCard title="Matriculados" value={stats.matriculados} color="bg-emerald-600" />
        <StatCard title="TRANSFERIDOS" value={stats.transferidos} color="bg-red-600" />
        <StatCard title="REMANEJADOS" value={stats.remanejados} color="bg-amber-600" />
        <StatCard title="CONCLUINTES" value={stats.concluintes} color="bg-gray-600" />
        <StatCard title="Alunos Atrasados" value={stats.todaysLateCount} color="bg-indigo-600" />
        <StatCard title="Presença Hoje" value={`${stats.presencePct}%`} tertiaryValue={stats.totalAbsent} color="bg-orange-600" />
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
        <StatCard title="ENSINO FUNDAMENTAL - INTEGRAL" value={stats.integralStudents} secondaryValue={stats.integralTotal} tertiaryValue={stats.integralAbsent} certValue={stats.integralCert} color="bg-cyan-600" />
        <StatCard title="ENSINO MÉDIO - MATUTINO" value={stats.matutinoStudents} secondaryValue={stats.matutinoTotal} tertiaryValue={stats.matutinoAbsent} certValue={stats.matutinoCert} color="bg-yellow-500" />
        <StatCard title="ENSINO MÉDIO - VESPERTINO" value={stats.vespertinoStudents} secondaryValue={stats.vespertinoTotal} tertiaryValue={stats.vespertinoAbsent} certValue={stats.vespertinoCert} color="bg-purple-600" />
        <StatCard title="FUNDAMENTAL + E.M. MATUTINO" value={stats.fundamentalStudents} secondaryValue={stats.fundamentalTotal} tertiaryValue={stats.fundamentalAbsent} certValue={stats.fundamentalCert} color="bg-teal-600" />
        <StatCard title="FUNDAMENTAL + E.M. VESPERTINO" value={stats.medioStudents} secondaryValue={stats.medioTotal} tertiaryValue={stats.medioAbsent} certValue={stats.medioCert} color="bg-rose-600" />
      </div>

      <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-6 gap-4">
          <h3 className="text-[19.8px] font-black text-gray-900 uppercase tracking-tighter">Frequência por Turma (%)</h3>
          <div className="flex bg-gray-50 p-1 rounded-xl text-[12.1px] font-black border border-gray-100">
            {(['diario', 'semanal', 'mensal'] as const).map(p => (
              <button
                key={p}
                onClick={() => setPeriod(p)}
                className={`px-4 py-1.5 rounded-lg uppercase transition-all tracking-widest ${period === p ? 'bg-white text-blue-700 shadow-sm border border-gray-100' : 'text-gray-400 hover:text-gray-600'}`}
              >
                {p}
              </button>
            ))}
          </div>
        </div>
        <div className="h-[350px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} margin={{ top: 20, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
              <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 12.1, fontWeight: 700}} />
              <YAxis domain={[0, 100]} unit="%" axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 12.1, fontWeight: 700}} />
              <Tooltip 
                cursor={{ fill: '#f8fafc' }} 
                contentStyle={{borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)', fontWeight: 800, fontSize: '12.1px'}} 
              />
              <Bar dataKey="porcentagem" name="Presença" fill="#1d4ed8" radius={[6, 6, 0, 0]} barSize={35}>
                <LabelList 
                  dataKey="porcentagem" 
                  position="top" 
                  formatter={(val: number) => `${val}%`} 
                  style={{ fill: '#1d4ed8', fontSize: 12.1, fontWeight: 900 }} 
                />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};

const StatCard: React.FC<{ title: string; value: string | number; secondaryValue?: string | number; tertiaryValue?: string | number; certValue?: number; color: string }> = ({ title, value, secondaryValue, tertiaryValue, certValue, color }) => (
  <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-50 flex flex-col items-center justify-center text-center group hover:border-blue-500/20 hover:shadow-lg hover:shadow-blue-500/5 transition-all duration-300">
    <span className="text-gray-400 text-[11px] font-black mb-0.5 uppercase tracking-[0.1em]">{title}</span>
    <div className="flex flex-col items-center">
      <span className="text-[26.4px] font-black text-gray-900 tracking-tighter">{value}</span>
      {secondaryValue !== undefined && (
        <span className="text-[13.2px] font-bold text-gray-400 uppercase mt-[-2px]">de {secondaryValue} matriculados</span>
      )}
      {tertiaryValue !== undefined && (
        <div className="flex flex-col items-center mt-1">
          <span className="text-[12.1px] font-bold text-red-500 uppercase">{tertiaryValue} faltosos hoje</span>
          {certValue !== undefined && certValue > 0 && (
            <span className="text-[11px] font-bold text-pink-600 uppercase">({certValue} com atestado)</span>
          )}
        </div>
      )}
    </div>
    <div className={`h-1 w-8 mt-3 rounded-full ${color} opacity-20 group-hover:opacity-100 transition-all group-hover:w-12`}></div>
  </div>
);

export default Dashboard;
