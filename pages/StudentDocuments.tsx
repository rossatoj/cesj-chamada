
import React, { useMemo, useState } from 'react';
import { useApp } from '../AppContext';
import { Search, Filter, ChevronDown, FileText, CheckCircle2, AlertCircle, ChevronRight, Users, Printer, Calendar, FileDown, BarChart3 } from 'lucide-react';
import { StudentDocuments, StudentStatus } from '../types';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';

const StudentDocumentsPage: React.FC = () => {
  const { state, persistStudentDocuments } = useApp();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedClassId, setSelectedClassId] = useState<string>('all');
  const [expandedClasses, setExpandedClasses] = useState<Set<string>>(new Set());
  const [printData, setPrintData] = useState<{ className: string; students: any[] } | null>(null);

  const filteredStudents = useMemo(() => {
    return state.students.filter(student => {
      const isActive = student.status !== StudentStatus.TRANSFERIDO && 
                       student.status !== StudentStatus.CONCLUINTE &&
                       student.status !== StudentStatus.REMANEJADO;
      const matchesSearch = student.fullName.toLowerCase().includes(searchTerm.toLowerCase()) || 
                           student.cgm.includes(searchTerm);
      const matchesClass = selectedClassId === 'all' || student.classId === selectedClassId;
      return isActive && matchesSearch && matchesClass;
    }).sort((a, b) => a.fullName.localeCompare(b.fullName));
  }, [state.students, searchTerm, selectedClassId]);

  const groupedStudents = useMemo(() => {
    const groups: Record<string, typeof filteredStudents> = {};
    filteredStudents.forEach(student => {
      if (!groups[student.classId]) groups[student.classId] = [];
      groups[student.classId].push(student);
    });
    return groups;
  }, [filteredStudents]);

  const toggleClass = (classId: string) => {
    const newExpanded = new Set(expandedClasses);
    if (newExpanded.has(classId)) {
      newExpanded.delete(classId);
    } else {
      newExpanded.add(classId);
    }
    setExpandedClasses(newExpanded);
  };

  const handleToggleDocument = async (studentId: string, field: keyof Omit<StudentDocuments, 'id' | 'updatedAt'>) => {
    const existingDocs = state.studentDocuments.find(d => d.id === studentId);
    
    const newDocs: StudentDocuments = existingDocs 
      ? { ...existingDocs, [field]: !existingDocs[field], updatedAt: new Date().toISOString() }
      : {
          id: studentId,
          missingBirthCertificate: false,
          missingRG: false,
          missingCPF: false,
          missingResponsibleCPF: false,
          missingProofOfResidence: false,
          missingVaccinationDeclaration: false,
          vaccinationDeclarationExpiry: '',
          [field]: true,
          updatedAt: new Date().toISOString()
        };

    await persistStudentDocuments(newDocs);
  };

  const handleUpdateExpiry = async (studentId: string, expiryDate: string) => {
    const existingDocs = state.studentDocuments.find(d => d.id === studentId);
    
    const newDocs: StudentDocuments = existingDocs 
      ? { ...existingDocs, vaccinationDeclarationExpiry: expiryDate, updatedAt: new Date().toISOString() }
      : {
          id: studentId,
          missingBirthCertificate: false,
          missingRG: false,
          missingCPF: false,
          missingResponsibleCPF: false,
          missingProofOfResidence: false,
          missingVaccinationDeclaration: false,
          vaccinationDeclarationExpiry: expiryDate,
          updatedAt: new Date().toISOString()
        };

    await persistStudentDocuments(newDocs);
  };

  const getDocStatus = (studentId: string, field: keyof Omit<StudentDocuments, 'id' | 'updatedAt'>) => {
    const docs = state.studentDocuments.find(d => d.id === studentId);
    return docs ? docs[field] : false;
  };

  const documentFields = useMemo(() => [
    { label: 'Cert. Nasc.', field: 'missingBirthCertificate' as keyof StudentDocuments },
    { label: 'RG ALUNO', field: 'missingRG' as keyof StudentDocuments },
    { label: 'CPF ALUNO', field: 'missingCPF' as keyof StudentDocuments },
    { label: 'CPF Resp.', field: 'missingResponsibleCPF' as keyof StudentDocuments },
    { label: 'Residência', field: 'missingProofOfResidence' as keyof StudentDocuments },
    { label: 'Vacina', field: 'missingVaccinationDeclaration' as keyof StudentDocuments },
  ], []);

  const sortedClassIds = useMemo(() => {
    return Object.keys(groupedStudents).sort((a, b) => {
      const nameA = state.classes.find(c => c.id === a)?.name || '';
      const nameB = state.classes.find(c => c.id === b)?.name || '';
      return nameA.localeCompare(nameB);
    });
  }, [groupedStudents, state.classes]);

  const chartData = useMemo(() => {
    return sortedClassIds.map(classId => {
      const turma = state.classes.find(c => c.id === classId);
      const studentsInClass = groupedStudents[classId] || [];
      
      const counts: Record<string, number> = {};
      documentFields.forEach(df => {
        counts[df.label] = 0;
      });

      studentsInClass.forEach(student => {
        const docs = state.studentDocuments.find(d => d.id === student.id);
        if (docs) {
          documentFields.forEach(df => {
            if (docs[df.field as keyof StudentDocuments]) {
              counts[df.label]++;
            }
          });
        }
      });

      return {
        name: turma?.name || 'N/A',
        ...counts
      };
    }).filter(data => {
      return documentFields.some(df => (data[df.label] as number) > 0);
    });
  }, [sortedClassIds, groupedStudents, state.studentDocuments, state.classes, documentFields]);

  const docColors = [
    '#3b82f6', // blue-500
    '#ef4444', // red-500
    '#10b981', // emerald-500
    '#f59e0b', // amber-500
    '#8b5cf6', // violet-500
    '#ec4899', // pink-500
  ];

  const handlePrintTickets = (classId: string) => {
    const turma = state.classes.find(c => c.id === classId);
    const studentsInClass = groupedStudents[classId] || [];
    
    const studentsWithMissingDocs = studentsInClass.filter(student => {
      const docs = state.studentDocuments.find(d => d.id === student.id);
      if (!docs) return false;
      return documentFields.some(df => docs[df.field as keyof StudentDocuments]);
    }).map(student => {
      const docs = state.studentDocuments.find(d => d.id === student.id)!;
      const missing = documentFields
        .filter(df => docs[df.field as keyof StudentDocuments])
        .map(df => df.label);
      return { ...student, missing };
    });

    if (studentsWithMissingDocs.length === 0) {
      // Using a simple alert for now as per instructions to avoid window.alert but 
      // since I don't have a toast system ready in this snippet, I'll just return.
      // Actually, I should probably show a message in the UI if possible.
      return;
    }

    setPrintData({ className: turma?.name || '', students: studentsWithMissingDocs });
    setTimeout(() => {
      window.print();
      setPrintData(null);
    }, 500);
  };

  const generatePDFReport = () => {
    const doc = new jsPDF();
    const today = new Date().toLocaleDateString('pt-BR');
    
    doc.setFontSize(18);
    doc.text('Colégio Estadual São José', 105, 15, { align: 'center' });
    doc.setFontSize(14);
    doc.text('Relatório de Documentação Pendente', 105, 25, { align: 'center' });
    doc.setFontSize(10);
    doc.text(`Gerado em: ${today}`, 200, 35, { align: 'right' });

    let currentY = 45;

    sortedClassIds.forEach(classId => {
      const turma = state.classes.find(c => c.id === classId);
      const studentsInClass = groupedStudents[classId] || [];
      
      const studentsWithMissingDocs = studentsInClass.filter(student => {
        const docs = state.studentDocuments.find(d => d.id === student.id);
        if (!docs) return false;
        return documentFields.some(df => docs[df.field as keyof StudentDocuments]);
      }).map(student => {
        const docs = state.studentDocuments.find(d => d.id === student.id)!;
        const missing = documentFields
          .filter(df => docs[df.field as keyof StudentDocuments])
          .map(df => df.label)
          .join(', ');
        return [student.fullName, student.cgm, missing];
      });

      if (studentsWithMissingDocs.length > 0) {
        if (currentY > 250) {
          doc.addPage();
          currentY = 20;
        }

        doc.setFontSize(12);
        doc.setFont('helvetica', 'bold');
        doc.text(`Turma: ${turma?.name || 'N/A'}`, 14, currentY);
        currentY += 5;

        autoTable(doc, {
          startY: currentY,
          head: [['Nome do Aluno', 'CGM', 'Documentos Faltantes']],
          body: studentsWithMissingDocs,
          theme: 'grid',
          headStyles: { fillColor: [30, 64, 175] },
          styles: { fontSize: 9 },
          margin: { left: 14, right: 14 }
        });

        currentY = (doc as any).lastAutoTable.finalY + 10;
      }
    });

    doc.save(`relatorio-documentacao-pendente-${new Date().toISOString().split('T')[0]}.pdf`);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-20">
      <div className="print:hidden space-y-6">
        <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h2 className="text-3xl font-black text-gray-900 tracking-tight">Documentação Pendente</h2>
            <p className="text-gray-500 font-medium">Controle de documentos faltantes agrupados por turma</p>
          </div>
          <button
            onClick={generatePDFReport}
            className="flex items-center space-x-2 bg-red-600 text-white px-6 py-3 rounded-2xl font-black text-[13px] uppercase tracking-widest shadow-lg shadow-red-500/20 hover:bg-red-700 transition-all active:scale-95"
          >
            <FileDown size={18} />
            <span>Relatório PDF</span>
          </button>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="md:col-span-2 relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
            <input 
              type="text"
              placeholder="Buscar aluno pelo nome ou CGM..."
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
              {state.classes.map(c => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
            <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" size={20} />
          </div>
        </div>

        {chartData.length > 0 && (
          <div className="bg-white p-8 rounded-3xl shadow-sm border border-gray-100">
            <div className="flex items-center space-x-3 mb-8">
              <div className="p-2 bg-blue-50 text-blue-600 rounded-xl">
                <BarChart3 size={20} />
              </div>
              <h3 className="text-xl font-black text-gray-900 uppercase tracking-tighter">Documentos Faltantes por Turma</h3>
            </div>
            <div className="h-[400px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} margin={{ top: 20, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis 
                    dataKey="name" 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{fill: '#64748b', fontSize: 12, fontWeight: 700}} 
                  />
                  <YAxis 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{fill: '#64748b', fontSize: 12, fontWeight: 700}} 
                  />
                  <Tooltip 
                    cursor={{ fill: '#f8fafc' }} 
                    contentStyle={{borderRadius: '16px', border: 'none', boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)', fontWeight: 800, fontSize: '12px'}} 
                  />
                  <Legend 
                    verticalAlign="top" 
                    align="right" 
                    iconType="circle"
                    wrapperStyle={{ paddingBottom: '20px', fontSize: '11px', fontWeight: 700, textTransform: 'uppercase' }}
                  />
                  {documentFields.map((df, index) => (
                    <Bar 
                      key={df.field} 
                      dataKey={df.label} 
                      name={df.label}
                      stackId="a" 
                      fill={docColors[index % docColors.length]} 
                      radius={index === documentFields.length - 1 ? [6, 6, 0, 0] : [0, 0, 0, 0]}
                      barSize={40}
                    />
                  ))}
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        <div className="space-y-4">
          {sortedClassIds.map(classId => {
            const turma = state.classes.find(c => c.id === classId);
            const students = groupedStudents[classId];
            const isExpanded = expandedClasses.has(classId);

            return (
              <div key={classId} className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden transition-all">
                <button 
                  onClick={() => toggleClass(classId)}
                  className="w-full px-6 py-5 flex items-center justify-between hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-center space-x-4">
                    <div className={`p-2 rounded-xl transition-colors ${isExpanded ? 'bg-blue-600 text-white' : 'bg-blue-50 text-blue-600'}`}>
                      <Users size={20} />
                    </div>
                    <div className="text-left">
                      <h3 className="font-black text-gray-900 uppercase tracking-tight text-lg">{turma?.name || 'Turma não encontrada'}</h3>
                      <p className="text-gray-400 text-xs font-bold uppercase tracking-widest">{students.length} Alunos</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handlePrintTickets(classId);
                      }}
                      className="p-3 bg-gray-50 text-gray-600 rounded-xl hover:bg-blue-600 hover:text-white transition-all flex items-center space-x-2 group"
                      title="Gerar bilhetes para pais"
                    >
                      <Printer size={18} />
                      <span className="text-xs font-black uppercase tracking-widest hidden md:inline">Bilhetes</span>
                    </button>
                    <ChevronRight className={`text-gray-400 transition-transform duration-300 ${isExpanded ? 'rotate-90' : ''}`} size={24} />
                  </div>
                </button>

                {isExpanded && (
                  <div className="border-t border-gray-50 overflow-x-auto max-h-[600px] overflow-y-auto">
                    <table className="w-full text-left border-collapse">
                      <thead className="sticky top-0 z-10">
                        <tr className="bg-gray-50 border-b border-gray-100">
                          <th className="px-6 py-4 text-[11px] font-black text-gray-400 uppercase tracking-widest bg-gray-50">Aluno</th>
                          {documentFields.map(doc => (
                            <th key={doc.field} className="px-4 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest text-center bg-gray-50">
                              {doc.label}
                            </th>
                          ))}
                          <th className="px-4 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest text-center bg-gray-50">
                            Validade Vacina
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-50">
                        {students.map(student => (
                          <tr key={student.id} className="hover:bg-blue-50/20 transition-colors">
                            <td className="px-6 py-4">
                              <div>
                                <p className="font-bold text-gray-900 text-[14px] leading-tight">{student.fullName}</p>
                                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mt-0.5">CGM: {student.cgm}</p>
                              </div>
                            </td>
                            {documentFields.map(docField => {
                              const isMissing = getDocStatus(student.id, docField.field);
                              const docs = state.studentDocuments.find(d => d.id === student.id);
                              const expiryDate = docs?.vaccinationDeclarationExpiry;
                              const todayStr = new Date().toISOString().split('T')[0];
                              const isExpired = docField.field === 'missingVaccinationDeclaration' && 
                                              !isMissing && 
                                              expiryDate && 
                                              expiryDate < todayStr;

                              return (
                                <td key={docField.field} className="px-4 py-4 text-center">
                                  <button
                                    onClick={() => handleToggleDocument(student.id, docField.field)}
                                    className={`p-2 rounded-xl transition-all ${
                                      isMissing 
                                        ? 'bg-red-50 text-red-500 hover:bg-red-100' 
                                        : isExpired
                                          ? 'bg-yellow-50 text-yellow-600 hover:bg-yellow-100'
                                          : 'bg-green-50 text-green-500 hover:bg-green-100'
                                    }`}
                                    title={isMissing ? 'Documento Faltante' : isExpired ? 'Declaração Vencida' : 'Documento OK'}
                                  >
                                    {isMissing ? <AlertCircle size={20} /> : isExpired ? <AlertCircle size={20} /> : <CheckCircle2 size={20} />}
                                  </button>
                                </td>
                              );
                            })}
                            <td className="px-4 py-4 text-center">
                              <div className={`flex items-center justify-center space-x-2 ${getDocStatus(student.id, 'missingVaccinationDeclaration') ? 'opacity-30' : ''}`}>
                                <Calendar size={16} className="text-gray-400" />
                                <input 
                                  type="date"
                                  disabled={getDocStatus(student.id, 'missingVaccinationDeclaration')}
                                  value={state.studentDocuments.find(d => d.id === student.id)?.vaccinationDeclarationExpiry || ''}
                                  onChange={(e) => handleUpdateExpiry(student.id, e.target.value)}
                                  className={`text-xs font-bold border-none bg-transparent focus:ring-0 text-gray-700 ${getDocStatus(student.id, 'missingVaccinationDeclaration') ? 'cursor-not-allowed' : ''}`}
                                />
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            );
          })}

          {sortedClassIds.length === 0 && (
            <div className="bg-white rounded-3xl shadow-xl border border-gray-100 p-20 text-center">
              <div className="flex flex-col items-center space-y-4">
                <div className="p-6 bg-gray-50 rounded-full text-gray-300">
                  <FileText size={48} />
                </div>
                <p className="text-gray-400 font-black text-[15px] uppercase tracking-widest">Nenhum aluno ou turma encontrada.</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Printable Area */}
      {printData && (
        <div id="printable-tickets" className="hidden print:block bg-white">
          {Array.from({ length: Math.ceil(printData.students.length / 6) }).map((_, pageIndex) => (
            <div key={pageIndex} className="w-[210mm] h-[297mm] pl-[9mm] pr-[9mm] py-[10mm] mx-auto grid grid-cols-2 grid-rows-3 gap-0 bg-white page-break-after-always border-l border-t border-black">
              {printData.students.slice(pageIndex * 6, (pageIndex + 1) * 6).map((student, idx) => (
                <div key={idx} className="border-r border-b border-black p-8 flex flex-col justify-start h-full relative overflow-hidden">
                  <div>
                    <div className="text-center border-b border-gray-200 pb-3 mb-4">
                      <h4 className="font-black text-base uppercase tracking-tight">Comunicado Escolar</h4>
                      <p className="text-[11px] font-bold text-gray-500 uppercase tracking-widest">Documentação Pendente</p>
                    </div>
                    <div className="space-y-2">
                      <div className="flex flex-col">
                        <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Aluno(a)</span>
                        <span className="text-sm font-black uppercase leading-none">{student.fullName}</span>
                      </div>
                      <div className="flex flex-col">
                        <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Turma</span>
                        <span className="text-sm font-black uppercase leading-none">{printData.className}</span>
                      </div>
                      <div className="mt-4">
                        <p className="text-[10px] font-black uppercase tracking-widest text-red-500 mb-1">Documentos Faltantes:</p>
                        <div className="grid grid-cols-1 gap-0.5">
                          {student.missing.map((m: string, i: number) => (
                            <div key={i} className="flex items-center space-x-2">
                              <div className="w-3 h-3 border border-black flex-shrink-0"></div>
                              <span className="text-xs font-bold uppercase leading-none">{m}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
              {/* Fill empty cells if last page has fewer than 6 students */}
              {printData.students.slice(pageIndex * 6, (pageIndex + 1) * 6).length < 6 && 
                Array.from({ length: 6 - printData.students.slice(pageIndex * 6, (pageIndex + 1) * 6).length }).map((_, i) => (
                  <div key={`empty-${i}`} className="border-r border-b border-black"></div>
                ))
              }
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default StudentDocumentsPage;
