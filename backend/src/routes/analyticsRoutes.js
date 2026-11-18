import express from 'express';
import { db } from '../db.js';
import { authenticate } from '../middleware/auth.js';

const router = express.Router();

// Real-time workload & project analytics (R8, R10.1, R10.2)
router.get('/workload/:projectId', authenticate, (req, res) => {
  try {
    const { projectId } = req.params;
    const project = db.findById('projects', projectId);
    if (!project) return res.status(404).json({ error: 'Project not found.' });

    const tasks = db.filter('tasks', t => t.projectId === projectId);
    const memberIds = project.memberIds || [];
    const members = db.filter('users', u => memberIds.includes(u.id));

    // Distribution by member
    const memberDistribution = members.map(m => {
      const activeTasks = tasks.filter(t => t.assigneeId === m.id && t.status !== 'COMPLETED');
      const completedTasks = tasks.filter(t => t.assigneeId === m.id && t.status === 'COMPLETED');
      const effortPoints = activeTasks.reduce((sum, t) => sum + (t.effortPoints || 1), 0);

      // Status breakdown
      const byStatus = {
        TODO: activeTasks.filter(t => t.status === 'TODO').length,
        IN_PROGRESS: activeTasks.filter(t => t.status === 'IN_PROGRESS').length,
        IN_REVIEW: activeTasks.filter(t => t.status === 'IN_REVIEW').length,
        COMPLETED: completedTasks.length
      };

      return {
        userId: m.id,
        name: m.name,
        email: m.email,
        effortPoints,
        activeTasksCount: activeTasks.length,
        completedTasksCount: completedTasks.length,
        statusBreakdown: byStatus,
        isOverloaded: effortPoints > 8
      };
    });

    // Project-wide status breakdown
    const projectStats = {
      totalTasks: tasks.length,
      unassignedTasks: tasks.filter(t => !t.assigneeId).length,
      todo: tasks.filter(t => t.status === 'TODO').length,
      inProgress: tasks.filter(t => t.status === 'IN_PROGRESS').length,
      inReview: tasks.filter(t => t.status === 'IN_REVIEW').length,
      completed: tasks.filter(t => t.status === 'COMPLETED').length,
      totalEffortPoints: tasks.reduce((sum, t) => sum + (t.effortPoints || 1), 0),
      activeEffortPoints: tasks.filter(t => t.status !== 'COMPLETED').reduce((sum, t) => sum + (t.effortPoints || 1), 0)
    };

    // Deadline urgency check
    const now = new Date();
    const urgentTasks = tasks
      .filter(t => t.status !== 'COMPLETED' && t.deadline)
      .map(t => {
        const dueDate = new Date(t.deadline);
        const diffHours = (dueDate.getTime() - now.getTime()) / (1000 * 60 * 60);
        return {
          id: t.id,
          title: t.title,
          deadline: t.deadline,
          hoursRemaining: Math.round(diffHours),
          isOverdue: diffHours < 0,
          isUrgent: diffHours >= 0 && diffHours <= 48
        };
      })
      .filter(t => t.isOverdue || t.isUrgent);

    res.json({
      projectId,
      projectName: project.name,
      projectStats,
      memberDistribution,
      urgentTasks
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to compute project workload analytics.' });
  }
});

export default router;

