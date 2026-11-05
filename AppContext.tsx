import React, { createContext, useContext } from 'react';
import { Auth } from 'firebase/auth';
import { AppState, User, ClassGroup, Student, AttendanceRecord, MedicalCertificate, StudentDocuments, LateArrival, MerendaRecord } from './types';

export type DBStatus = 'connecting' | 'online' | 'permission-denied' | 'error' | 'invalid-api-key';

export interface AppContextType {
  state: AppState;
  setState: React.Dispatch<React.SetStateAction<AppState>>;
  currentUser: User | null;
  setCurrentUser: (user: User | null) => void;
  logout: () => Promise<void>;
  persistUser: (user: User) => Promise<void>;
  removeUser: (id: string) => Promise<void>;
  persistClass: (cls: ClassGroup) => Promise<void>;
  removeClass: (id: string) => Promise<void>;
  persistStudent: (student: Student) => Promise<void>;
  removeStudent: (id: string) => Promise<void>;
  persistAttendance: (records: AttendanceRecord[]) => Promise<void>;
  persistCertificate: (cert: MedicalCertificate) => Promise<void>;
  removeCertificate: (id: string) => Promise<void>;
  persistStudentDocuments: (docs: StudentDocuments) => Promise<void>;
  persistLateArrival: (late: LateArrival) => Promise<void>;
  removeLateArrival: (id: string) => Promise<void>;
  persistMerendaRecord: (record: MerendaRecord) => Promise<void>;
  removeMerendaRecord: (id: string) => Promise<void>;
  loading: boolean;
  dbStatus: DBStatus;
  lastError: string | null;
  testConnectivity: () => void;
  auth: Auth | null;
}

export const AppContext = createContext<AppContextType | undefined>(undefined);

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) throw new Error('useApp must be used within AppProvider');
  return context;
};
