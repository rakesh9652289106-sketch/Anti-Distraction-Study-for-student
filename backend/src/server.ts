import cookieParser from 'cookie-parser';
import cors from 'cors';
import express, { Request, Response } from 'express';
import fs from 'fs';
import path from 'path';
import {
  readDb,
  writeDb,
  readResourcesDb,
  writeResourcesDb,
  readGroupsDb,
  writeGroupsDb,
  Task,
  StudySession,
  AnalyticsSummary,
  RewardItem,
  StudyRoom,
  SupportTicket,
  AdminAlert,
  StudentUser,
  SharedResource,
  ClassroomGroup,
  TimetableEvent
} from './db';
import { generateAiResponse } from './educationalAi';

const app = express();
const PORT = process.env.PORT || 5000;

// Enable CORS for client requests
app.use(cors({
  origin: 'http://localhost:3000',
  credentials: true
}));

app.use(express.json());
app.use(cookieParser());

// Serve static uploads folder
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

import crypto from 'crypto';

function hashPassword(password: string): string {
  return crypto.createHash('sha256').update(password).digest('hex');
}

// Student helper to retrieve active user
function getStudentId(req: Request): string | null {
  return req.cookies?.focusflow_student_auth || null;
}

// -------------------------------------------------------------
// Student Auth API Endpoints
// -------------------------------------------------------------

app.get('/api/auth/me', (req: Request, res: Response) => {
  try {
    const studentId = getStudentId(req);
    if (!studentId) {
      return res.status(401).json({ error: 'Not authenticated' });
    }
    const db = readDb();
    const student = db.users.find(u => u.id === studentId);
    if (!student) {
      return res.status(401).json({ error: 'Student profile not found' });
    }
    res.json({ success: true, user: student });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/auth/signup', (req: Request, res: Response) => {
  try {
    const { name, email, phone, password } = req.body;
    if (!name || !email || !phone || !password) {
      return res.status(400).json({ error: 'All registration fields are required' });
    }

    const db = readDb();
    
    // Check duplicate
    const duplicate = db.users.find(u => u.email === email || u.phone === phone);
    if (duplicate) {
      return res.status(400).json({ error: 'Account already exists with this email or phone' });
    }

    const passwordHash = hashPassword(password);
    const newStudent: StudentUser = {
      id: 'u-' + Math.random().toString(36).substring(2, 9),
      name,
      email,
      phone,
      passwordHash,
      focusScore: 90,
      focusCoins: 100,
      currentStreak: 0,
      status: 'active',
      lastActive: 'Just now',
      chatMuted: false,
      purchasedRewards: [],
      settings: {
        studyMode: false,
        distractionShield: true,
        blockedWebsites: ['instagram.com', 'facebook.com', 'youtube.com', 'twitter.com', 'tiktok.com'],
        focusScore: 90,
        pomodoroWorkTime: 25,
        pomodoroBreakTime: 5,
        currentStreak: 0,
        focusCoins: 100
      }
    };

    db.users.push(newStudent);
    writeDb(db);

    res.cookie('focusflow_student_auth', newStudent.id, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      path: '/',
      maxAge: 86400 * 30 * 1000 // 30 days
    });

    res.status(201).json({ success: true, user: newStudent });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/auth/login', (req: Request, res: Response) => {
  try {
    const { emailOrPhone, password } = req.body;
    if (!emailOrPhone || !password) {
      return res.status(400).json({ error: 'Credentials are required' });
    }

    const db = readDb();
    const passwordHash = hashPassword(password);

    const student = db.users.find(u => 
      (u.email === emailOrPhone || u.phone === emailOrPhone) && 
      u.passwordHash === passwordHash
    );

    if (!student) {
      return res.status(401).json({ error: 'Incorrect email/phone or password' });
    }

    // Update status
    student.status = 'active';
    student.lastActive = 'Just now';
    writeDb(db);

    res.cookie('focusflow_student_auth', student.id, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      path: '/',
      maxAge: 86400 * 30 * 1000 // 30 days
    });

    res.json({ success: true, user: student });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/auth/logout', (req: Request, res: Response) => {
  try {
    const studentId = getStudentId(req);
    if (studentId) {
      const db = readDb();
      const student = db.users.find(u => u.id === studentId);
      if (student) {
        student.status = 'offline';
        student.lastActive = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) + ' ago';
        writeDb(db);
      }
    }

    res.cookie('focusflow_student_auth', '', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      path: '/',
      maxAge: 0
    });

    res.json({ success: true, message: 'Logged out successfully' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Helper for admin authorization
function isAuthenticated(req: Request): boolean {
  const token = req.cookies?.focusflow_admin_auth;
  return token === 'authenticated';
}

// -------------------------------------------------------------
// Admin Auth API Endpoints
// -------------------------------------------------------------

app.get('/api/admin/check-auth', (req: Request, res: Response) => {
  const token = req.cookies?.focusflow_admin_auth;
  const authenticated = token === 'authenticated';
  res.json({ authenticated });
});

app.post('/api/admin/login', (req: Request, res: Response) => {
  try {
    const { password } = req.body;

    if (password === 'admin123') {
      res.cookie('focusflow_admin_auth', 'authenticated', {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        path: '/',
        maxAge: 86400 * 1000 // 1 day in ms
      });
      return res.json({ success: true, message: 'Logged in successfully' });
    }

    return res.status(401).json({ error: 'Incorrect admin password' });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

app.post('/api/admin/logout', (req: Request, res: Response) => {
  res.cookie('focusflow_admin_auth', '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    path: '/',
    maxAge: 0
  });
  res.json({ success: true, message: 'Logged out successfully' });
});

// -------------------------------------------------------------
// Admin Alerts API Endpoints
// -------------------------------------------------------------

app.get('/api/admin/alerts', (req: Request, res: Response) => {
  if (!isAuthenticated(req)) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  const db = readDb();
  res.json(db.alerts || []);
});

app.post('/api/admin/alerts', (req: Request, res: Response) => {
  if (!isAuthenticated(req)) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  try {
    const body = req.body;
    if (!body.title || !body.text) {
      return res.status(400).json({ error: 'Title and Text are required' });
    }

    const db = readDb();
    if (!db.alerts) {
      db.alerts = [];
    }

    const localTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    const newAlert: AdminAlert = {
      id: 'alert-' + Math.random().toString(36).substring(2, 9),
      title: body.title,
      text: body.text,
      time: localTime,
      type: body.type || 'warning',
      region: body.region || 'Local Client',
      source: body.source || 'Webcam Monitor'
    };

    db.alerts.unshift(newAlert);
    if (db.alerts.length > 50) {
      db.alerts = db.alerts.slice(0, 50);
    }

    writeDb(db);
    res.status(201).json(newAlert);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// -------------------------------------------------------------
// Admin Users API Endpoints
// -------------------------------------------------------------

app.get('/api/admin/users', (req: Request, res: Response) => {
  if (!isAuthenticated(req)) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  try {
    const db = readDb();
    res.json(db.users || []);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.patch('/api/admin/users', (req: Request, res: Response) => {
  if (!isAuthenticated(req)) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  try {
    const { userId, name, email, focusScore, focusCoins, currentStreak, status, chatMuted } = req.body;
    
    if (!userId) {
      return res.status(400).json({ error: 'User ID is required' });
    }

    const db = readDb();
    const user = db.users.find(u => u.id === userId);

    if (!user) {
      return res.status(404).json({ error: 'Student user not found' });
    }

    if (name !== undefined) user.name = name;
    if (email !== undefined) user.email = email;
    if (focusScore !== undefined) user.focusScore = parseInt(focusScore) || 0;
    if (focusCoins !== undefined) user.focusCoins = parseInt(focusCoins) || 0;
    if (currentStreak !== undefined) user.currentStreak = parseInt(currentStreak) || 0;
    if (status !== undefined) user.status = status;
    if (chatMuted !== undefined) user.chatMuted = chatMuted;

    writeDb(db);
    res.json(user);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/admin/users', (req: Request, res: Response) => {
  if (!isAuthenticated(req)) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  try {
    const userId = req.query.userId as string;
    
    if (!userId) {
      return res.status(400).json({ error: 'User ID is required' });
    }

    const db = readDb();
    const idx = db.users.findIndex(u => u.id === userId);

    if (idx === -1) {
      return res.status(404).json({ error: 'Student user not found' });
    }

    db.users.splice(idx, 1);
    writeDb(db);
    res.json({ success: true, message: 'Student user removed successfully' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// -------------------------------------------------------------
// [NEW STITCH] Admin Master Dashboard Metrics API Endpoints
// -------------------------------------------------------------

// GET /api/admin/metrics
app.get('/api/admin/metrics', (req: Request, res: Response) => {
  if (!isAuthenticated(req)) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  const db = readDb();
  const groups = readGroupsDb();
  const resources = readResourcesDb();

  res.json({
    systemStats: {
      uptimePercent: 99.98,
      totalStudents: db.users.length * 1500, // mock scaled
      studentsGrowthTrend: 4.2,
      activeFaculty: 84,
      facultyGrowthTrend: 1.5,
      activeLicenses: db.users.length * 1200,
      licensesGrowthTrend: 6.8,
      storageUsagePercent: 62.4
    },
    zonesSummary: {
      studentZone: {
        onlineNow: db.users.filter(u => u.status === 'active').length * 20,
        pendingRegistration: 14
      },
      teacherZone: {
        activeCourses: groups.length,
        flaggedResources: resources.filter(r => r.relevanceScore < 50).length
      },
      infraZone: {
        latencyMs: 18,
        apiLoadStatus: 'Normal'
      }
    }
  });
});

// GET /api/admin/ai-insights
app.get('/api/admin/ai-insights', (req: Request, res: Response) => {
  if (!isAuthenticated(req)) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  res.json([
    {
      id: "ins-1",
      severity: "info",
      text: "System predicts a 15% surge in student concurrency tomorrow morning due to physics homework due dates."
    },
    {
      id: "ins-2",
      severity: "success",
      text: "Automatic garbage collection active. Saved 4.2 GB database indices storage size."
    },
    {
      id: "ins-3",
      severity: "warning",
      text: "Attention Guard webcam engine flagged a high proportion of idle events in STEM Prep Hall."
    }
  ]);
});

// GET /api/admin/system-events
app.get('/api/admin/system-events', (req: Request, res: Response) => {
  if (!isAuthenticated(req)) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  res.json([
    { timestamp: new Date(Date.now() - 60000).toISOString(), module: "Auth_Gate", eventType: "Access Granted", status: "NORMAL", affectedUid: "admin@focusflow.ai" },
    { timestamp: new Date(Date.now() - 300000).toISOString(), module: "DB_JSON", eventType: "Database Read Sync", status: "NORMAL", affectedUid: "db.json" },
    { timestamp: new Date(Date.now() - 600000).toISOString(), module: "AI_Tutor", eventType: "Vector Search Success", status: "NORMAL", affectedUid: "educationalAi" }
  ]);
});

// POST /api/admin/reports/generate
app.post('/api/admin/reports/generate', (req: Request, res: Response) => {
  if (!isAuthenticated(req)) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  res.json({ success: true, downloadUrl: "/api/data/manage" });
});

// POST /api/admin/system/safe-mode
app.post('/api/admin/system/safe-mode', (req: Request, res: Response) => {
  if (!isAuthenticated(req)) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  const { enabled } = req.body;
  res.json({ success: true, status: enabled ? "safe-mode-engaged" : "safe-mode-disengaged" });
});

// -------------------------------------------------------------
// [NEW STITCH] Admin Configurations API Endpoints
// -------------------------------------------------------------

// GET /api/admin/config
app.get('/api/admin/config', (req: Request, res: Response) => {
  if (!isAuthenticated(req)) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  const db = readDb();
  res.json({
    dashboardLayout: {
      gridStyle: "Standard",
      quickActionsEnabled: true
    },
    aiAssistant: {
      activeProactivity: db.settings.aiConfig?.personality === 'strict',
      moodDetection: true
    },
    rewardSystem: {
      status: "Gamma Active",
      streaksMultiplier: true,
      publicLeaderboards: true
    },
    studyRoomPermissions: {
      globalMaxCapacity: db.settings.groupConfig?.maxUsersPerGroup || 25,
      moderatorsPerRoom: 2,
      guestJoinRequests: "Enabled",
      screenshareAllowed: db.settings.groupConfig?.allowScreenShare ? "Strict" : "Disabled",
      audioBroadcast: "Disabled"
    },
    groupAppIntegration: [
      { id: "app-linkedin", name: "LinkedIn", icon: "work", enabled: true },
      { id: "app-youtube", name: "YouTube", icon: "video_library", enabled: !db.settings.blockedWebsites.includes("youtube.com") },
      { id: "app-gdocs", name: "Google Docs", icon: "description", enabled: true }
    ]
  });
});

// PUT /api/admin/config
app.put('/api/admin/config', (req: Request, res: Response) => {
  if (!isAuthenticated(req)) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  try {
    const db = readDb();
    const config = req.body;

    if (config.studyRoomPermissions?.globalMaxCapacity !== undefined) {
      if (!db.settings.groupConfig) db.settings.groupConfig = {} as any;
      db.settings.groupConfig!.maxUsersPerGroup = config.studyRoomPermissions.globalMaxCapacity;
    }
    
    if (config.groupAppIntegration) {
      const youtubeApp = config.groupAppIntegration.find((app: any) => app.id === 'app-youtube');
      if (youtubeApp && youtubeApp.enabled === false) {
        if (!db.settings.blockedWebsites.includes("youtube.com")) {
          db.settings.blockedWebsites.push("youtube.com");
        }
      } else if (youtubeApp && youtubeApp.enabled === true) {
        db.settings.blockedWebsites = db.settings.blockedWebsites.filter(w => w !== "youtube.com");
      }
    }

    writeDb(db);
    res.json({ success: true, updatedConfig: config });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/admin/groups
app.post('/api/admin/groups', (req: Request, res: Response) => {
  if (!isAuthenticated(req)) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  try {
    const { name, room } = req.body;
    if (!name) return res.status(400).json({ error: "Group name is required" });

    const groups = readGroupsDb();
    const newGroup: ClassroomGroup = {
      id: 'g-' + Math.random().toString(36).substring(2, 9),
      name,
      teacherId: 't-aris-thorne',
      room: room || 'Room 101',
      studentCount: 0,
      active: false,
      students: [],
      activeSessionId: null
    };

    groups.push(newGroup);
    writeGroupsDb(groups);

    res.status(201).json(newGroup);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/admin/groups
app.get('/api/admin/groups', (req: Request, res: Response) => {
  if (!isAuthenticated(req)) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  try {
    const db = readDb();
    const groups = readGroupsDb();
    
    // Auto-create groups for any preexisting rooms that lack one
    let modified = false;
    db.rooms.forEach(room => {
      const existing = groups.find(g => g.id === room.id);
      if (!existing) {
        groups.push({
          id: room.id,
          name: room.name,
          teacherId: 't-aris-thorne',
          room: room.name,
          studentCount: 0,
          active: true,
          students: [],
          activeSessionId: null
        });
        modified = true;
      }
    });
    
    if (modified) {
      writeGroupsDb(groups);
    }
    
    res.json(groups);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/admin/groups/:groupId
app.delete('/api/admin/groups/:groupId', (req: Request, res: Response) => {
  if (!isAuthenticated(req)) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  try {
    const { groupId } = req.params;
    const groups = readGroupsDb();
    const index = groups.findIndex(g => g.id === groupId);
    if (index === -1) {
      return res.status(404).json({ error: 'Group not found' });
    }
    
    groups.splice(index, 1);
    writeGroupsDb(groups);
    res.json({ success: true, message: 'Group deleted successfully' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/admin/groups/:groupId/students/:studentId
app.delete('/api/admin/groups/:groupId/students/:studentId', (req: Request, res: Response) => {
  if (!isAuthenticated(req)) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  try {
    const { groupId, studentId } = req.params;
    const groups = readGroupsDb();
    const group = groups.find(g => g.id === groupId);
    if (!group) {
      return res.status(404).json({ error: 'Group not found' });
    }
    
    const initialLength = group.students.length;
    group.students = group.students.filter(id => id !== studentId);
    
    if (group.students.length === initialLength) {
      return res.status(404).json({ error: 'Student not found in group' });
    }
    
    group.studentCount = group.students.length;
    writeGroupsDb(groups);
    
    res.json({ success: true, message: 'Student removed from group successfully', group });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/admin/groups/:groupId/students
app.post('/api/admin/groups/:groupId/students', (req: Request, res: Response) => {
  if (!isAuthenticated(req)) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  try {
    const { groupId } = req.params;
    const { studentId } = req.body;
    if (!studentId) {
      return res.status(400).json({ error: 'Student ID is required' });
    }
    
    const groups = readGroupsDb();
    const group = groups.find(g => g.id === groupId);
    if (!group) {
      return res.status(404).json({ error: 'Group not found' });
    }
    
    if (!group.students.includes(studentId)) {
      group.students.push(studentId);
      group.studentCount = group.students.length;
      writeGroupsDb(groups);
    }
    
    res.json({ success: true, message: 'Student added to group successfully', group });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// -------------------------------------------------------------
// [NEW STITCH] Teacher Groups & Session Command API Endpoints
// -------------------------------------------------------------

// GET /api/teacher/groups
app.get('/api/teacher/groups', (req: Request, res: Response) => {
  const groups = readGroupsDb();
  res.json(groups);
});

// GET /api/teacher/groups/:groupId/session
app.get('/api/teacher/groups/:groupId/session', (req: Request, res: Response) => {
  try {
    const { groupId } = req.params;
    const groups = readGroupsDb();
    const group = groups.find(g => g.id === groupId) || groups[0];
    
    res.json({
      liveSession: {
        sessionId: group.activeSessionId || "sess-402",
        focusScore: 84,
        focusTrend: 5,
        activeStudents: group.students.length || 3,
        totalStudents: group.studentCount || 24,
        appsSummary: { "Notion": 14, "VS Code": 6, "YouTube": 2 },
        momentum: {
          timelineMinutes: [10, 20, 30, 40, 50, 60],
          focusValues: [60, 75, 80, 92, 84, 88],
          peakFocusPercent: 92,
          dipTime: "14:20"
        }
      },
      roster: [
        { studentId: "u1", name: "Alex Rivera", avatar: "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=150&q=80", activity: "Focusing on Notion", status: "focusing" },
        { studentId: "u2", name: "Sara Chen", avatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=150&q=80", activity: "Solving Schrödinger Equations", status: "focusing" },
        { studentId: "u4", name: "Jessica Vance", avatar: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?auto=format&fit=crop&w=150&q=80", activity: "Idle for 4m", status: "distracted" }
      ]
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/teacher/session/:sessionId/end
app.post('/api/teacher/session/:sessionId/end', (req: Request, res: Response) => {
  const { sessionId } = req.params;
  const groups = readGroupsDb();
  const target = groups.find(g => g.activeSessionId === sessionId);
  if (target) {
    target.active = false;
    target.activeSessionId = null;
    writeGroupsDb(groups);
  }
  res.json({ success: true, sessionReportId: "report-" + Math.random().toString(36).substring(2, 9) });
});

// POST /api/teacher/session/:sessionId/broadcast
app.post('/api/teacher/session/:sessionId/broadcast', (req: Request, res: Response) => {
  try {
    const { message } = req.body;
    const db = readDb();
    if (!db.alerts) db.alerts = [];
    const newAlert: AdminAlert = {
      id: 'alert-' + Math.random().toString(36).substring(2, 9),
      title: "Teacher Broadcast Announcement",
      text: message || "Attention, class! Please refocus your attention to the assigned study material.",
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      type: 'info',
      region: 'Room 402',
      source: 'Instructor Console'
    };
    db.alerts.unshift(newAlert);
    writeDb(db);
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/teacher/session/:sessionId/apps/:appId/toggle
app.post('/api/teacher/session/:sessionId/apps/:appId/toggle', (req: Request, res: Response) => {
  const { appId } = req.params;
  const { enabled } = req.body;
  
  // Mock logic: if we disable, we block the website globally
  const db = readDb();
  if (appId === 'app-youtube') {
    if (!enabled) {
      if (!db.settings.blockedWebsites.includes("youtube.com")) db.settings.blockedWebsites.push("youtube.com");
    } else {
      db.settings.blockedWebsites = db.settings.blockedWebsites.filter(w => w !== "youtube.com");
    }
    writeDb(db);
  }
  res.json({ success: true, appId, enabled });
});

// POST /api/teacher/session/:sessionId/students/:studentId/nudge
app.post('/api/teacher/session/:sessionId/students/:studentId/nudge', (req: Request, res: Response) => {
  const { studentId } = req.params;
  const db = readDb();
  const user = db.users.find(u => u.id === studentId);
  
  // Set alert
  if (user) {
    const nudgeAlert: AdminAlert = {
      id: 'alert-' + Math.random().toString(36).substring(2, 9),
      title: `Nudge issued to ${user.name}`,
      text: `Refocus alert sent. Student was idle or browser was unfocused.`,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      type: 'warning',
      region: 'Local Client',
      source: 'Teacher Nudge'
    };
    db.alerts.unshift(nudgeAlert);
    writeDb(db);
  }
  res.json({ success: true, status: "nudged" });
});

// POST /api/teacher/session/:sessionId/students/:studentId/lock
app.post('/api/teacher/session/:sessionId/students/:studentId/lock', (req: Request, res: Response) => {
  const { locked } = req.body;
  res.json({ success: true, locked });
});

// -------------------------------------------------------------
// [NEW STITCH] Student Discovery & Rooms API Endpoints
// -------------------------------------------------------------

// GET /api/student/rooms
app.get('/api/student/rooms', (req: Request, res: Response) => {
  const db = readDb();
  const search = (req.query.search as string || '').toLowerCase().trim();
  const topic = (req.query.topic as string || '').toLowerCase().trim();
  
  let list = db.rooms || [];
  if (search) {
    list = list.filter(r => r.name.toLowerCase().includes(search) || r.tags.some(t => t.toLowerCase().includes(search)));
  }
  if (topic && topic !== 'all topics') {
    list = list.filter(r => r.tags.some(t => t.toLowerCase() === topic));
  }
  
  res.json(list);
});

// POST /api/student/rooms/join
app.post('/api/student/rooms/join', (req: Request, res: Response) => {
  const { roomCode, roomId } = req.body;
  const db = readDb();
  const room = db.rooms.find(r => r.id === roomId || r.id === roomCode);
  if (!room) return res.status(404).json({ error: "Focus Room not found" });

  // Enforce coins entry limit
  if (room.coinsLimit !== undefined && room.coinsLimit > 0) {
    if (db.settings.focusCoins < room.coinsLimit) {
      return res.status(403).json({
        error: `Insufficient Focus Coins. You need at least ${room.coinsLimit} coins to enter this room. You currently have ${db.settings.focusCoins} coins.`
      });
    }
  }

  room.activeUsers += 1;
  if (room.bonusCoins !== undefined && room.bonusCoins > 0) {
    db.settings.focusCoins += room.bonusCoins;
  }
  writeDb(db);

  res.json({ success: true, roomId: room.id, websocketUrl: `ws://localhost:5000/rooms/${room.id}/live` });
});

// GET /api/student/flow-goal
app.get('/api/student/flow-goal', (req: Request, res: Response) => {
  const db = readDb();
  const todayStr = new Date().toISOString().split('T')[0];
  const todayAnalytics = db.analytics.find(a => a.date === todayStr);

  res.json({
    targetMinutes: 120,
    completedMinutes: todayAnalytics?.focusMinutes || 40,
    progressPercent: Math.min(100, Math.round(((todayAnalytics?.focusMinutes || 40) / 120) * 100))
  });
});

// GET /api/student/rooms/:roomId
app.get('/api/student/rooms/:roomId', (req: Request, res: Response) => {
  const { roomId } = req.params;
  const db = readDb();
  const resources = readResourcesDb();
  
  const room = db.rooms.find(r => r.id === roomId) || db.rooms[0];
  const roomResources = resources.filter(resItem => 
    resItem.sharedWithGroups.some(g => g.groupId === roomId)
  );

  res.json({
    roomDetails: {
      roomId: room.id,
      title: room.name,
      host: room.hostName || "Prof. Alex Rivera",
      isVerified: room.isVerified ?? true,
      activeSession: true,
      onlineCount: room.activeUsers,
      maxSeats: room.maxCapacity || 20,
      focusIndex: db.settings.focusScore,
      coinsLimit: room.coinsLimit || 0
    },
    environment: {
      focusMode: room.focusMode || "Hard Lock",
      allowedApps: room.allowedApps || ["Notion", "Google Docs"],
      durationFormat: room.sessionDurationFormat || "90m Focus / 15m Insight Exchange"
    },
    participants: [
      { name: "Alex Rivera", status: "focusing", avatar: "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=150&q=80" },
      { name: "Sara Chen", status: "focusing", avatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=150&q=80" },
      { name: "Julian D.", status: "break", avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=150&q=80" }
    ],
    curatedResources: roomResources.map(r => ({
      id: r.id,
      title: r.title,
      type: r.fileType,
      size: r.size || "Unknown Size",
      url: r.url
    }))
  });
});

// POST /api/student/rooms/:roomId/resources/suggest
app.post('/api/student/rooms/:roomId/resources/suggest', (req: Request, res: Response) => {
  try {
    const { roomId } = req.params;
    const { title, type, url } = req.body;
    if (!title) return res.status(400).json({ error: "Title is required" });

    const resources = readResourcesDb();
    
    let resourceUrl = url || 'https://en.wikipedia.org/wiki/Quantum_mechanics';
    if (type === 'video' && !url) {
      resourceUrl = "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4";
    }

    const newResource: SharedResource = {
      id: 'res-' + Math.random().toString(36).substring(2, 9),
      title,
      fileType: type || 'link',
      url: resourceUrl,
      size: 'Student Shared',
      ownerId: 'u-student',
      relevanceScore: 78,
      aiSummarySnippet: "User-submitted reference shared with peer study group.",
      suggestedTags: ["Suggested", "Peer Share"],
      sharedWithGroups: [
        {
          groupId: roomId,
          permissions: { viewOnly: true, canDownload: true, allowAiSummarization: false }
        }
      ],
      stats: { views: 1, downloads: 0 },
      createdAt: new Date().toISOString(),
      starred: false,
      archived: false
    };

    resources.push(newResource);
    writeResourcesDb(resources);

    res.status(201).json({ success: true, suggestedResource: newResource });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/student/rooms/:roomId/invite
app.post('/api/student/rooms/:roomId/invite', (req: Request, res: Response) => {
  const { emails } = req.body;
  console.log(`Sending session invitations to: ${emails?.join(', ')}`);
  res.json({ success: true });
});

// -------------------------------------------------------------
// [NEW STITCH] Student Analytics Summaries API Endpoints
// -------------------------------------------------------------

// GET /api/student/sessions/:sessionId/summary
app.get('/api/student/sessions/:sessionId/summary', (req: Request, res: Response) => {
  const { sessionId } = req.params;
  const db = readDb();
  
  const session = db.sessions.find(s => s.id === sessionId) || db.sessions[0];
  
  res.json({
    summary: {
      sessionId: session.id,
      title: session.taskTitle,
      completedAt: new Date(session.startTime).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' }),
      durationMinutes: session.durationMinutes,
      focusScore: session.focusScore,
      timeline: session.timeline || [
        { minute: 5, score: 60 },
        { minute: 10, score: 75 },
        { minute: 15, score: 92 },
        { minute: 20, score: 96 }
      ]
    },
    aiSummary: {
      recapText: `You successfully maintained flow state during the study sprint for "${session.taskTitle}". Your attention index score was 94% overall, and you blocks 4 distraction prompts from social channels. Excellent work!`,
      suggestedLessonId: "lesson-wave-functions"
    },
    milestones: [
      { name: "Deep Work Streak", reward: "+50 Focus Coins", icon: "bolt" },
      { name: "Zen Master Focus", reward: "Unlocked Forest Theme Badge", icon: "military_tech" }
    ],
    resources: [
      { title: "Quantum_Wave_Notes.pdf", type: "pdf" }
    ]
  });
});

// POST /api/student/sessions/:sessionId/resources
app.post('/api/student/sessions/:sessionId/resources', (req: Request, res: Response) => {
  const { title, url, type } = req.body;
  res.status(201).json({ success: true, resource: { title, url, type } });
});

// POST /api/student/schedule
app.post('/api/student/schedule', (req: Request, res: Response) => {
  const { lessonId, scheduledTime } = req.body;
  res.json({ success: true, bookingId: "bk-" + Math.random().toString(36).substring(2, 9) });
});

// -------------------------------------------------------------
// [NEW STITCH] Student AI Resource Library API Endpoints
// -------------------------------------------------------------

// GET /api/student/library
app.get('/api/student/library', (req: Request, res: Response) => {
  const resources = readResourcesDb();
  const search = (req.query.search as string || '').toLowerCase().trim();
  const type = (req.query.type as string || '').toLowerCase().trim();

  let list = resources.filter(r => !r.archived);
  if (search) {
    list = list.filter(r => r.title.toLowerCase().includes(search) || r.suggestedTags.some(t => t.toLowerCase().includes(search)));
  }
  if (type && type !== 'all') {
    list = list.filter(r => r.fileType === type);
  }

  res.json(list);
});

// GET /api/student/library/ai-picks
app.get('/api/student/library/ai-picks', (req: Request, res: Response) => {
  const resources = readResourcesDb();
  // Picks matching score > 90%
  const picks = resources.filter(r => r.relevanceScore >= 90 && !r.archived);
  res.json(picks);
});

// POST /api/student/library/upload
app.post('/api/student/library/upload', (req: Request, res: Response) => {
  try {
    const { title, fileType } = req.body;
    if (!title) return res.status(400).json({ error: "Title is required" });

    const resources = readResourcesDb();
    
    let resourceUrl = '';
    if (fileType === 'video') {
      resourceUrl = "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4";
    } else if (fileType === 'link') {
      resourceUrl = (title && (title.startsWith('http://') || title.startsWith('https://'))) 
        ? title 
        : "https://en.wikipedia.org/wiki/Quantum_mechanics";
    } else {
      const cleanTitle = title.replace(/[^a-zA-Z0-9.\-_]/g, '_');
      const safeFilename = cleanTitle.toLowerCase().endsWith('.pdf') ? cleanTitle : `${cleanTitle}.pdf`;
      resourceUrl = `/uploads/${safeFilename}`;

      const uploadsDir = path.join(__dirname, '../uploads');
      if (!fs.existsSync(uploadsDir)) {
        fs.mkdirSync(uploadsDir, { recursive: true });
      }
      const templatePath = path.join(uploadsDir, 'QM_Lecture_Notes_W4.pdf');
      const targetPath = path.join(uploadsDir, safeFilename);
      if (fs.existsSync(templatePath) && !fs.existsSync(targetPath)) {
        fs.copyFileSync(templatePath, targetPath);
      }
    }

    const newResource: SharedResource = {
      id: 'res-' + Math.random().toString(36).substring(2, 9),
      title,
      fileType: fileType || 'pdf',
      url: resourceUrl,
      size: '2.1 MB',
      ownerId: 'u-student',
      relevanceScore: Math.floor(Math.random() * 20) + 80, // 80-99
      aiSummarySnippet: "AI-indexed research paper uploaded by student. Recommended for exam preparation.",
      suggestedTags: ["Student Upload", "Physics"],
      sharedWithGroups: [],
      stats: { views: 0, downloads: 0 },
      createdAt: new Date().toISOString(),
      starred: false,
      archived: false
    };

    resources.push(newResource);
    writeResourcesDb(resources);

    res.status(201).json(newResource);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/student/library/:resourceId/ai-summary
app.get('/api/student/library/:resourceId/ai-summary', (req: Request, res: Response) => {
  const { resourceId } = req.params;
  const resources = readResourcesDb();
  const item = resources.find(r => r.id === resourceId);
  
  if (!item) return res.status(404).json({ error: "Library asset not found" });

  res.json({
    summaryHtml: `<p>${item.aiSummarySnippet}</p><p>The document details the foundational experiments, mathematical representations, and common computational pitfalls. Recommend focused review of formulas.</p>`,
    keyTakeaways: [
      "Understand Schrödinger boundary thresholds.",
      "Wave packet dispersions scale inversely to particle mass metrics.",
      "Integrate vector matrices for multi-dimensional operations."
    ]
  });
});

// PATCH /api/student/library/:resourceId/status
app.patch('/api/student/library/:resourceId/status', (req: Request, res: Response) => {
  try {
    const { resourceId } = req.params;
    const { starred, archived } = req.body;
    
    const resources = readResourcesDb();
    const item = resources.find(r => r.id === resourceId);
    if (!item) return res.status(404).json({ error: "Library asset not found" });

    if (starred !== undefined) item.starred = starred;
    if (archived !== undefined) item.archived = archived;

    writeResourcesDb(resources);
    res.json(item);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// -------------------------------------------------------------
// [NEW STITCH] Teacher Material Sharing API Endpoints
// -------------------------------------------------------------

// POST /api/teacher/resources/upload
app.post('/api/teacher/resources/upload', (req: Request, res: Response) => {
  const { filename } = req.body;
  res.json({
    tempId: "tmp-" + Math.random().toString(36).substring(2, 9),
    suggestedTags: ["Quantum Mechanics", "Advanced Physics", "Particle Theory", filename?.split('.').pop() || "PDF"]
  });
});

// POST /api/teacher/resources/share
app.post('/api/teacher/resources/share', (req: Request, res: Response) => {
  try {
    const { tempId, title, fileType, tags, groupSettings } = req.body;
    const resources = readResourcesDb();
    
    const sharedWithGroups = groupSettings?.map((gs: any) => ({
      groupId: gs.groupId,
      permissions: {
        viewOnly: gs.permissions?.viewOnly ?? true,
        canDownload: gs.permissions?.canDownload ?? false,
        allowAiSummarization: gs.permissions?.allowAiSummarization ?? true
      }
    })) || [];

    let resourceUrl = `/uploads/faculty/${tempId}.pdf`;
    if (fileType === 'video') {
      resourceUrl = "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4";
    } else if (fileType === 'link') {
      resourceUrl = (title && (title.startsWith('http://') || title.startsWith('https://'))) 
        ? title 
        : "https://en.wikipedia.org/wiki/Quantum_mechanics";
    }

    const newResource: SharedResource = {
      id: 'doc-' + Math.random().toString(36).substring(2, 9),
      title: title || `Lecture_Doc_${tempId?.substring(4)}.pdf`,
      fileType: fileType || 'pdf',
      url: resourceUrl,
      size: "8.4 MB",
      ownerId: "t-aris-thorne",
      relevanceScore: 95,
      aiSummarySnippet: "Core lecture guidelines distributed by faculty. Required reading materials.",
      suggestedTags: tags || ["Physics"],
      sharedWithGroups,
      stats: { views: 0, downloads: 0 },
      createdAt: new Date().toISOString(),
      starred: false,
      archived: false
    };

    // Ensure the faculty directory exists and copy the mock PDF
    if (fileType !== 'video' && fileType !== 'link') {
      const uploadsDir = path.join(__dirname, '../uploads');
      const facultyDir = path.join(uploadsDir, 'faculty');
      if (!fs.existsSync(facultyDir)) {
        fs.mkdirSync(facultyDir, { recursive: true });
      }
      const templatePath = path.join(uploadsDir, 'QM_Lecture_Notes_W4.pdf');
      const targetPath = path.join(facultyDir, `${tempId}.pdf`);
      if (fs.existsSync(templatePath)) {
        fs.copyFileSync(templatePath, targetPath);
      }
    }

    resources.push(newResource);
    writeResourcesDb(resources);

    res.status(201).json({ success: true, materialId: newResource.id });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/teacher/resources/shared-history
app.get('/api/teacher/resources/shared-history', (req: Request, res: Response) => {
  const resources = readResourcesDb();
  const shared = resources.filter(r => r.ownerId === 't-aris-thorne');
  const db = readDb();
  res.json(shared.map(s => {
    const firstGroupId = s.sharedWithGroups[0]?.groupId;
    const room = db.rooms.find(r => r.id === firstGroupId);
    const targetName = room ? room.name : (firstGroupId === 'g-physics-s2' ? "Advanced Physics" : "STEM Group");
    return {
      id: s.id,
      name: s.title,
      format: s.fileType,
      targetGroup: targetName,
      sharedDate: new Date(s.createdAt).toLocaleDateString() + " • " + new Date(s.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      status: s.archived ? "Archived" : "Live",
      views: s.stats.views,
      downloads: s.stats.downloads
    };
  }));
});

// -------------------------------------------------------------
// Global Analytics Endpoint
// -------------------------------------------------------------

app.get('/api/analytics', (req: Request, res: Response) => {
  const db = readDb();
  const studentId = getStudentId(req);
  if (studentId) {
    res.json(db.analytics.filter(a => a.userId === studentId || !a.userId));
  } else {
    res.json([]);
  }
});

// -------------------------------------------------------------
// Database Backup & Import API Endpoints
// -------------------------------------------------------------

app.get('/api/data/manage', (req: Request, res: Response) => {
  try {
    const db = readDb();
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', 'attachment; filename="focusflow_db_backup.json"');
    res.status(200).send(JSON.stringify(db, null, 2));
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/data/manage', (req: Request, res: Response) => {
  try {
    const { action } = req.body;
    const DB_FILE = path.join(process.cwd(), 'data', 'db.json');

    if (action === 'reset') {
      if (fs.existsSync(DB_FILE)) {
        fs.unlinkSync(DB_FILE);
      }
      const defaultDb = readDb();
      return res.json({ success: true, message: 'Database reset to default values successfully', data: defaultDb });
    }

    if (action === 'import') {
      const { data } = req.body;
      if (!data || typeof data !== 'object') {
        return res.status(400).json({ error: 'Invalid payload structure' });
      }

      if (!data.tasks || !data.settings || !data.rooms) {
        return res.status(400).json({ error: 'Imported file is missing required FocusFlow schemas (tasks, settings, rooms)' });
      }

      writeDb(data);
      return res.json({ success: true, message: 'Database imported successfully', data });
    }

    if (action === 'clear_sessions') {
      const db = readDb();
      db.sessions = [];
      db.analytics = [];
      db.settings.focusCoins = 120;
      db.settings.currentStreak = 0;
      db.settings.focusScore = 100;
      writeDb(db);
      return res.json({ success: true, message: 'Session history and analytics wiped successfully', data: db });
    }

    return res.status(400).json({ error: 'Invalid action parameter' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// -------------------------------------------------------------
// Rewards Store API Endpoints
// -------------------------------------------------------------

app.get('/api/rewards', (req: Request, res: Response) => {
  const db = readDb();
  const studentId = getStudentId(req);
  let focusCoins = db.settings.focusCoins;
  let items = db.rewards;

  if (studentId) {
    const student = db.users.find(u => u.id === studentId);
    if (student) {
      focusCoins = student.focusCoins;
      const purchasedList = student.purchasedRewards || [];
      items = db.rewards.map(r => ({
        ...r,
        purchased: purchasedList.includes(r.id)
      }));
    }
  }
  res.json({
    items,
    focusCoins
  });
});

app.post('/api/rewards', (req: Request, res: Response) => {
  try {
    const body = req.body;
    const db = readDb();

    if (body.action === 'create') {
      const { title, description, cost, icon } = body;
      if (!title || cost === undefined) {
        return res.status(400).json({ error: 'Title and Cost are required' });
      }
      const newReward = {
        id: 'reward-' + Math.random().toString(36).substring(2, 9),
        title,
        description: description || '',
        cost: parseInt(cost) || 0,
        icon: icon || 'star',
        purchased: false
      };
      db.rewards.push(newReward);
      writeDb(db);
      return res.status(201).json(newReward);
    }

    if (!body.itemId) {
      return res.status(400).json({ error: 'Item ID is required' });
    }

    const item = db.rewards.find(r => r.id === body.itemId);

    if (!item) {
      return res.status(404).json({ error: 'Item not found' });
    }

    const studentId = getStudentId(req);
    if (!studentId) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    const student = db.users.find(u => u.id === studentId);
    if (!student) {
      return res.status(401).json({ error: 'Student not found' });
    }

    if (!student.purchasedRewards) {
      student.purchasedRewards = [];
    }

    if (student.purchasedRewards.includes(body.itemId)) {
      return res.status(400).json({ error: 'Item already purchased' });
    }

    if (student.focusCoins < item.cost) {
      return res.status(400).json({ error: 'Insufficient Focus Coins' });
    }

    student.focusCoins -= item.cost;
    if (student.settings) {
      student.settings.focusCoins = student.focusCoins;
    }
    student.purchasedRewards.push(body.itemId);

    writeDb(db);
    res.json({
      message: 'Purchase successful',
      item: { ...item, purchased: true },
      focusCoins: student.focusCoins
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.patch('/api/rewards', (req: Request, res: Response) => {
  try {
    const body = req.body;
    const db = readDb();
    const { action } = body;

    if (action === 'reset') {
      const studentId = getStudentId(req);
      if (studentId) {
        const student = db.users.find(u => u.id === studentId);
        if (student) {
          student.purchasedRewards = [];
          student.focusCoins = 120;
          if (student.settings) {
            student.settings.focusCoins = 120;
          }
          writeDb(db);
          return res.json({ success: true, message: 'All purchases reset successfully' });
        }
      }
      db.rewards.forEach(r => r.purchased = false);
      db.settings.focusCoins = 120;
      writeDb(db);
      return res.json({ success: true, message: 'All purchases reset successfully' });
    }

    if (action === 'update') {
      const { itemId, title, description, cost, icon } = body;
      const item = db.rewards.find(r => r.id === itemId);
      if (!item) return res.status(404).json({ error: 'Item not found' });
      if (title !== undefined) item.title = title;
      if (description !== undefined) item.description = description;
      if (cost !== undefined) item.cost = parseInt(cost) || 0;
      if (icon !== undefined) item.icon = icon;
      writeDb(db);
      return res.json(item);
    }

    return res.status(400).json({ error: 'Invalid action' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/rewards', (req: Request, res: Response) => {
  try {
    const itemId = req.query.itemId as string;
    if (!itemId) return res.status(400).json({ error: 'Item ID is required' });

    const db = readDb();
    const idx = db.rewards.findIndex(r => r.id === itemId);
    if (idx === -1) return res.status(404).json({ error: 'Item not found' });

    db.rewards.splice(idx, 1);
    writeDb(db);
    res.json({ success: true, message: 'Item deleted successfully' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// -------------------------------------------------------------
// Group Rooms API Endpoints
// -------------------------------------------------------------

app.get('/api/rooms', (req: Request, res: Response) => {
  const db = readDb();
  res.json(db.rooms);
});

app.post('/api/rooms', (req: Request, res: Response) => {
  try {
    const body = req.body;
    const db = readDb();

    if (body.action === 'join') {
      const room = db.rooms.find(r => r.id === body.roomId);
      if (!room) return res.status(404).json({ error: 'Room not found' });
      
      // Enforce coins entry limit
      if (room.coinsLimit !== undefined && room.coinsLimit > 0) {
        if (db.settings.focusCoins < room.coinsLimit) {
          return res.status(403).json({
            error: `Insufficient Focus Coins. You need at least ${room.coinsLimit} coins to enter this room. You currently have ${db.settings.focusCoins} coins.`
          });
        }
      }

      room.activeUsers += 1;
      if (room.bonusCoins !== undefined && room.bonusCoins > 0) {
        db.settings.focusCoins += room.bonusCoins;
      }
      writeDb(db);
      return res.json(room);
    }

    if (body.action === 'leave') {
      const room = db.rooms.find(r => r.id === body.roomId);
      if (!room) return res.status(404).json({ error: 'Room not found' });
      if (room.activeUsers > 0) room.activeUsers -= 1;
      writeDb(db);
      return res.json(room);
    }

    if (!body.name) {
      return res.status(400).json({ error: 'Room name is required' });
    }

    const newRoom: StudyRoom = {
      id: 'room-' + Math.random().toString(36).substring(2, 9),
      name: body.name,
      activeUsers: body.activeUsers !== undefined ? body.activeUsers : 0,
      tags: body.tags || ['Study'],
      ambientSound: body.ambientSound || 'Silence',
      messages: [],
      hostName: body.hostName || "Prof. Alex Rivera",
      isVerified: body.isVerified !== undefined ? body.isVerified : true,
      maxCapacity: body.maxCapacity !== undefined ? parseInt(body.maxCapacity) : 20,
      allowedApps: body.allowedApps || ["notion", "gdocs"],
      focusMode: body.focusMode || "Standard Lock",
      sessionDurationFormat: body.sessionDurationFormat || "90m Focus / 15m Insight Exchange",
      allowScreenShare: body.allowScreenShare !== undefined ? body.allowScreenShare : true,
      videoStreamRequired: body.videoStreamRequired !== undefined ? body.videoStreamRequired : false,
      chatModerationFilter: body.chatModerationFilter !== undefined ? body.chatModerationFilter : true,
      censorWords: body.censorWords || ['spam', 'cheat', 'abuse', 'slack', 'tiktok'],
      coinsLimit: body.coinsLimit !== undefined ? parseInt(body.coinsLimit) : 0,
      bonusCoins: body.bonusCoins !== undefined ? parseInt(body.bonusCoins) : 0
    };

    db.rooms.push(newRoom);
    writeDb(db);

    // Automatically create a corresponding classroom group
    const groups = readGroupsDb();
    groups.push({
      id: newRoom.id,
      name: newRoom.name,
      teacherId: 't-aris-thorne',
      room: newRoom.name,
      studentCount: 0,
      active: true,
      students: [],
      activeSessionId: null
    });
    writeGroupsDb(groups);

    res.status(201).json(newRoom);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/rooms', (req: Request, res: Response) => {
  try {
    const roomId = req.query.roomId as string;
    if (!roomId) {
      return res.status(400).json({ error: 'Room ID is required' });
    }

    const db = readDb();
    const index = db.rooms.findIndex(r => r.id === roomId);
    if (index === -1) {
      return res.status(404).json({ error: 'Room not found' });
    }

    db.rooms.splice(index, 1);
    writeDb(db);

    // Also delete corresponding classroom group
    const groups = readGroupsDb();
    const gIndex = groups.findIndex(g => g.id === roomId);
    if (gIndex !== -1) {
      groups.splice(gIndex, 1);
      writeGroupsDb(groups);
    }

    res.json({ success: true, message: 'Room deleted successfully' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/rooms/:id/chat', (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const body = req.body;
    if (!body.user || !body.text) {
      return res.status(400).json({ error: 'User and Text are required' });
    }

    const db = readDb();
    const room = db.rooms.find(r => r.id === id);

    if (!room) {
      return res.status(404).json({ error: 'Room not found' });
    }

    let text = body.text;
    const globalSettings = db.settings;
    const isModerationActive = room.chatModerationFilter !== undefined ? room.chatModerationFilter : globalSettings.groupConfig?.chatModerationFilter;
    const censorList = room.censorWords || globalSettings.groupConfig?.censorWords || [];
    
    if (isModerationActive && censorList.length > 0) {
      censorList.forEach((word: string) => {
        const regex = new RegExp(`\\b${word}\\b`, 'gi');
        text = text.replace(regex, '*'.repeat(word.length));
      });
    }

    const newMessage = {
      id: 'msg-' + Math.random().toString(36).substring(2, 9),
      user: body.user,
      text: text,
      timestamp: new Date().toISOString()
    };

    room.messages.push(newMessage);
    
    if (room.messages.length > 50) {
      room.messages.shift();
    }

    const prompt = text.trim();
    const lowerPrompt = prompt.toLowerCase();
    const isAIGuild = room.name.toLowerCase().includes('ai') || room.tags.some(t => t.toLowerCase().includes('ai'));
    const mentionsAI = lowerPrompt.startsWith('@ai');

    if ((mentionsAI || isAIGuild) && body.user !== 'AI Tutor') {
      const cleanQuery = mentionsAI ? prompt.slice(3).trim() : prompt;
      const aiResponseText = generateAiResponse(cleanQuery, db.settings.aiConfig);
      
      const aiMessage = {
        id: 'msg-' + Math.random().toString(36).substring(2, 9),
        user: 'AI Tutor',
        text: aiResponseText,
        timestamp: new Date().toISOString()
      };
      
      room.messages.push(aiMessage);
      
      if (room.messages.length > 50) {
        room.messages.shift();
      }
    }

    writeDb(db);
    res.status(201).json(newMessage);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// -------------------------------------------------------------
// Search API Endpoint
// -------------------------------------------------------------

app.get('/api/search', (req: Request, res: Response) => {
  try {
    const query = (req.query.q as string || '').trim().toLowerCase();
    const db = readDb();

    if (!query) {
      return res.json({
        tasks: db.tasks || [],
        rooms: db.rooms || [],
        sessions: db.sessions || [],
        tickets: db.tickets || []
      });
    }

    const filteredTasks = (db.tasks || []).filter(
      task =>
        task.title.toLowerCase().includes(query) ||
        task.subject.toLowerCase().includes(query)
    );

    const filteredRooms = (db.rooms || []).filter(
      room =>
        room.name.toLowerCase().includes(query) ||
        room.tags.some(tag => tag.toLowerCase().includes(query))
    );

    const filteredSessions = (db.sessions || []).filter(
      session =>
        session.taskTitle.toLowerCase().includes(query)
    );

    const filteredTickets = (db.tickets || []).filter(
      ticket =>
        ticket.subject.toLowerCase().includes(query) ||
        ticket.message.toLowerCase().includes(query)
    );

    res.json({
      tasks: filteredTasks,
      rooms: filteredRooms,
      sessions: filteredSessions,
      tickets: filteredTickets
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// -------------------------------------------------------------
// Sessions API Endpoints
// -------------------------------------------------------------

app.get('/api/sessions', (req: Request, res: Response) => {
  const db = readDb();
  const studentId = getStudentId(req);
  if (studentId) {
    res.json(db.sessions.filter(s => s.userId === studentId || !s.userId));
  } else {
    res.json([]);
  }
});

app.post('/api/sessions', (req: Request, res: Response) => {
  try {
    const body = req.body;
    const db = readDb();
    const studentId = getStudentId(req);

    if (!studentId) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    const student = db.users.find(u => u.id === studentId);
    if (!student) {
      return res.status(401).json({ error: 'Student not found' });
    }

    const newSession: StudySession = {
      id: 'session-' + Math.random().toString(36).substring(2, 9),
      userId: studentId,
      startTime: new Date().toISOString(),
      durationMinutes: body.durationMinutes || 25,
      taskTitle: body.taskTitle || 'General Focus Session',
      distractionsBlocked: body.distractionsBlocked || 0,
      focusScore: body.focusScore || 90,
      timeline: [
        { minute: 5, score: 75 },
        { minute: 10, score: 82 },
        { minute: 15, score: body.focusScore || 90 }
      ]
    };

    db.sessions.push(newSession);

    const coinReward = 10 + (body.distractionsBlocked || 0) * 2;
    student.focusCoins += coinReward;
    if (student.settings) {
      student.settings.focusCoins = student.focusCoins;
    }

    const todayStr = new Date().toISOString().split('T')[0];
    const hasTodayAnalytics = db.analytics.some(a => a.date === todayStr && a.userId === studentId);
    
    if (!hasTodayAnalytics) {
      student.currentStreak += 1;
      if (student.settings) {
        student.settings.currentStreak = student.currentStreak;
      }
    }

    // Update student focusScore moving average
    const studentSessions = db.sessions.filter(s => s.userId === studentId);
    const totalScore = studentSessions.reduce((sum, s) => sum + s.focusScore, 0);
    student.focusScore = studentSessions.length > 0 ? Math.round(totalScore / studentSessions.length) : newSession.focusScore;
    if (student.settings) {
      student.settings.focusScore = student.focusScore;
    }

    const dailyLog = db.analytics.find(a => a.date === todayStr && a.userId === studentId);
    if (dailyLog) {
      dailyLog.focusMinutes += newSession.durationMinutes;
      dailyLog.distractionsBlocked += newSession.distractionsBlocked;
      dailyLog.focusScore = Math.round((dailyLog.focusScore * 2 + newSession.focusScore) / 3);
    } else {
      const newDailyLog: AnalyticsSummary = {
        date: todayStr,
        userId: studentId,
        focusMinutes: newSession.durationMinutes,
        distractionsBlocked: newSession.distractionsBlocked,
        focusScore: newSession.focusScore
      };
      db.analytics.push(newDailyLog);
    }

    if (body.taskId) {
      const task = db.tasks.find(t => t.id === body.taskId && (t.userId === studentId || !t.userId));
      if (task) {
        task.actualPomodoros += 1;
      }
    }

    writeDb(db);
    res.status(201).json({ session: newSession, coinsEarned: coinReward, streak: student.currentStreak });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// -------------------------------------------------------------
// Settings API Endpoints
// -------------------------------------------------------------

app.get('/api/settings', (req: Request, res: Response) => {
  const db = readDb();
  const studentId = getStudentId(req);
  if (studentId) {
    const student = db.users.find(u => u.id === studentId);
    if (student && student.settings) {
      return res.json(student.settings);
    }
  }
  res.json(db.settings);
});

app.patch('/api/settings', (req: Request, res: Response) => {
  try {
    const body = req.body;
    const db = readDb();
    const studentId = getStudentId(req);

    let settingsTarget = db.settings;
    let student = null;

    if (studentId) {
      student = db.users.find(u => u.id === studentId);
      if (student) {
        if (!student.settings) {
          student.settings = { ...db.settings };
        }
        settingsTarget = student.settings;
      }
    }

    if (body.studyMode !== undefined) settingsTarget.studyMode = body.studyMode;
    if (body.distractionShield !== undefined) settingsTarget.distractionShield = body.distractionShield;
    if (body.blockedWebsites !== undefined) settingsTarget.blockedWebsites = body.blockedWebsites;
    if (body.focusScore !== undefined) settingsTarget.focusScore = body.focusScore;
    if (body.pomodoroWorkTime !== undefined) settingsTarget.pomodoroWorkTime = body.pomodoroWorkTime;
    if (body.pomodoroBreakTime !== undefined) settingsTarget.pomodoroBreakTime = body.pomodoroBreakTime;
    if (body.currentStreak !== undefined) settingsTarget.currentStreak = body.currentStreak;
    if (body.focusCoins !== undefined) settingsTarget.focusCoins = body.focusCoins;
    if (body.uiConfig !== undefined) settingsTarget.uiConfig = body.uiConfig;
    if (body.aiConfig !== undefined) settingsTarget.aiConfig = body.aiConfig;
    if (body.groupConfig !== undefined) settingsTarget.groupConfig = body.groupConfig;

    if (student) {
      if (body.focusScore !== undefined) student.focusScore = body.focusScore;
      if (body.focusCoins !== undefined) student.focusCoins = body.focusCoins;
      if (body.currentStreak !== undefined) student.currentStreak = body.currentStreak;
    }

    writeDb(db);
    res.json(settingsTarget);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// -------------------------------------------------------------
// Support Tickets API Endpoints
// -------------------------------------------------------------

app.get('/api/support', (req: Request, res: Response) => {
  const db = readDb();
  const studentId = getStudentId(req);
  if (studentId) {
    res.json((db.tickets || []).filter(t => t.userId === studentId || !t.userId));
  } else {
    res.json([]);
  }
});

app.post('/api/support', (req: Request, res: Response) => {
  try {
    const body = req.body;
    if (!body.subject || !body.message) {
      return res.status(400).json({ error: 'Subject and Message are required' });
    }

    const studentId = getStudentId(req);
    if (!studentId) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    const db = readDb();
    
    // Generate AI response to the student's ticket query
    const aiResponse = generateAiResponse(body.message);

    const newTicket: SupportTicket = {
      id: 'ticket-' + Math.random().toString(36).substring(2, 9),
      userId: studentId,
      subject: body.subject,
      message: body.message,
      status: 'Answered',
      timestamp: new Date().toISOString(),
      replies: [
        {
          user: 'Support Bot',
          text: aiResponse,
          timestamp: new Date().toISOString()
        }
      ]
    };

    db.tickets.push(newTicket);
    writeDb(db);
    res.status(201).json(newTicket);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/support/:id', (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const body = req.body;
    if (!body.user || !body.text) {
      return res.status(400).json({ error: 'User and Text are required' });
    }

    const studentId = getStudentId(req);
    const db = readDb();
    const ticket = db.tickets.find(t => t.id === id && (body.user === 'Support Agent' || t.userId === studentId || !t.userId));

    if (!ticket) {
      return res.status(404).json({ error: 'Ticket not found' });
    }

    const newReply = {
      user: body.user,
      text: body.text,
      timestamp: new Date().toISOString()
    };

    ticket.replies.push(newReply);
    
    if (body.user === 'Support Agent') {
      ticket.status = 'Answered';
    }

    // Automatically trigger AI Support Bot to answer the message
    if (body.user !== 'Support Bot' && body.user !== 'Support Agent') {
      const aiResponse = generateAiResponse(body.text);
      const aiReply = {
        user: 'Support Bot',
        text: aiResponse,
        timestamp: new Date().toISOString()
      };
      ticket.replies.push(aiReply);
      ticket.status = 'Answered';
    }

    writeDb(db);
    res.status(201).json(newReply);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// -------------------------------------------------------------
// Weekly Timetable API Endpoints
// -------------------------------------------------------------

app.get('/api/timetable', (req: Request, res: Response) => {
  try {
    const db = readDb();
    const studentId = getStudentId(req);
    if (studentId) {
      res.json((db.timetable || []).filter(e => e.userId === studentId || !e.userId));
    } else {
      res.json([]);
    }
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/timetable', (req: Request, res: Response) => {
  try {
    const { title, day, time, subject, pomodoros, isAiSuggested } = req.body;
    if (!title || !day || !time || !subject) {
      return res.status(400).json({ error: 'Title, day, time, and subject are required' });
    }
    const studentId = getStudentId(req);
    if (!studentId) {
      return res.status(401).json({ error: 'Not authenticated' });
    }
    const db = readDb();
    if (!db.timetable) db.timetable = [];

    const newEvent: TimetableEvent = {
      id: 'event-' + Math.random().toString(36).substring(2, 9),
      userId: studentId,
      title,
      day,
      time,
      subject,
      pomodoros: parseInt(pomodoros) || 1,
      isAiSuggested: !!isAiSuggested
    };

    db.timetable.push(newEvent);
    writeDb(db);
    res.status(201).json(newEvent);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/timetable/:id', (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { title, day, time, subject, pomodoros, isAiSuggested } = req.body;
    const studentId = getStudentId(req);
    if (!studentId) {
      return res.status(401).json({ error: 'Not authenticated' });
    }
    const db = readDb();
    if (!db.timetable) db.timetable = [];

    const event = db.timetable.find(e => e.id === id && (e.userId === studentId || !e.userId));
    if (!event) {
      return res.status(404).json({ error: 'Timetable event not found' });
    }

    if (title !== undefined) event.title = title;
    if (day !== undefined) event.day = day;
    if (time !== undefined) event.time = time;
    if (subject !== undefined) event.subject = subject;
    if (pomodoros !== undefined) event.pomodoros = parseInt(pomodoros) || 1;
    if (isAiSuggested !== undefined) event.isAiSuggested = !!isAiSuggested;

    writeDb(db);
    res.json(event);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/timetable/:id', (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const studentId = getStudentId(req);
    if (!studentId) {
      return res.status(401).json({ error: 'Not authenticated' });
    }
    const db = readDb();
    if (!db.timetable) db.timetable = [];

    const index = db.timetable.findIndex(e => e.id === id && (e.userId === studentId || !e.userId));
    if (index === -1) {
      return res.status(404).json({ error: 'Timetable event not found' });
    }

    db.timetable.splice(index, 1);
    writeDb(db);
    res.json({ success: true, message: 'Timetable event deleted successfully' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// -------------------------------------------------------------
// Tasks API Endpoints
// -------------------------------------------------------------

app.get('/api/tasks', (req: Request, res: Response) => {
  const db = readDb();
  const studentId = getStudentId(req);
  if (studentId) {
    res.json(db.tasks.filter(t => t.userId === studentId || !t.userId));
  } else {
    res.json([]);
  }
});

app.post('/api/tasks', (req: Request, res: Response) => {
  try {
    const body = req.body;
    if (!body.title || !body.subject) {
      return res.status(400).json({ error: 'Title and Subject are required' });
    }

    const studentId = getStudentId(req);
    if (!studentId) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    const db = readDb();
    const newTask: Task = {
      id: Math.random().toString(36).substring(2, 9),
      userId: studentId,
      title: body.title,
      completed: false,
      subject: body.subject,
      estimatedPomodoros: body.estimatedPomodoros || 1,
      actualPomodoros: 0
    };

    db.tasks.push(newTask);
    writeDb(db);

    res.status(201).json(newTask);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.patch('/api/tasks/:id', (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const body = req.body;
    const studentId = getStudentId(req);
    if (!studentId) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    const db = readDb();
    const taskIndex = db.tasks.findIndex(t => t.id === id && (t.userId === studentId || !t.userId));
    if (taskIndex === -1) {
      return res.status(404).json({ error: 'Task not found' });
    }

    const task = db.tasks[taskIndex];
    if (body.title !== undefined) task.title = body.title;
    if (body.subject !== undefined) task.subject = body.subject;
    if (body.completed !== undefined) task.completed = body.completed;
    if (body.estimatedPomodoros !== undefined) task.estimatedPomodoros = body.estimatedPomodoros;
    if (body.actualPomodoros !== undefined) task.actualPomodoros = body.actualPomodoros;

    writeDb(db);
    res.json(task);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/tasks/:id', (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const studentId = getStudentId(req);
    if (!studentId) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    const db = readDb();
    const taskIndex = db.tasks.findIndex(t => t.id === id && (t.userId === studentId || !t.userId));
    if (taskIndex === -1) {
      return res.status(404).json({ error: 'Task not found' });
    }

    db.tasks.splice(taskIndex, 1);
    writeDb(db);
    res.json({ message: 'Task deleted successfully' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Serve frontend static files
const frontendOutPath = path.join(__dirname, '../../frontend/out');
if (fs.existsSync(frontendOutPath)) {
  app.use(express.static(frontendOutPath));
  
  // Clean URLs routing fallback for static export:
  // If req.path is a page route without a dot (no extension like .js/.css), check if we have route.html or route/index.html
  app.get('*', (req, res, nextFn) => {
    if (!req.path.includes('.')) {
      const normalizedPath = req.path.endsWith('/') ? req.path.slice(0, -1) : req.path;
      
      const file = path.join(frontendOutPath, `${normalizedPath}.html`);
      if (fs.existsSync(file)) {
        return res.sendFile(file);
      }
      
      const indexFile = path.join(frontendOutPath, normalizedPath, 'index.html');
      if (fs.existsSync(indexFile)) {
        return res.sendFile(indexFile);
      }
      
      // Default fallback to index.html at root (allows client-side routing)
      const rootIndex = path.join(frontendOutPath, 'index.html');
      if (fs.existsSync(rootIndex)) {
        return res.sendFile(rootIndex);
      }
    }
    nextFn();
  });
} else {
  console.warn(`[Static Serve] Frontend out directory not found at: ${frontendOutPath}. Make sure to build frontend first.`);
}

// Start the Express server after initializing database sync from Firestore
import { syncFromFirestore } from './db';

syncFromFirestore().then(() => {
  app.listen(PORT, () => {
    console.log(`FocusFlow Express Backend Server running on http://localhost:${PORT}`);
  });
}).catch(err => {
  console.error("Critical: Failed to sync database from Firestore. Starting server anyway...", err);
  app.listen(PORT, () => {
    console.log(`FocusFlow Express Backend Server running on http://localhost:${PORT}`);
  });
});
