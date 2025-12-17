export interface Contact {
  id: string;
  name: string;
  phone: string;
  tags: string[];
}

export interface MessageTemplate {
  id: string;
  name: string;
  content: string;
  category: 'Transactional' | 'Marketing' | 'Alert';
}

export interface LogEntry {
  id: string;
  contactName: string;
  contactPhone: string;
  message: string;
  status: 'sent' | 'failed' | 'queued';
  timestamp: Date;
  userId?: string;
  username?: string;
}

export interface ApiNode {
  id: string;
  name: string;
  url: string;
  method: string;
  headers: string; // Stored as JSON string for easy editing
  body: string; // Template string with placeholders
  enabled?: boolean;
}

export interface UserProfile {
  uid: string;
  email: string | null;
  phone?: string; // Added phone field
  username: string;
  role: 'user' | 'admin';
  createdAt: any;
}

export interface ActiveSession {
  id: string;
  userId: string;
  username: string;
  target: string;
  amount: number;
  sent: number;
  failed: number;
  status: 'running' | 'stopped' | 'completed' | 'interrupted' | 'queued';
  mode?: 'local' | 'cloud'; 
  startTime: any;
  lastUpdate: any;
}

export enum AppView {
  LANDING = 'LANDING',
  LOGIN = 'LOGIN',
  REGISTER = 'REGISTER',
  FORGOT_PASSWORD = 'FORGOT_PASSWORD', // Added view
  HOME = 'HOME',
  SEND = 'SEND',
  PROTECTOR = 'PROTECTOR',
  TEMPLATES = 'TEMPLATES',
  PROFILE = 'PROFILE',
  ADMIN = 'ADMIN'
}