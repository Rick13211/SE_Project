import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import { db } from '../src/db.js';

async function seed() {
  console.log('🌱 Seeding Intelligent Task Management & Workload Distribution System...');

  const passwordHash = await bcrypt.hash('password123', 10);

  // 1. Seed Users (Admin, Team Lead, and the 4 Team Members from SRS)
  const users = [
    {
      id: 'usr_admin',
      name: 'System Administrator',
      email: 'admin@demo.com',
      password: passwordHash,
      role: 'ADMIN',
      bio: 'Platform superuser managing security policies, user privileges, and system audit monitoring.',
      skills: ['security', 'system design', 'linux', 'devops'],
      isActive: true,
      createdAt: new Date().toISOString()
    },
    {
      id: 'usr_lead',
      name: 'Alex Morgan (Team Lead)',
      email: 'lead@demo.com',
      password: passwordHash,
      role: 'TEAM_LEAD',
      bio: 'Engineering Project Manager leading full-stack cloud and AI product delivery teams.',
      skills: ['system design', 'microservices', 'agile', 'rest api', 'git'],
      isActive: true,
      createdAt: new Date().toISOString()
    },
    {
      id: 'usr_anantam',
      name: 'Anantam Aftab',
      email: 'anantam@demo.com',
      password: passwordHash,
      role: 'MEMBER',
      bio: 'Frontend specialist with deep expertise in React, Next.js, TypeScript, Tailwind CSS, Redux, and modern interactive web dashboards.',
      skills: ['react', 'next.js', 'typescript', 'javascript', 'html/css', 'redux'],
      isActive: true,
      createdAt: new Date().toISOString()
    },
    {
      id: 'usr_shivam',
      name: 'Shivam Saurabh',
      email: 'shivam@demo.com',
      password: passwordHash,
      role: 'MEMBER',
      bio: 'Backend developer focused on high-throughput Node.js, Express, Python FastAPI, PostgreSQL, MongoDB, Redis caching, and RESTful API architecture.',
      skills: ['node.js', 'express', 'python', 'fastapi', 'postgresql', 'mongodb', 'rest api', 'redis'],
      isActive: true,
      createdAt: new Date().toISOString()
    },
    {
      id: 'usr_golu',
      name: 'Golu Kumar',
      email: 'golu@demo.com',
      password: passwordHash,
      role: 'MEMBER',
      bio: 'DevOps & Site Reliability Engineer experienced in Docker containerization, Kubernetes clusters, AWS cloud deployment, Linux administration, and CI/CD automation.',
      skills: ['docker', 'kubernetes', 'aws', 'ci/cd', 'linux', 'git'],
      isActive: true,
      createdAt: new Date().toISOString()
    },
    {
      id: 'usr_rick',
      name: 'Rick Roy',
      email: 'rick@demo.com',
      password: passwordHash,
      role: 'MEMBER',
      bio: 'Machine learning and NLP engineer proficient in Python, spaCy, scikit-learn, text mining, automated classification, and data science pipelines.',
      skills: ['python', 'nlp', 'machine learning', 'data science', 'sql', 'rest api'],
      isActive: true,
      createdAt: new Date().toISOString()
    }
  ];

  // 2. Seed Projects
  const memberIds = ['usr_anantam', 'usr_shivam', 'usr_golu', 'usr_rick'];
  const projects = [
    {
      id: 'proj_cloud_platform',
      name: 'Enterprise Cloud Microservices & Web Platform',
      description: 'Core microservices backend, real-time workload orchestration, responsive Next.js frontend, and automated container deployment.',
      createdById: 'usr_lead',
      memberIds: memberIds,
      deadline: '2026-12-15T18:00:00.000Z',
      createdAt: new Date(Date.now() - 7 * 86400000).toISOString()
    },
    {
      id: 'proj_nlp_analytics',
      name: 'AI-Powered NLP Recommendation Engine',
      description: 'Natural language text processing service to extract skill profiles, evaluate developer match scores, and optimize task assignment.',
      createdById: 'usr_lead',
      memberIds: memberIds,
      deadline: '2026-12-28T18:00:00.000Z',
      createdAt: new Date(Date.now() - 5 * 86400000).toISOString()
    }
  ];

  // 3. Seed Tasks
  const tasks = [
    // Completed Tasks (to establish historical performance baseline for R6 & R7)
    {
      id: 'task_01',
      title: 'Design Responsive Dashboard Layout & Navigation',
      description: 'Build modern responsive sidebar, top bar, and role-aware navigation using React and Tailwind CSS.',
      projectId: 'proj_cloud_platform',
      requiredSkill: 'react',
      effortLevel: 'MEDIUM',
      effortPoints: 3,
      priority: 'HIGH',
      status: 'COMPLETED',
      assigneeId: 'usr_anantam',
      allocationType: 'BASELINE_RANDOM',
      deadline: '2026-11-10T12:00:00.000Z',
      completedAt: '2026-11-09T16:00:00.000Z',
      createdById: 'usr_lead',
      createdAt: new Date(Date.now() - 10 * 86400000).toISOString()
    },
    {
      id: 'task_02',
      title: 'Setup PostgreSQL Database Schema & Migration Scripts',
      description: 'Define relational schema tables, foreign key constraints, indexes, and connection pooling for user and task records.',
      projectId: 'proj_cloud_platform',
      requiredSkill: 'postgresql',
      effortLevel: 'MEDIUM',
      effortPoints: 3,
      priority: 'HIGH',
      status: 'COMPLETED',
      assigneeId: 'usr_shivam',
      allocationType: 'BASELINE_RANDOM',
      deadline: '2026-11-12T12:00:00.000Z',
      completedAt: '2026-11-11T14:30:00.000Z',
      createdById: 'usr_lead',
      createdAt: new Date(Date.now() - 9 * 86400000).toISOString()
    },
    {
      id: 'task_03',
      title: 'Dockerize Backend Services and Setup Docker Compose',
      description: 'Create multi-stage production Dockerfiles for Node.js API and Python services with healthchecks.',
      projectId: 'proj_cloud_platform',
      requiredSkill: 'docker',
      effortLevel: 'LOW',
      effortPoints: 1,
      priority: 'MEDIUM',
      status: 'COMPLETED',
      assigneeId: 'usr_golu',
      allocationType: 'BASELINE_RANDOM',
      deadline: '2026-11-14T12:00:00.000Z',
      completedAt: '2026-11-13T10:00:00.000Z',
      createdById: 'usr_lead',
      createdAt: new Date(Date.now() - 8 * 86400000).toISOString()
    },
    {
      id: 'task_04',
      title: 'Implement TF-IDF Skill Taxonomy Extractor',
      description: 'Develop Python module to tokenize free-text developer resumes and match canonical skills.',
      projectId: 'proj_nlp_analytics',
      requiredSkill: 'python',
      effortLevel: 'HIGH',
      effortPoints: 5,
      priority: 'HIGH',
      status: 'COMPLETED',
      assigneeId: 'usr_rick',
      allocationType: 'BASELINE_RANDOM',
      deadline: '2026-11-15T12:00:00.000Z',
      completedAt: '2026-11-14T18:00:00.000Z',
      createdById: 'usr_lead',
      createdAt: new Date(Date.now() - 7 * 86400000).toISOString()
    },

    // Active in-progress tasks (representing current workloads)
    {
      id: 'task_05',
      title: 'Build JWT Authentication Middleware and Refresh Flow',
      description: 'Implement token validation, role checking, password salting, and secure cookie storage in Express.',
      projectId: 'proj_cloud_platform',
      requiredSkill: 'node.js',
      effortLevel: 'MEDIUM',
      effortPoints: 3,
      priority: 'CRITICAL',
      status: 'IN_PROGRESS',
      assigneeId: 'usr_shivam',
      allocationType: 'BASELINE_RANDOM',
      deadline: '2026-11-20T18:00:00.000Z',
      createdById: 'usr_lead',
      createdAt: new Date(Date.now() - 4 * 86400000).toISOString()
    },
    {
      id: 'task_06',
      title: 'Configure GitHub Actions CI/CD Automated Test Pipeline',
      description: 'Setup continuous integration runner to execute linting, unit tests, and build checks on pull requests.',
      projectId: 'proj_cloud_platform',
      requiredSkill: 'ci/cd',
      effortLevel: 'MEDIUM',
      effortPoints: 3,
      priority: 'HIGH',
      status: 'IN_PROGRESS',
      assigneeId: 'usr_golu',
      allocationType: 'BASELINE_RANDOM',
      deadline: '2026-11-21T18:00:00.000Z',
      createdById: 'usr_lead',
      createdAt: new Date(Date.now() - 3 * 86400000).toISOString()
    },
    {
      id: 'task_07',
      title: 'Create Interactive Workload Distribution Charts',
      description: 'Render dynamic bar charts and effort meter using Chart.js / SVG for Team Lead dashboard.',
      projectId: 'proj_cloud_platform',
      requiredSkill: 'react',
      effortLevel: 'LOW',
      effortPoints: 1,
      priority: 'MEDIUM',
      status: 'IN_PROGRESS',
      assigneeId: 'usr_anantam',
      allocationType: 'BASELINE_RANDOM',
      deadline: '2026-11-22T18:00:00.000Z',
      createdById: 'usr_lead',
      createdAt: new Date(Date.now() - 2 * 86400000).toISOString()
    },

    // Unassigned Tasks (Ready to be allocated via Baseline or Intelligent NLP Engine!)
    {
      id: 'task_08',
      title: 'Develop Real-Time Cosine Similarity NLP Matcher',
      description: 'Implement mathematical vector matching comparing developer skill text against incoming task specifications.',
      projectId: 'proj_nlp_analytics',
      requiredSkill: 'nlp',
      effortLevel: 'HIGH',
      effortPoints: 5,
      priority: 'HIGH',
      status: 'TODO',
      assigneeId: null,
      allocationType: null,
      deadline: '2026-11-25T18:00:00.000Z',
      createdById: 'usr_lead',
      createdAt: new Date(Date.now() - 1 * 86400000).toISOString()
    },
    {
      id: 'task_09',
      title: 'Build Member Reassignment Request Modal & State Management',
      description: 'Frontend component allowing team members to submit task reassignment requests with mandatory justification.',
      projectId: 'proj_cloud_platform',
      requiredSkill: 'react',
      effortLevel: 'MEDIUM',
      effortPoints: 3,
      priority: 'MEDIUM',
      status: 'TODO',
      assigneeId: null,
      allocationType: null,
      deadline: '2026-11-26T18:00:00.000Z',
      createdById: 'usr_lead',
      createdAt: new Date(Date.now() - 1 * 86400000).toISOString()
    },
    {
      id: 'task_10',
      title: 'Deploy Kubernetes Deployment Manifests & Ingress Controller',
      description: 'Write K8s deployment, service, configmap, and ingress specifications for cluster scalability.',
      projectId: 'proj_cloud_platform',
      requiredSkill: 'kubernetes',
      effortLevel: 'HIGH',
      effortPoints: 5,
      priority: 'HIGH',
      status: 'TODO',
      assigneeId: null,
      allocationType: null,
      deadline: '2026-11-27T18:00:00.000Z',
      createdById: 'usr_lead',
      createdAt: new Date().toISOString()
    },
    {
      id: 'task_11',
      title: 'Optimize Database Query Indexes and Connection Pool',
      description: 'Benchmark slow queries, add composite indexes on task assignment logs, and optimize query latency.',
      projectId: 'proj_cloud_platform',
      requiredSkill: 'postgresql',
      effortLevel: 'LOW',
      effortPoints: 1,
      priority: 'LOW',
      status: 'TODO',
      assigneeId: null,
      allocationType: null,
      deadline: '2026-11-29T18:00:00.000Z',
      createdById: 'usr_lead',
      createdAt: new Date().toISOString()
    }
  ];

  // 4. Seed Performance Ratings (R6)
  const ratings = [
    {
      id: 'rate_01',
      taskId: 'task_01',
      taskTitle: 'Design Responsive Dashboard Layout & Navigation',
      userId: 'usr_anantam',
      skill: 'react',
      rating: 'ABOVE_AVERAGE',
      feedback: 'Excellent UI responsiveness, clean Tailwind code, and delivered ahead of schedule.',
      ratedById: 'usr_lead',
      createdAt: new Date(Date.now() - 9 * 86400000).toISOString()
    },
    {
      id: 'rate_02',
      taskId: 'task_02',
      taskTitle: 'Setup PostgreSQL Database Schema & Migration Scripts',
      userId: 'usr_shivam',
      skill: 'postgresql',
      rating: 'ABOVE_AVERAGE',
      feedback: 'Well-structured schema with robust foreign key constraints and clean migrations.',
      ratedById: 'usr_lead',
      createdAt: new Date(Date.now() - 8 * 86400000).toISOString()
    },
    {
      id: 'rate_03',
      taskId: 'task_03',
      taskTitle: 'Dockerize Backend Services and Setup Docker Compose',
      userId: 'usr_golu',
      skill: 'docker',
      rating: 'AVERAGE',
      feedback: 'Good containerization setup, met all specifications.',
      ratedById: 'usr_lead',
      createdAt: new Date(Date.now() - 7 * 86400000).toISOString()
    },
    {
      id: 'rate_04',
      taskId: 'task_04',
      taskTitle: 'Implement TF-IDF Skill Taxonomy Extractor',
      userId: 'usr_rick',
      skill: 'python',
      rating: 'ABOVE_AVERAGE',
      feedback: 'High accuracy NLP skill extraction with great test coverage.',
      ratedById: 'usr_lead',
      createdAt: new Date(Date.now() - 6 * 86400000).toISOString()
    }
  ];

  // 5. Seed Initial Assignment History (R4.5)
  const history = [
    {
      id: 'hist_01',
      taskId: 'task_01',
      taskTitle: 'Design Responsive Dashboard Layout & Navigation',
      projectId: 'proj_cloud_platform',
      assigneeId: 'usr_anantam',
      assigneeName: 'Anantam Aftab',
      allocationType: 'BASELINE_RANDOM',
      reason: 'Automated balanced baseline allocation (skill-independent).',
      effortPoints: 3,
      timestamp: new Date(Date.now() - 10 * 86400000).toISOString()
    },
    {
      id: 'hist_02',
      taskId: 'task_02',
      taskTitle: 'Setup PostgreSQL Database Schema & Migration Scripts',
      projectId: 'proj_cloud_platform',
      assigneeId: 'usr_shivam',
      assigneeName: 'Shivam Saurabh',
      allocationType: 'BASELINE_RANDOM',
      reason: 'Automated balanced baseline allocation (skill-independent).',
      effortPoints: 3,
      timestamp: new Date(Date.now() - 9 * 86400000).toISOString()
    },
    {
      id: 'hist_03',
      taskId: 'task_05',
      taskTitle: 'Build JWT Authentication Middleware and Refresh Flow',
      projectId: 'proj_cloud_platform',
      assigneeId: 'usr_shivam',
      assigneeName: 'Shivam Saurabh',
      allocationType: 'BASELINE_RANDOM',
      reason: 'Automated balanced baseline allocation (skill-independent).',
      effortPoints: 3,
      timestamp: new Date(Date.now() - 4 * 86400000).toISOString()
    }
  ];

  // 6. Write all collections into database
  const fullData = {
    users,
    projects,
    tasks,
    assignment_history: history,
    reassignment_requests: [],
    performance_ratings: ratings,
    system_logs: [
      {
        id: 'log_seed',
        userId: 'usr_admin',
        action: 'SYSTEM_SEEDED',
        details: { usersCount: users.length, tasksCount: tasks.length },
        timestamp: new Date().toISOString()
      }
    ]
  };

  db.save(fullData);

  console.log('✅ Seed complete!');
  console.log(`👥 Created ${users.length} Users:`);
  users.forEach(u => console.log(`   - [${u.role}] ${u.name} (${u.email})`));
  console.log(`📁 Created ${projects.length} Projects`);
  console.log(`📋 Created ${tasks.length} Tasks (${tasks.filter(t => !t.assigneeId).length} Unassigned ready for allocation)`);
  console.log(`⭐ Created ${ratings.length} Performance Ratings`);
  console.log(`🔑 All accounts initialized with password: password123`);
}

seed().catch(err => {
  console.error('Seed script error:', err);
  process.exit(1);
});

