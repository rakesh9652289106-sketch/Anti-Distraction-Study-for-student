export interface Task {
  id: string;
  title: string;
  completed: boolean;
  subject: string;
  estimatedPomodoros: number;
  actualPomodoros: number;
}

export interface StudySession {
  id: string;
  startTime: string;
  durationMinutes: number;
  taskTitle: string;
  distractionsBlocked: number;
  focusScore: number;
  timeline?: Array<{ minute: number; score: number }>;
}

export interface AnalyticsSummary {
  date: string;
  focusMinutes: number;
  distractionsBlocked: number;
  focusScore: number;
}

export interface RewardItem {
  id: string;
  title: string;
  description: string;
  cost: number;
  icon: string;
  purchased: boolean;
}

export interface StudyRoom {
  id: string;
  name: string;
  activeUsers: number;
  tags: string[];
  ambientSound: string;
  messages: Array<{
    id: string;
    user: string;
    text: string;
    timestamp: string;
  }>;
  hostName?: string;
  isVerified?: boolean;
  maxCapacity?: number;
  allowedApps?: string[];
  focusMode?: string;
  sessionDurationFormat?: string;
  allowScreenShare?: boolean;
  videoStreamRequired?: boolean;
  chatModerationFilter?: boolean;
  censorWords?: string[];
}

export interface GlobalSettings {
  studyMode: boolean;
  distractionShield: boolean;
  blockedWebsites: string[];
  focusScore: number;
  pomodoroWorkTime: number;
  pomodoroBreakTime: number;
  currentStreak: number;
  focusCoins: number;
  uiConfig?: {
    theme: string;
    density: string;
    brandingName: string;
  };
  aiConfig?: {
    personality: string;
    temperature: number;
    systemPrompt: string;
    attentionGuardSensitivity: string;
  };
  groupConfig?: {
    maxUsersPerGroup: number;
    allowScreenShare: boolean;
    videoStreamRequired: boolean;
    chatModerationFilter: boolean;
    censorWords: string[];
    idleTimeoutMinutes: number;
  };
}

export interface SupportTicket {
  id: string;
  subject: string;
  message: string;
  status: string;
  timestamp: string;
  replies: Array<{
    user: string;
    text: string;
    timestamp: string;
  }>;
}

export interface AdminAlert {
  id: string;
  title: string;
  text: string;
  time: string;
  region: string;
  source: string;
  type: 'error' | 'warning' | 'info';
}

export interface StudentUser {
  id: string;
  name: string;
  email: string;
  focusScore: number;
  focusCoins: number;
  currentStreak: number;
  status: 'active' | 'suspended' | 'offline';
  lastActive: string;
  chatMuted: boolean;
}

export interface SharedResource {
  id: string;
  title: string;
  fileType: 'pdf' | 'video' | 'note' | 'paper' | 'link';
  url: string;
  size?: string;
  ownerId: string;
  relevanceScore: number;
  aiSummarySnippet: string;
  suggestedTags: string[];
  sharedWithGroups: Array<{
    groupId: string;
    permissions: { viewOnly: boolean; canDownload: boolean; allowAiSummarization: boolean };
  }>;
  stats: { views: number; downloads: number };
  createdAt: string;
  starred: boolean;
  archived: boolean;
}

export interface ClassroomGroup {
  id: string;
  name: string;
  teacherId: string;
  room: string;
  studentCount: number;
  active: boolean;
  students: string[];
  activeSessionId?: string | null;
}
