import { db } from '../db.js';
import { v4 as uuidv4 } from 'uuid';

/**
 * Baseline Task Allocation Engine (Requirement R4)
 * 
 * Objective: Distribute unassigned tasks across team members such that total effort points
 * are balanced as equally as possible, while assigning tasks randomly without regard to skills.
 * This establishes an unbiased, neutral benchmark for subsequent performance comparison.
 */
export const runBaselineAllocation = async (projectId) => {
  const project = db.findById('projects', projectId);
  if (!project) throw new Error('Project not found');

  const members = db.filter('users', u => (project.memberIds || []).includes(u.id));
  if (members.length === 0) {
    throw new Error('Project has no team members assigned.');
  }

  // Retrieve unassigned tasks for this project
  const unassignedTasks = db.filter('tasks', t => t.projectId === projectId && !t.assigneeId);
  if (unassignedTasks.length === 0) {
    return {
      message: 'No unassigned tasks found for this project.',
      assignedCount: 0,
      distribution: {}
    };
  }

  // Compute total effort and existing workload per member
  const memberLoads = {};
  members.forEach(m => {
    // Current active workload (effort points from tasks NOT completed)
    const activeTasks = db.filter('tasks', t => t.assigneeId === m.id && t.status !== 'COMPLETED');
    const existingPoints = activeTasks.reduce((sum, t) => sum + (t.effortPoints || 1), 0);
    memberLoads[m.id] = {
      user: m,
      points: existingPoints,
      assignedTasks: []
    };
  });

  // Shuffle unassigned tasks to guarantee true randomness (Skill-Independent)
  const shuffledTasks = [...unassignedTasks].sort(() => Math.random() - 0.5);

  // Balanced Bin Packing Algorithm:
  // For each task, sort candidate members by current effort points ascending.
  // In case of ties, select randomly among the members with the lowest current workload.
  const assignments = [];

  for (const task of shuffledTasks) {
    const taskPoints = task.effortPoints || 1;

    // Find member(s) with minimal current workload
    let minLoad = Infinity;
    for (const mId in memberLoads) {
      if (memberLoads[mId].points < minLoad) {
        minLoad = memberLoads[mId].points;
      }
    }

    // Filter members that share the minimum load
    const eligibleMemberIds = Object.keys(memberLoads).filter(
      mId => memberLoads[mId].points === minLoad
    );

    // Pick uniformly at random among tied members
    const chosenMemberId = eligibleMemberIds[Math.floor(Math.random() * eligibleMemberIds.length)];

    // Assign task
    memberLoads[chosenMemberId].points += taskPoints;
    memberLoads[chosenMemberId].assignedTasks.push(task.id);

    // Update Task in DB
    db.update('tasks', task.id, {
      assigneeId: chosenMemberId,
      allocationType: 'BASELINE_RANDOM',
      assignedAt: new Date().toISOString()
    });

    // Record Immutable Assignment History (R4.5)
    const historyEntry = {
      id: `hist_${uuidv4()}`,
      taskId: task.id,
      taskTitle: task.title,
      projectId: task.projectId,
      assigneeId: chosenMemberId,
      assigneeName: memberLoads[chosenMemberId].user.name,
      allocationType: 'BASELINE_RANDOM',
      reason: 'Automated balanced baseline allocation (skill-independent).',
      effortPoints: taskPoints,
      timestamp: new Date().toISOString()
    };
    db.insert('assignment_history', historyEntry);
    assignments.push(historyEntry);
  }

  // Summary of distribution
  const summary = {};
  for (const mId in memberLoads) {
    summary[memberLoads[mId].user.name] = {
      userId: mId,
      totalPoints: memberLoads[mId].points,
      newTasksAssigned: memberLoads[mId].assignedTasks.length
    };
  }

  db.logActivity(project.createdById, 'BASELINE_ALLOCATION_EXECUTED', {
    projectId,
    tasksCount: shuffledTasks.length,
    distribution: summary
  });

  return {
    message: `Successfully allocated ${shuffledTasks.length} tasks across ${members.length} team members.`,
    assignedCount: shuffledTasks.length,
    distribution: summary,
    assignments
  };
};

