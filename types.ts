
export enum UserRole {
  ADMIN = 'ADMIN',
  PEDAGOGO = 'PEDAGOGO',
  DIRETOR = 'DIRETOR'
}

export enum StudentStatus {
  MATRICULADO = 'MATRICULADO',
  TRANSFERIDO = 'TRANSFERIDO',
  SEM_FREQUENCIA = 'SEM FREQUÊNCIA',
  REMANEJADO = 'REMANEJADO'
}

export interface User {
  id: string;
  username: string;
  fullName: string;
  role: UserRole;
  password?: string;
}

export interface ClassGroup {
  id: string;
  name: string;
}

export interface Student {
  id: string;
  fullName: string;
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
}

export interface AppState {
  users: User[];
  classes: ClassGroup[];
  students: Student[];
  attendance: AttendanceRecord[];
}
