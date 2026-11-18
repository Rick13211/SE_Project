import express from 'express';
import { v4 as uuidv4 } from 'uuid';
import { db } from '../db.js';
import { authenticate, requireRole } from '../middleware/auth.js';
import { nlpClient } from '../services/nlpClient.js';

const router = express.Router();

const EFFORT_POINTS_MAP = {
  LOW: 1,
  MEDIUM: 3,
  HIGH: 5
};

// Get tasks with optional filters
router.get('/', authenticate, (req, res) => {
  try {
    const { projectId, assigneeId, status } = req.query;
    let tasks = db.get('tasks');

    if (projectId) {
      tasks = tasks.filter(t => t.projectId === projectId);
    }

    if (assigneeId) {
      tasks = tasks.filter(t => t.assigneeId === assigneeId);
    } else if (req.user.role === 'MEMBER' && !projectId) {
      // If member views root task list without filter, default to their tasks
      tasks = tasks.filter(t => t.assigneeId === req.user.id);
    }

    if (status) {
      tasks = tasks.filter(t => t.status === status);
    }

    // Attach enriched assignee and project names
    const enriched = tasks.map(t => {
      const assignee = t.assigneeId ? db.findById('users', t.assigneeId) : null;
      const project = db.findById('projects', t.projectId);
      return {
        ...t,
        assigneeName: assignee ? assignee.name : 'Unassigned',
        projectName: project ? project.name : 'Unknown Project'
      };
    });

    res.json(enriched);
  } catch (err) {
    res.status(500).json({ error: 'Failed to retrieve tasks.' });
  }
});

// Create task (R3.1 - R3.4)
router.post('/', authenticate, requireRole(['ADMIN', 'TEAM_LEAD']), async (req, res) => {
  try {
    const {
      title,
      description = '',
      projectId,
      requiredSkill = '',
      effortLevel = 'MEDIUM',
      priority = 'MEDIUM',
      deadline = null
    } = req.body;

    if (!title || !projectId) {
      return res.status(400).json({ error: 'Task title and projectId are required.' });
    }

    const project = db.findById('projects', projectId);
    if (!project) {
      return res.status(404).json({ error: 'Project not found.' });
    }

    const normalizedEffort = effortLevel.toUpperCase();
    const effortPoints = EFFORT_POINTS_MAP[normalizedEffort] || 3;

    // Optional: If no requiredSkill provided, attempt NLP extraction from description
    let skill = requiredSkill.trim();
    if (!skill && description) {
      const nlp = await nlpClient.extractSkills(description);
      if (nlp.extracted_skills && nlp.extracted_skills.length > 0) {
        skill = nlp.extracted_skills[0];
      }
    }

    const newTask = {
      id: `task_${uuidv4()}`,
      title: title.trim(),
      description: description.trim(),
      projectId,
      requiredSkill: skill || 'General Software Engineering',
      effortLevel: normalizedEffort,
      effortPoints,
      priority: priority.toUpperCase(),
      status: 'TODO',
      assigneeId: null,
      allocationType: null,
      deadline: deadline || null,
      createdById: req.user.id,
      createdAt: new Date().toISOString()
    };

    db.insert('tasks', newTask);
    db.logActivity(req.user.id, 'TASK_CREATED', {
      taskId: newTask.id,
      title: newTask.title,
      effortPoints
    });

    res.status(201).json({
      message: 'Task created successfully.',
      task: newTask
    });
  } catch (err) {
    console.error('Task creation error:', err);
    res.status(500).json({ error: 'Failed to create task.' });
  }
});

// Update task details (R3.5)
router.put('/:id', authenticate, requireRole(['ADMIN', 'TEAM_LEAD']), (req, res) => {
  try {
    const task = db.findById('tasks', req.params.id);
    if (!task) return res.status(404).json({ error: 'Task not found.' });

    const updates = { ...req.body };
    if (updates.effortLevel) {
      updates.effortLevel = updates.effortLevel.toUpperCase();
      updates.effortPoints = EFFORT_POINTS_MAP[updates.effortLevel] || task.effortPoints;
    }

    const updated = db.update('tasks', task.id, updates);
    db.logActivity(req.user.id, 'TASK_UPDATED', { taskId: task.id, updates });

    res.json({ message: 'Task updated.', task: updated });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update task.' });
  }
});

// Update task status (R3.6 - accessible by Assignee, Lead, or Admin)
router.put('/:id/status', authenticate, (req, res) => {
  try {
    const { status } = req.body;
    const validStatuses = ['TODO', 'IN_PROGRESS', 'IN_REVIEW', 'COMPLETED'];

    if (!validStatuses.includes(status)) {
      return res.status(400).json({ error: `Invalid status. Must be one of: ${validStatuses.join(', ')}` });
    }

    const task = db.findById('tasks', req.params.id);
    if (!task) return res.status(404).json({ error: 'Task not found.' });

    // Authorization: Member must be the assignee, or user must be TEAM_LEAD / ADMIN
    if (req.user.role === 'MEMBER' && task.assigneeId !== req.user.id) {
      return res.status(403).json({ error: 'You can only update status for tasks assigned to you.' });
    }

    const updates = { status };
    if (status === 'COMPLETED' && task.status !== 'COMPLETED') {
      updates.completedAt = new Date().toISOString();
    }

    const updated = db.update('tasks', task.id, updates);
    db.logActivity(req.user.id, 'TASK_STATUS_CHANGED', {
      taskId: task.id,
      from: task.status,
      to: status
    });

    res.json({ message: 'Task status updated.', task: updated });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update task status.' });
  }
});

// Delete task (R3.5)
router.delete('/:id', authenticate, requireRole(['ADMIN', 'TEAM_LEAD']), (req, res) => {
  try {
    const task = db.findById('tasks', req.params.id);
    if (!task) return res.status(404).json({ error: 'Task not found.' });

    db.delete('tasks', task.id);
    db.logActivity(req.user.id, 'TASK_DELETED', { taskId: task.id, title: task.title });

    res.json({ message: 'Task deleted successfully.' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete task.' });
  }
});

export default router;

