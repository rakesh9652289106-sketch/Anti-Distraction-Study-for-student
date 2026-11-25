import fs from 'fs';
import path from 'path';

// Types
export interface Task {
  id: string;
  title: string;
  completed: boolean;
  completedAt?: string | null;
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

export interface RoomParticipantStats {
  userId: string;
  name: string;
  email?: string;
  joinedAt: string;
  gazeStatus: 'Focused' | 'Looking Away' | 'Distracted' | 'Offline' | string;
  gazeAlerts: number;
  tabSwitchCount: number;
  focusScore: number;
  lastUpdated: string;
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
  coinsLimit?: number;
  bonusCoins?: number;
  allowMaterialDownloads?: boolean;
  roomHead?: {
    userId: string;
    name: string;
    email: string;
  } | null;
  joinedStudents?: RoomParticipantStats[];
}

export interface GlobalSettings {
  studyMode: boolean;
  distractionShield: boolean;
  blockedWebsites: string[];
  focusScore: number;
  pomodoroWorkTime: number; // in minutes
  pomodoroBreakTime: number; // in minutes
  currentStreak: number;
  focusCoins: number;
  cameraEnabled?: boolean;
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
    stareDurationLimit?: number;
    gazeStatusDuration?: number;
    lookAtScreenDuration?: number;
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
  phone?: string;
  focusScore: number;
  focusCoins: number;
  currentStreak: number;
  status: 'active' | 'suspended' | 'offline';
  lastActive: string;
  chatMuted: boolean;
}

// Stitch New Resource & Group Types
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

export interface StaffMember {
  id: string;
  name: string;
  email: string;
  phone?: string;
  password?: string;
  department: string;
  createdAt: string;
}

export interface TimetableEvent {
  id: string;
  title: string;
  day: 'Mon' | 'Tue' | 'Wed' | 'Thu' | 'Fri' | 'Sat' | 'Sun';
  time: string;
  subject: string;
  pomodoros: number;
  isAiSuggested?: boolean;
}

export interface DbSchema {
  tasks: Task[];
  sessions: StudySession[];
  analytics: AnalyticsSummary[];
  rewards: RewardItem[];
  rooms: StudyRoom[];
  settings: GlobalSettings;
  tickets: SupportTicket[];
  alerts: AdminAlert[];
  users: StudentUser[];
  staff: StaffMember[];
  timetable: TimetableEvent[];
}

const DATA_DIR = path.join(process.cwd(), 'data');
const DB_FILE = path.join(DATA_DIR, 'db.json');
const RESOURCES_FILE = path.join(DATA_DIR, 'resources.json');
const GROUPS_FILE = path.join(DATA_DIR, 'groups.json');

// Helper to initialize database with default data
function getInitialData(): DbSchema {
  return {
    tasks: [
      { id: '1', title: 'Review Chapter 4', completed: true, subject: 'Biology', estimatedPomodoros: 2, actualPomodoros: 2 },
      { id: '2', title: 'Biology - Cell Structure Notes', completed: false, subject: 'Biology', estimatedPomodoros: 3, actualPomodoros: 1 },
      { id: '3', title: 'Math Problem Set 3', completed: false, subject: 'Mathematics', estimatedPomodoros: 4, actualPomodoros: 0 }
    ],
    sessions: [
      { id: 's1', startTime: new Date(Date.now() - 3600000 * 24).toISOString(), durationMinutes: 25, taskTitle: 'Review Chapter 4', distractionsBlocked: 3, focusScore: 94 },
      { id: 's2', startTime: new Date().toISOString(), durationMinutes: 15, taskTitle: 'Biology - Cell Structure Notes', distractionsBlocked: 1, focusScore: 92 }
    ],
    analytics: [
      { date: new Date(Date.now() - 3600000 * 48).toISOString().split('T')[0], focusMinutes: 120, distractionsBlocked: 12, focusScore: 89 },
      { date: new Date(Date.now() - 3600000 * 24).toISOString().split('T')[0], focusMinutes: 165, distractionsBlocked: 8, focusScore: 94 },
      { date: new Date().toISOString().split('T')[0], focusMinutes: 40, distractionsBlocked: 4, focusScore: 92 }
    ],
    rewards: [
      { id: 'r1', title: 'Forest Theme', description: 'Unlock a calming green styling for your workspace.', cost: 50, icon: 'forest', purchased: false },
      { id: 'r2', title: 'Deep Space Soundscape', description: 'Calming cosmic synth sounds for absolute concentration.', cost: 100, icon: 'blur_on', purchased: true },
      { id: 'r3', title: 'Double Streak Card', description: 'Protects your streak for one day if you miss a session.', cost: 150, icon: 'star', purchased: false },
      { id: 'r4', title: 'Cyberpunk Theme', description: 'Neon overlays and futuristic dashboard alerts.', cost: 200, icon: 'bolt', purchased: false }
    ],
    rooms: [
      {
        id: 'room-1',
        name: 'Silent Library',
        activeUsers: 14,
        tags: ['No Chat', 'Silent', 'Intense'],
        ambientSound: 'Soft Rain',
        messages: [
          { id: 'm1', user: 'Alex', text: 'Stretching for 5 mins, then back to math!', timestamp: new Date().toISOString() }
        ],
        hostName: 'Admin Library',
        isVerified: true,
        maxCapacity: 50,
        allowedApps: ['notion', 'gdocs'],
        focusMode: 'Standard Lock',
        sessionDurationFormat: '50m Focus / 10m Break'
      },
      {
        id: 'room-2',
        name: 'AI Study Guild',
        activeUsers: 8,
        tags: ['Coding', 'Discussion', 'Lofi'],
        ambientSound: 'Lofi Beats',
        messages: [
          { id: 'm2', user: 'Sara', text: 'Working on a new Next.js dashboard', timestamp: new Date().toISOString() }
        ],
        hostName: 'Tutor Bot',
        isVerified: true,
        maxCapacity: 30,
        allowedApps: ['notion', 'terminal'],
        focusMode: 'AI Active Nudge',
        sessionDurationFormat: '25m Focus / 5m Discussion'
      },
      {
        id: 'room-3',
        name: 'STEM Prep Hall',
        activeUsers: 5,
        tags: ['Science', 'Calculus', 'Exam prep'],
        ambientSound: 'Library Ambient',
        messages: [],
        hostName: 'Prof. Alex Rivera',
        isVerified: true,
        maxCapacity: 20,
        allowedApps: ['gdocs', 'youtube'],
        focusMode: 'Hard Lock',
        sessionDurationFormat: '90m Focus / 15m Insight Exchange'
      }
    ],
    settings: {
      studyMode: false,
      distractionShield: true,
      blockedWebsites: ['instagram.com', 'facebook.com', 'youtube.com', 'twitter.com', 'tiktok.com'],
      focusScore: 92,
      pomodoroWorkTime: 25,
      pomodoroBreakTime: 5,
      currentStreak: 5,
      focusCoins: 120,
      cameraEnabled: true,
      groupConfig: {
        maxUsersPerGroup: 8,
        allowScreenShare: true,
        videoStreamRequired: false,
        chatModerationFilter: true,
        censorWords: ['spam', 'cheat', 'abuse', 'slack', 'tiktok'],
        idleTimeoutMinutes: 15
      },
      aiConfig: {
        personality: 'academic',
        temperature: 0.7,
        systemPrompt: 'You are FocusFlow AI Tutor. Provide structured explanations and advice. Maintain a supportive educational tone. Encourage the student to avoid distraction and use Pomodoro blocks.',
        attentionGuardSensitivity: 'medium',
        stareDurationLimit: 7,
        gazeStatusDuration: 10,
        lookAtScreenDuration: 10
      }
    },
    tickets: [
      {
        id: 't1',
        subject: 'Distraction shield not blocking Chrome extensions',
        message: 'I notice my extension is still letting youtube pages load even when focus lock is active.',
        status: 'Open',
        timestamp: new Date().toISOString(),
        replies: [
          { user: 'Support Bot', text: 'Hello! Please make sure you have granted file access permissions to the Study Shield extension.', timestamp: new Date().toISOString() }
        ]
      }
    ],
    alerts: [
      { id: '1', title: 'Node AP-East-2 Offline', text: 'Failing health checks for 5 minutes. Traffic re-routed automatically to AP-East-1.', time: '10:42 AM', region: 'AP-EAST', source: 'SYSTEM_AUTO', type: 'error' },
      { id: '2', title: 'High Token Consumption', text: 'Emotional analysis engine usage spiked 40% above baseline in EU-Central.', time: '09:15 AM', region: 'EU-CENTRAL', source: 'AI_ENGINE', type: 'warning' },
      { id: '3', title: 'Maintenance Scheduled', text: 'Routine DB index optimization scheduled for off-peak hours (02:00 UTC).', time: '08:00 AM', region: 'GLOBAL', source: 'ADMIN_SCHED', type: 'info' }
    ],
    users: [
      { id: 'u1', name: 'Alex Rivera', email: 'alex@student.edu', focusScore: 94, focusCoins: 150, currentStreak: 6, status: 'active', lastActive: '10 mins ago', chatMuted: false },
      { id: 'u2', name: 'Sara Chen', email: 'sara@student.edu', focusScore: 98, focusCoins: 310, currentStreak: 12, status: 'active', lastActive: 'Just now', chatMuted: false },
      { id: 'u3', name: 'Michael K.', email: 'michael@student.edu', focusScore: 82, focusCoins: 45, currentStreak: 2, status: 'offline', lastActive: '2 hours ago', chatMuted: false },
      { id: 'u4', name: 'Jessica Vance', email: 'jessica@student.edu', focusScore: 91, focusCoins: 120, currentStreak: 5, status: 'active', lastActive: '15 mins ago', chatMuted: false },
      { id: 'u5', name: 'Emily Watson', email: 'emily@student.edu', focusScore: 45, focusCoins: 10, currentStreak: 0, status: 'suspended', lastActive: '1 day ago', chatMuted: true }
    ],
    staff: [
      { id: 'staff-1', name: 'Prof. Alex Rivera', email: 'staff@focusflow.ai', password: 'staff123', department: 'Computer Science', createdAt: new Date().toISOString() },
      { id: 'staff-2', name: 'Dr. Maya Lin', email: 'maya@focusflow.ai', password: 'staff123', department: 'Physics & STEM', createdAt: new Date().toISOString() }
    ],
    timetable: [
      { id: 't-1', title: 'Calculus Revision', day: 'Mon', time: '9:00 AM', subject: 'Mathematics', pomodoros: 2 },
      { id: 't-2', title: 'Biology Deep Dive', day: 'Tue', time: '11:00 AM - 2h', subject: 'Biology', pomodoros: 4, isAiSuggested: true },
      { id: 't-3', title: 'History Essay', day: 'Thu', time: '2:00 PM', subject: 'History', pomodoros: 2 },
      { id: 't-4', title: 'Chemistry Lab Prep', day: 'Fri', time: '10:00 AM', subject: 'Physics', pomodoros: 2 }
    ]
  };
}

// Read database
let dbCache: DbSchema = getInitialData();
let resourcesCache: SharedResource[] = [];
let groupsCache: ClassroomGroup[] = [];

// Initialize Firebase Web SDK
import { initializeApp } from 'firebase/app';
import { getFirestore, doc, setDoc, getDoc } from 'firebase/firestore';

const firebaseConfig = {
  projectId: "anti-distraction-study",
  appId: "1:996142802859:web:4663775e7ab78e6aa454ee",
  storageBucket: "anti-distraction-study.firebasestorage.app",
  apiKey: "AIzaSyC34pe5sjeX7xqfRVkWdS7RAOzkGV22bNI",
  authDomain: "anti-distraction-study.firebaseapp.com",
  messagingSenderId: "996142802859",
  measurementId: "G-V4ZCBG46PM"
};

const app = initializeApp(firebaseConfig);
const firestoreDb = getFirestore(app);

// Asynchronously sync data from Firestore
export async function syncFromFirestore() {
  console.log("[Firestore Sync] Starting synchronization...");
  try {
    const docKeys: Array<keyof DbSchema> = ['tasks', 'sessions', 'analytics', 'rewards', 'rooms', 'settings', 'tickets', 'alerts', 'users', 'staff', 'timetable'];
    
    for (const key of docKeys) {
      const docRef = doc(firestoreDb, 'focusflow', key);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        const data = docSnap.data();
        if (key === 'settings') {
          dbCache.settings = data as GlobalSettings;
        } else {
          (dbCache as any)[key] = data.list || [];
        }
      } else {
        console.log(`[Firestore Sync] Key "${key}" not found in Firestore. Creating default...`);
        if (key === 'settings') {
          await setDoc(docRef, dbCache.settings);
        } else {
          await setDoc(docRef, { list: dbCache[key] });
        }
      }
    }

    // Sync resources
    const resRef = doc(firestoreDb, 'focusflow', 'resources');
    const resSnap = await getDoc(resRef);
    if (resSnap.exists()) {
      resourcesCache = resSnap.data().list || [];
    } else {
      console.log(`[Firestore Sync] Key "resources" not found in Firestore. Creating default...`);
      await setDoc(resRef, { list: [] });
      resourcesCache = [];
    }

    // Sync groups
    const grpRef = doc(firestoreDb, 'focusflow', 'groups');
    const grpSnap = await getDoc(grpRef);
    if (grpSnap.exists()) {
      groupsCache = grpSnap.data().list || [];
    } else {
      console.log(`[Firestore Sync] Key "groups" not found in Firestore. Creating default...`);
      await setDoc(grpRef, { list: [] });
      groupsCache = [];
    }

    console.log("[Firestore Sync] Synchronization complete!");
  } catch (err) {
    console.error("[Firestore Sync] Error during synchronization:", err);
  }
}

export function readDb(): DbSchema {
  if (!Array.isArray(dbCache.staff) || dbCache.staff.length === 0) {
    dbCache.staff = getInitialData().staff;
  }
  // Defensive checks to ensure loaded database structure remains correct
  if (dbCache.rooms) {
    const defaults = getInitialData().rooms;
    dbCache.rooms.forEach((r: any) => {
      const d = defaults.find(item => item.id === r.id) || defaults[0];
      if (r.hostName === undefined) r.hostName = d.hostName;
      if (r.isVerified === undefined) r.isVerified = d.isVerified;
      if (r.maxCapacity === undefined) r.maxCapacity = d.maxCapacity;
      if (r.allowedApps === undefined) r.allowedApps = d.allowedApps;
      if (r.focusMode === undefined) r.focusMode = d.focusMode;
      if (r.sessionDurationFormat === undefined) r.sessionDurationFormat = d.sessionDurationFormat;
      if (r.coinsLimit === undefined) r.coinsLimit = 0;
      if (r.bonusCoins === undefined) r.bonusCoins = 0;
      if (r.allowMaterialDownloads === undefined) r.allowMaterialDownloads = true;
      if (r.roomHead === undefined) r.roomHead = null;
      if (!Array.isArray(r.joinedStudents)) r.joinedStudents = [];
      // Backfill joinedStudents for rooms with activeUsers recorded before telemetry tracking
      if (r.activeUsers > 0 && r.joinedStudents.length === 0 && Array.isArray(dbCache.users)) {
        const count = Math.min(r.activeUsers, dbCache.users.length);
        r.joinedStudents = dbCache.users.slice(0, count).map(u => ({
          userId: u.id,
          name: u.name,
          email: u.email,
          joinedAt: new Date().toISOString(),
          gazeStatus: 'Focused',
          gazeAlerts: 0,
          tabSwitchCount: 0,
          focusScore: u.focusScore || 92,
          lastUpdated: new Date().toISOString()
        }));
      }
    });
  }
  return dbCache;
}

// Write database
export function writeDb(data: DbSchema) {
  dbCache = data;
  saveDbToFirestore(data);
}

async function saveDbToFirestore(data: DbSchema) {
  try {
    const docKeys: Array<keyof DbSchema> = ['tasks', 'sessions', 'analytics', 'rewards', 'rooms', 'settings', 'tickets', 'alerts', 'users', 'staff', 'timetable'];
    for (const key of docKeys) {
      const docRef = doc(firestoreDb, 'focusflow', key);
      if (key === 'settings') {
        await setDoc(docRef, data.settings);
      } else {
        await setDoc(docRef, { list: data[key] });
      }
    }
  } catch (err) {
    console.error("[Firestore Save] Error saving db to Firestore:", err);
  }
}

export function readResourcesDb(): SharedResource[] {
  return resourcesCache;
}

export function writeResourcesDb(data: SharedResource[]) {
  resourcesCache = data;
  setDoc(doc(firestoreDb, 'focusflow', 'resources'), { list: data }).catch(err => {
    console.error("[Firestore Save] Error saving resources:", err);
  });
}

export function readGroupsDb(): ClassroomGroup[] {
  return groupsCache;
}

export function writeGroupsDb(data: ClassroomGroup[]) {
  groupsCache = data;
  setDoc(doc(firestoreDb, 'focusflow', 'groups'), { list: data }).catch(err => {
    console.error("[Firestore Save] Error saving groups:", err);
  });
}

export async function saveUploadedFileContent(
  resourceId: string,
  filename: string,
  mimeType: string,
  base64Content: string
) {
  try {
    // Firestore single-doc limit is 1MB; store files up to ~700KB base64 directly in Firestore
    if (base64Content.length <= 900_000) {
      await setDoc(doc(firestoreDb, 'focusflow_files', resourceId), {
        filename,
        mimeType,
        base64Content,
        updatedAt: new Date().toISOString()
      });
    }
  } catch (err) {
    console.error('[Firestore Save] Error saving file binary:', err);
  }
}

export async function getUploadedFileContent(resourceId: string): Promise<{
  filename: string;
  mimeType: string;
  base64Content: string;
} | null> {
  try {
    const snap = await getDoc(doc(firestoreDb, 'focusflow_files', resourceId));
    if (!snap.exists()) return null;
    const data = snap.data();
    if (!data?.base64Content) return null;
    return {
      filename: data.filename || 'file',
      mimeType: data.mimeType || 'application/octet-stream',
      base64Content: data.base64Content
    };
  } catch (err) {
    console.error('[Firestore Read] Error reading file binary:', err);
    return null;
  }
}
