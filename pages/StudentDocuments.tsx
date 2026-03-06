
import React, { useMemo, useState } from 'react';
import { useApp } from '../AppContext';
import { Search, Filter, ChevronDown, FileText, CheckCircle2, AlertCircle, ChevronRight, Users } from 'lucide-react';
import { StudentDocuments } from '../types';

const StudentDocumentsPage: React.FC = () => {
  const { state, persistStudentDocuments } = useApp();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedClassId, setSelectedClassId] = useState<string>('all');
  const [expandedClasses, setExpandedClasses] = useState<Set<string>>(new Set());

  const filteredStudents = useMemo(() => {
    return state.students.filter(student => {
      const matchesSearch = student.fullName.toLowerCase().includes(searchTerm.toLowerCase()) || 
                           student.cgm.includes(searchTerm);
      const matchesClass = selectedClassId === 'all' || student.classId === selectedClassId;
      return matchesSearch && matchesClass;
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
          [field]: true,
          updatedAt: new Date().toISOString()
        };

    await persistStudentDocuments(newDocs);
  };

  const getDocStatus = (studentId: string, field: keyof Omit<StudentDocuments, 'id' | 'updatedAt'>) => {
    const docs = state.studentDocuments.find(d => d.id === studentId);
    return docs ? docs[field] : false;
  };

  const documentFields: { label: string; field: keyof Omit<StudentDocuments, 'id' | 'updatedAt'> }[] = [
    { label: 'Cert. Nasc.', field: 'missingBirthCertificate' },
    { label: 'RG', field: 'missingRG' },
    { label: 'CPF', field: 'missingCPF' },
    { label: 'CPF Resp.', field: 'missingResponsibleCPF' },
    { label: 'Residência', field: 'missingProofOfResidence' },
    { label: 'Vacina', field: 'missingVaccinationDeclaration' },
  ];

  const sortedClassIds = useMemo(() => {
    return Object.keys(groupedStudents).sort((a, b) => {
      const nameA = state.classes.find(c => c.id === a)?.name || '';
      const nameB = state.classes.find(c => c.id === b)?.name || '';
      return nameA.localeCompare(nameB);
    });
  }, [groupedStudents, state.classes]);

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-20">
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-3xl font-black text-gray-900 tracking-tight">Documentação Pendente</h2>
          <p className="text-gray-500 font-medium">Controle de documentos faltantes agrupados por turma</p>
        </div>
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
                <ChevronRight className={`text-gray-400 transition-transform duration-300 ${isExpanded ? 'rotate-90' : ''}`} size={24} />
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
                            return (
                              <td key={docField.field} className="px-4 py-4 text-center">
                                <button
                                  onClick={() => handleToggleDocument(student.id, docField.field)}
                                  className={`p-2 rounded-xl transition-all ${
                                    isMissing 
                                      ? 'bg-red-50 text-red-500 hover:bg-red-100' 
                                      : 'bg-green-50 text-green-500 hover:bg-green-100'
                                  }`}
                                  title={isMissing ? 'Documento Faltante' : 'Documento OK'}
                                >
                                  {isMissing ? <AlertCircle size={20} /> : <CheckCircle2 size={20} />}
                                </button>
                              </td>
                            );
                          })}
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
  );
};

export default StudentDocumentsPage;
