import express from 'express';
import { db } from '../db.js';
import { authenticate, requireRole } from '../middleware/auth.js';

const router = express.Router();

// Get all users for admin management
router.get('/users', authenticate, requireRole('ADMIN'), (req, res) => {
  try {
    const users = db.get('users').map(({ password, ...u }) => {
      const activeTasks = db.filter('tasks', t => t.assigneeId === u.id && t.status !== 'COMPLETED');
      const load = activeTasks.reduce((sum, t) => sum + (t.effortPoints || 1), 0);
      return {
        ...u,
        currentWorkloadPoints: load
      };
    });
    res.json(users);
  } catch (err) {
    res.status(500).json({ error: 'Failed to retrieve users.' });
  }
});

// Update user role or status (Active/Inactive)
router.put('/users/:id', authenticate, requireRole('ADMIN'), (req, res) => {
  try {
    const { role, isActive } = req.body;
    const user = db.findById('users', req.params.id);
    if (!user) return res.status(404).json({ error: 'User not found.' });

    const updates = {};
    if (role && ['ADMIN', 'TEAM_LEAD', 'MEMBER'].includes(role.toUpperCase())) {
      updates.role = role.toUpperCase();
    }
    if (typeof isActive === 'boolean') {
      updates.isActive = isActive;
    }

    const updated = db.update('users', user.id, updates);
    const { password: _, ...safeUser } = updated;

    db.logActivity(req.user.id, 'ADMIN_USER_UPDATED', { targetUserId: user.id, updates });

    res.json({ message: 'User updated successfully.', user: safeUser });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update user.' });
  }
});

// System Activity Logs
router.get('/logs', authenticate, requireRole('ADMIN'), (req, res) => {
  try {
    const logs = db.get('system_logs');
    logs.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    res.json(logs.slice(0, 100)); // Return recent 100 logs
  } catch (err) {
    res.status(500).json({ error: 'Failed to retrieve logs.' });
  }
});

// System Overview Statistics
router.get('/stats', authenticate, requireRole('ADMIN'), (req, res) => {
  try {
    const users = db.get('users');
    const projects = db.get('projects');
    const tasks = db.get('tasks');
    const ratings = db.get('performance_ratings');
    const reassignments = db.get('reassignment_requests');

    res.json({
      totalUsers: users.length,
      activeUsers: users.filter(u => u.isActive !== false).length,
      roleCounts: {
        ADMIN: users.filter(u => u.role === 'ADMIN').length,
        TEAM_LEAD: users.filter(u => u.role === 'TEAM_LEAD').length,
        MEMBER: users.filter(u => u.role === 'MEMBER').length
      },
      totalProjects: projects.length,
      totalTasks: tasks.length,
      taskStatusCounts: {
        TODO: tasks.filter(t => t.status === 'TODO').length,
        IN_PROGRESS: tasks.filter(t => t.status === 'IN_PROGRESS').length,
        IN_REVIEW: tasks.filter(t => t.status === 'IN_REVIEW').length,
        COMPLETED: tasks.filter(t => t.status === 'COMPLETED').length,
        UNASSIGNED: tasks.filter(t => !t.assigneeId).length
      },
      totalRatings: ratings.length,
      pendingReassignments: reassignments.filter(r => r.status === 'PENDING').length
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to compute system stats.' });
  }
});

// Export full project & assignment report
router.get('/export-report', authenticate, requireRole('ADMIN'), (req, res) => {
  try {
    const report = {
      generatedAt: new Date().toISOString(),
      generatedBy: req.user.email,
      projects: db.get('projects'),
      tasks: db.get('tasks'),
      assignmentHistory: db.get('assignment_history'),
      performanceRatings: db.get('performance_ratings')
    };

    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', 'attachment; filename="spmp_system_report.json"');
    res.send(JSON.stringify(report, null, 2));
  } catch (err) {
    res.status(500).json({ error: 'Failed to export report.' });
  }
});

export default router;

