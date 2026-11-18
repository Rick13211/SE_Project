import express from 'express';
import { v4 as uuidv4 } from 'uuid';
import { db } from '../db.js';
import { authenticate, requireRole } from '../middleware/auth.js';

const router = express.Router();

// Get projects (Team members see their projects, Leads & Admins see all or created)
router.get('/', authenticate, (req, res) => {
  try {
    let projects = [];
    if (req.user.role === 'ADMIN' || req.user.role === 'TEAM_LEAD') {
      projects = db.get('projects');
    } else {
      // Team members see projects they are assigned to
      projects = db.filter('projects', p => (p.memberIds || []).includes(req.user.id));
    }

    // Attach enriched metrics: members info and task counts
    const enriched = projects.map(p => {
      const pTasks = db.filter('tasks', t => t.projectId === p.id);
      const members = db.filter('users', u => (p.memberIds || []).includes(u.id)).map(u => ({
        id: u.id,
        name: u.name,
        email: u.email,
        role: u.role
      }));

      const totalTasks = pTasks.length;
      const completedTasks = pTasks.filter(t => t.status === 'COMPLETED').length;
      const unassignedTasks = pTasks.filter(t => !t.assigneeId).length;
      const totalEffortPoints = pTasks.reduce((sum, t) => sum + (t.effortPoints || 1), 0);

      return {
        ...p,
        members,
        stats: {
          totalTasks,
          completedTasks,
          unassignedTasks,
          totalEffortPoints
        }
      };
    });

    res.json(enriched);
  } catch (err) {
    res.status(500).json({ error: 'Failed to retrieve projects.' });
  }
});

// Create project (R2.1)
router.post('/', authenticate, requireRole(['ADMIN', 'TEAM_LEAD']), (req, res) => {
  try {
    const { name, description = '', memberIds = [], deadline = null } = req.body;

    if (!name || name.trim().length === 0) {
      return res.status(400).json({ error: 'Project name is required.' });
    }

    const newProject = {
      id: `proj_${uuidv4()}`,
      name: name.trim(),
      description: description.trim(),
      createdById: req.user.id,
      memberIds: Array.from(new Set(memberIds)),
      deadline: deadline || null,
      createdAt: new Date().toISOString()
    };

    db.insert('projects', newProject);
    db.logActivity(req.user.id, 'PROJECT_CREATED', { projectId: newProject.id, name: newProject.name });

    res.status(201).json({
      message: 'Project created successfully.',
      project: newProject
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to create project.' });
  }
});

// Update project members (R2.2)
router.put('/:id/members', authenticate, requireRole(['ADMIN', 'TEAM_LEAD']), (req, res) => {
  try {
    const { memberIds } = req.body;
    if (!Array.isArray(memberIds)) {
      return res.status(400).json({ error: 'memberIds must be an array.' });
    }

    const project = db.findById('projects', req.params.id);
    if (!project) {
      return res.status(404).json({ error: 'Project not found.' });
    }

    const updated = db.update('projects', req.params.id, {
      memberIds: Array.from(new Set(memberIds))
    });

    db.logActivity(req.user.id, 'PROJECT_MEMBERS_UPDATED', {
      projectId: project.id,
      memberCount: memberIds.length
    });

    res.json({
      message: 'Project members updated.',
      project: updated
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update members.' });
  }
});

export default router;

