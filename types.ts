
export type AgentRole = 'CEO' | 'THINKER' | 'RESEARCH' | 'DATA' | 'DEV' | 'MONITOR' | 'UI/UX' | 'WRITER' | 'ANALYST' | 'ORGANIZER' | 'UX' | 'FINANCE' | 'ADMIN';
export type OfficeRoom = 'CEO_OFFICE' | 'WORKING_AREA' | 'WAR_ROOM' | 'LOUNGE';
export type AgentStatus = 'WORKING' | 'THINKING' | 'ALERT' | 'IDLE';
export type AgentMood = 'FOCUSED' | 'SOCIAL' | 'STRESSED';

export interface Position {
  x: number;
  y: number;
}

export interface Task {
  id: string;
  title: string;
  assigneeId: string;
  status: 'TODO' | 'IN_PROGRESS' | 'STUCK' | 'DONE';
  priority: 'LOW' | 'MEDIUM' | 'HIGH';
  dueDate: string;
  tags?: string[];
  dependencies?: string[];
}

export interface Goal {
  id: string;
  title: string;
  progress: number;
  category: 'GROWTH' | 'PRODUCT' | 'EFFICIENCY';
}

export interface Artifact {
  id: string;
  title: string;
  type: 'CODE' | 'DOCUMENT' | 'IMAGE' | 'DATA';
  creatorId: string;
  timestamp: number;
  content: string;
}

export interface InternalMessage {
  id: string;
  fromId: string;
  toId: string;
  text: string;
  timestamp: number;
}

export interface Memory {
  id: string;
  agentId: string;
  content: string;
  importance: number; // 1-5
  timestamp: number;
}

export interface CronJob {
  id: string;
  name: string;
  interval: number; // in seconds
  nextRun: number; // timestamp
  lastRunStatus: 'SUCCESS' | 'FAILED' | 'RUNNING';
  description: string;
}

export interface LogEntry {
  id: string;
  timestamp: number;
  agentId: string;
  message: string;
  type: 'INFO' | 'WARNING' | 'ERROR' | 'SUCCESS';
}

export interface Agent {
  id: string;
  name: string;
  role: AgentRole;
  room: OfficeRoom;
  status: AgentStatus;
  mood: AgentMood;
  avatar: string;
  description: string;
  systemPrompt: string;
  currentActivity: string;
  homePosition: Position;
  currentPosition: Position;
  isFacingLeft: boolean;
  parentId?: string;
  trustScore: number;
  expertise: string[];
}

export interface ChatMessage {
  id: string;
  senderId: string;
  senderName: string;
  text: string;
  timestamp: number;
  role: 'user' | 'model';
}

export interface Proposal {
  id: string;
  title: string;
  proposer: string;
  date: string;
  description: string;
  impact: 'Critical' | 'High' | 'Medium' | 'Low';
  effort: 'High' | 'Medium' | 'Low';
  agents: string[];
  status: 'pending' | 'approved' | 'rejected';
}

export interface ResearchEntry {
  id: string;
  title: string;
  summary: string;
  agentId: string;
  timestamp: number;
  sources: { title: string; url: string }[];
  category: 'Market' | 'Tech' | 'Competitor' | 'Internal';
  importance: number; // 1-10
  tags: string[];
}

export interface SecurityIssue {
  id: string;
  title: string;
  description: string;
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  status: 'OPEN' | 'INVESTIGATING' | 'PATCHED' | 'IGNORED';
  detectedBy: string;
  timestamp: number;
  category: 'Prompt Injection' | 'Data Leak' | 'Auth Bypass' | 'System Breach';
  remediation?: string;
}

export interface OfficeState {
  agents: Agent[];
  messages: ChatMessage[];
  tasks: Task[];
  goals: Goal[];
  memories: Memory[];
  logs: LogEntry[];
  cronJobs: CronJob[];
  artifacts: Artifact[];
  internalMessages: InternalMessage[];
  proposals: Proposal[];
  research: ResearchEntry[];
  securityIssues: SecurityIssue[];
  capabilities: any[];
  models: any[];
  marketData: any[];
  selectedAgentId: string | null;
  activeTab: 'Dashboard' | 'Tasks' | 'OrgTree' | 'Memory' | 'Artifacts' | 'Cron' | 'Physical' | 'Logs' | 'Capabilities' | 'Models' | 'Approvals' | 'SystemHealth' | 'Research' | 'Security';
}
