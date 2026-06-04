import cookieParser from 'cookie-parser';
import cors from 'cors';
import express, { Request, Response } from 'express';
import fs from 'fs';
import path from 'path';
import {
  readDb,
  writeDb,
  Task,
  StudySession,
  AnalyticsSummary,
  RewardItem,
  StudyRoom,
  SupportTicket,
  AdminAlert,
  StudentUser
} from './db';
import { generateAiResponse } from './educationalAi';

const app = express();
const PORT = process.env.PORT || 5000;

// Enable CORS for client requests (though rewrites proxy will bypass standard CORS limitations)
app.use(cors({
  origin: 'http://localhost:3000',
  credentials: true
}));

app.use(express.json());
app.use(cookieParser());

// Helper for admin authorization
function isAuthenticated(req: Request): boolean {
  const token = req.cookies?.focusflow_admin_auth;
  return token === 'authenticated';
}

// -------------------------------------------------------------
// Admin Auth API Endpoints
// -------------------------------------------------------------

// GET /api/admin/check-auth
app.get('/api/admin/check-auth', (req: Request, res: Response) => {
  const token = req.cookies?.focusflow_admin_auth;
  const authenticated = token === 'authenticated';
  res.json({ authenticated });
});

// POST /api/admin/login
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

// POST /api/admin/logout
app.post('/api/admin/logout', (req: Request, res: Response) => {
  res.cookie('focusflow_admin_auth', '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    path: '/',
    maxAge: 0 // Expire immediately
  });
  res.json({ success: true, message: 'Logged out successfully' });
});

// -------------------------------------------------------------
// Admin Alerts API Endpoints
// -------------------------------------------------------------

// GET /api/admin/alerts
app.get('/api/admin/alerts', (req: Request, res: Response) => {
  if (!isAuthenticated(req)) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  const db = readDb();
  res.json(db.alerts || []);
});

// POST /api/admin/alerts
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

// GET /api/admin/users
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

// PATCH /api/admin/users
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

// DELETE /api/admin/users
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
// Analytics API Endpoint
// -------------------------------------------------------------

// GET /api/analytics
app.get('/api/analytics', (req: Request, res: Response) => {
  const db = readDb();
  res.json(db.analytics);
});

// -------------------------------------------------------------
// Database Backup & Import API Endpoints
// -------------------------------------------------------------

// GET /api/data/manage (backup download)
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

// POST /api/data/manage
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

// GET /api/rewards
app.get('/api/rewards', (req: Request, res: Response) => {
  const db = readDb();
  res.json({
    items: db.rewards,
    focusCoins: db.settings.focusCoins
  });
});

// POST /api/rewards
app.post('/api/rewards', (req: Request, res: Response) => {
  try {
    const body = req.body;
    const db = readDb();

    // Admin action: Create reward shop item
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

    // Standard client action: Purchase reward
    if (!body.itemId) {
      return res.status(400).json({ error: 'Item ID is required' });
    }

    const item = db.rewards.find(r => r.id === body.itemId);

    if (!item) {
      return res.status(404).json({ error: 'Item not found' });
    }

    if (item.purchased) {
      return res.status(400).json({ error: 'Item already purchased' });
    }

    if (db.settings.focusCoins < item.cost) {
      return res.status(400).json({ error: 'Insufficient Focus Coins' });
    }

    db.settings.focusCoins -= item.cost;
    item.purchased = true;

    writeDb(db);
    res.json({ message: 'Purchase successful', item, focusCoins: db.settings.focusCoins });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// PATCH /api/rewards
app.patch('/api/rewards', (req: Request, res: Response) => {
  try {
    const body = req.body;
    const db = readDb();
    const { action } = body;

    if (action === 'reset') {
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

// DELETE /api/rewards
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

// GET /api/rooms
app.get('/api/rooms', (req: Request, res: Response) => {
  const db = readDb();
  res.json(db.rooms);
});

// POST /api/rooms
app.post('/api/rooms', (req: Request, res: Response) => {
  try {
    const body = req.body;
    const db = readDb();

    if (body.action === 'join') {
      const room = db.rooms.find(r => r.id === body.roomId);
      if (!room) return res.status(404).json({ error: 'Room not found' });
      room.activeUsers += 1;
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
      messages: []
    };

    db.rooms.push(newRoom);
    writeDb(db);
    res.status(201).json(newRoom);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/rooms
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
    res.json({ success: true, message: 'Room deleted successfully' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/rooms/:id/chat
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

    const newMessage = {
      id: 'msg-' + Math.random().toString(36).substring(2, 9),
      user: body.user,
      text: body.text,
      timestamp: new Date().toISOString()
    };

    room.messages.push(newMessage);
    
    if (room.messages.length > 50) {
      room.messages.shift();
    }

    // AI study chatbot trigger
    const prompt = body.text.trim();
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

// GET /api/search
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

// GET /api/sessions
app.get('/api/sessions', (req: Request, res: Response) => {
  const db = readDb();
  res.json(db.sessions);
});

// POST /api/sessions
app.post('/api/sessions', (req: Request, res: Response) => {
  try {
    const body = req.body;
    const db = readDb();

    const newSession: StudySession = {
      id: 'session-' + Math.random().toString(36).substring(2, 9),
      startTime: new Date().toISOString(),
      durationMinutes: body.durationMinutes || 25,
      taskTitle: body.taskTitle || 'General Focus Session',
      distractionsBlocked: body.distractionsBlocked || 0,
      focusScore: body.focusScore || 90
    };

    db.sessions.push(newSession);

    const coinReward = 10 + (body.distractionsBlocked || 0) * 2;
    db.settings.focusCoins += coinReward;

    const todayStr = new Date().toISOString().split('T')[0];
    const hasTodayAnalytics = db.analytics.some(a => a.date === todayStr);
    
    if (!hasTodayAnalytics) {
      db.settings.currentStreak += 1;
    }

    const dailyLog = db.analytics.find(a => a.date === todayStr);
    if (dailyLog) {
      dailyLog.focusMinutes += newSession.durationMinutes;
      dailyLog.distractionsBlocked += newSession.distractionsBlocked;
      dailyLog.focusScore = Math.round((dailyLog.focusScore * 2 + newSession.focusScore) / 3);
    } else {
      const newDailyLog: AnalyticsSummary = {
        date: todayStr,
        focusMinutes: newSession.durationMinutes,
        distractionsBlocked: newSession.distractionsBlocked,
        focusScore: newSession.focusScore
      };
      db.analytics.push(newDailyLog);
    }

    if (body.taskId) {
      const task = db.tasks.find(t => t.id === body.taskId);
      if (task) {
        task.actualPomodoros += 1;
      }
    }

    writeDb(db);
    res.status(201).json({ session: newSession, coinsEarned: coinReward, streak: db.settings.currentStreak });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// -------------------------------------------------------------
// Settings API Endpoints
// -------------------------------------------------------------

// GET /api/settings
app.get('/api/settings', (req: Request, res: Response) => {
  const db = readDb();
  res.json(db.settings);
});

// PATCH /api/settings
app.patch('/api/settings', (req: Request, res: Response) => {
  try {
    const body = req.body;
    const db = readDb();

    if (body.studyMode !== undefined) db.settings.studyMode = body.studyMode;
    if (body.distractionShield !== undefined) db.settings.distractionShield = body.distractionShield;
    if (body.blockedWebsites !== undefined) db.settings.blockedWebsites = body.blockedWebsites;
    if (body.focusScore !== undefined) db.settings.focusScore = body.focusScore;
    if (body.pomodoroWorkTime !== undefined) db.settings.pomodoroWorkTime = body.pomodoroWorkTime;
    if (body.pomodoroBreakTime !== undefined) db.settings.pomodoroBreakTime = body.pomodoroBreakTime;
    if (body.currentStreak !== undefined) db.settings.currentStreak = body.currentStreak;
    if (body.focusCoins !== undefined) db.settings.focusCoins = body.focusCoins;
    if (body.uiConfig !== undefined) db.settings.uiConfig = body.uiConfig;
    if (body.aiConfig !== undefined) db.settings.aiConfig = body.aiConfig;
    if (body.groupConfig !== undefined) db.settings.groupConfig = body.groupConfig;

    writeDb(db);
    res.json(db.settings);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// -------------------------------------------------------------
// Support Tickets API Endpoints
// -------------------------------------------------------------

// GET /api/support
app.get('/api/support', (req: Request, res: Response) => {
  const db = readDb();
  res.json(db.tickets);
});

// POST /api/support
app.post('/api/support', (req: Request, res: Response) => {
  try {
    const body = req.body;
    if (!body.subject || !body.message) {
      return res.status(400).json({ error: 'Subject and Message are required' });
    }

    const db = readDb();
    
    const newTicket: SupportTicket = {
      id: 'ticket-' + Math.random().toString(36).substring(2, 9),
      subject: body.subject,
      message: body.message,
      status: 'Open',
      timestamp: new Date().toISOString(),
      replies: [
        {
          user: 'Support Bot',
          text: `Thank you for your report. Our AI agent is analyzing the issue: "${body.subject}". We will get back to you shortly.`,
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

// POST /api/support/:id (add reply)
app.post('/api/support/:id', (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const body = req.body;
    if (!body.user || !body.text) {
      return res.status(400).json({ error: 'User and Text are required' });
    }

    const db = readDb();
    const ticket = db.tickets.find(t => t.id === id);

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

    writeDb(db);
    res.status(201).json(newReply);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// -------------------------------------------------------------
// Tasks API Endpoints
// -------------------------------------------------------------

// GET /api/tasks
app.get('/api/tasks', (req: Request, res: Response) => {
  const db = readDb();
  res.json(db.tasks);
});

// POST /api/tasks
app.post('/api/tasks', (req: Request, res: Response) => {
  try {
    const body = req.body;
    if (!body.title || !body.subject) {
      return res.status(400).json({ error: 'Title and Subject are required' });
    }

    const db = readDb();
    const newTask: Task = {
      id: Math.random().toString(36).substring(2, 9),
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

// PATCH /api/tasks/:id
app.patch('/api/tasks/:id', (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const body = req.body;
    const db = readDb();
    
    const taskIndex = db.tasks.findIndex(t => t.id === id);
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

// DELETE /api/tasks/:id
app.delete('/api/tasks/:id', (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const db = readDb();
    
    const taskIndex = db.tasks.findIndex(t => t.id === id);
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

// Start the Express server
app.listen(PORT, () => {
  console.log(`FocusFlow Express Backend Server running on http://localhost:${PORT}`);
});
