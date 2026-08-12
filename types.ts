
export enum UserRole {
  ADMIN = 'ADMIN',
  PEDAGOGO = 'PEDAGOGO',
  DIRETOR = 'DIRETOR',
  AETE = 'AETE',
  ALUNO = 'ALUNO'
}

export enum StudentStatus {
  MATRICULADO = 'MATRICULADO',
  TRANSFERIDO = 'TRANSFERIDO',
  SEM_FREQUENCIA = 'SEM FREQUÊNCIA',
  REMANEJADO = 'REMANEJADO',
  CONCLUINTE = 'CONCLUINTE'
}

export interface User {
  id: string;
  username: string;
  fullName: string;
  email: string;
  role: UserRole;
  password?: string;
}

export enum Shift {
  MATUTINO = 'MATUTINO',
  VESPERTINO = 'VESPERTINO',
  INTEGRAL = 'INTEGRAL'
}

export interface ClassGroup {
  id: string;
  name: string;
  shift: Shift;
}

export interface Student {
  id: string;
  fullName: string;
  callNumber: string;
  cgm: string;
  birthDate: string;
  status: StudentStatus;
  classId: string;
}

export interface AttendanceRecord {
  id: string;
  studentId: string;
  classId: string;
  date: string;
  isPresent: boolean;
  type?: 'regular' | 'contraturno';
}

export interface MedicalCertificate {
  id: string;
  studentId: string;
  startDate: string;
  endDate: string;
  createdAt: string;
}

export interface LateArrival {
  id: string;
  studentId: string;
  reason: string;
  date: string;
  time: string;
  createdAt: string;
}

export interface StudentDocuments {
  id: string; // studentId
  missingBirthCertificate: boolean;
  missingRG: boolean;
  missingCPF: boolean;
  missingResponsibleCPF: boolean;
  missingProofOfResidence: boolean;
  missingVaccinationDeclaration: boolean;
  vaccinationDeclarationExpiry?: string;
  updatedAt: string;
}

export interface AppState {
  users: User[];
  classes: ClassGroup[];
  students: Student[];
  attendance: AttendanceRecord[];
  certificates: MedicalCertificate[];
  studentDocuments: StudentDocuments[];
  lateArrivals: LateArrival[];
}
