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
}

export interface ApiNode {
  id: string;
  name: string;
  url: string;
  method: string;
  headers: string; // Stored as JSON string for easy editing
  body: string; // Template string with placeholders
}

export enum AppView {
  LANDING = 'LANDING',
  LOGIN = 'LOGIN',
  REGISTER = 'REGISTER',
  HOME = 'HOME',
  SEND = 'SEND',
  PROTECTOR = 'PROTECTOR',
  TEMPLATES = 'TEMPLATES',
  PROFILE = 'PROFILE',
  ADMIN = 'ADMIN',
}