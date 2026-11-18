/**
 * Smart Task Allocation and Team Workload Management System
 * Frontend Application Controller
 * Authors: Anantam Aftab, Shivam Saurabh, Golu Kumar, Rick Roy
 */

class TaskManagementApp {
  constructor() {
    this.apiBase = '/api';
    this.token = localStorage.getItem('smart_task_token') || null;
    this.currentUser = null;
    this.projects = [];
    this.selectedProjectId = null;
    this.tasks = [];
    this.workloadData = null;
    this.pendingReassignments = [];
    this.teamMembers = [];
    this.activeTaskFilter = 'ALL';

    this.init();
  }

  async init() {
    if (this.token) {
      try {
        const res = await this.apiCall('/auth/me');
        this.currentUser = res.user;
        this.renderNavbar();
        await this.loadInitialData();
      } catch (err) {
        console.warn('Session expired, logging out.');
        this.logout();
      }
    } else {
      this.renderNavbar();
      this.renderAuthView();
    }
  }

  // --- API HELPER ---
  async apiCall(endpoint, method = 'GET', body = null) {
    const headers = { 'Content-Type': 'application/json' };
    if (this.token) headers['Authorization'] = `Bearer ${this.token}`;

    const config = { method, headers };
    if (body) config.body = JSON.stringify(body);

    const res = await fetch(`${this.apiBase}${endpoint}`, config);
    const data = await res.json();

    if (!res.ok) {
      throw new Error(data.error || data.message || 'API request failed');
    }
    return data;
  }

  showToast(message, type = 'info') {
    const container = document.getElementById('toastContainer');
    const toast = document.createElement('div');
    const colors = {
      success: 'bg-emerald-950/90 border-emerald-500/50 text-emerald-200',
      error: 'bg-rose-950/90 border-rose-500/50 text-rose-200',
      info: 'bg-sky-950/90 border-sky-500/50 text-sky-200'
    };

    toast.className = `p-4 rounded-xl border backdrop-blur-md shadow-2xl flex items-center justify-between gap-3 text-sm transition-all duration-300 transform translate-y-2 opacity-0 ${colors[type] || colors.info}`;
    toast.innerHTML = `
      <div class="flex items-center gap-2">
        <span class="font-bold text-xs uppercase tracking-wider">${type}</span>
        <span>${message}</span>
      </div>
      <button onclick="this.parentElement.remove()" class="text-slate-400 hover:text-white">&times;</button>
    `;
    container.appendChild(toast);

    setTimeout(() => {
      toast.classList.remove('translate-y-2', 'opacity-0');
    }, 10);

    setTimeout(() => {
      toast.classList.add('opacity-0');
      setTimeout(() => toast.remove(), 300);
    }, 4500);
  }

  // --- AUTH ACTIONS ---
  async login(email, password) {
    try {
      const data = await this.apiCall('/auth/login', 'POST', { email, password });
      this.token = data.token;
      this.currentUser = data.user;
      localStorage.setItem('smart_task_token', this.token);
      this.showToast(`Welcome back, ${data.user.name}!`, 'success');
      this.renderNavbar();
      await this.loadInitialData();
    } catch (err) {
      this.showToast(err.message, 'error');
    }
  }

  async quickLogin(email) {
    await this.login(email, 'password123');
  }

  async register(userData) {
    try {
      const data = await this.apiCall('/auth/register', 'POST', userData);
      this.token = data.token;
      this.currentUser = data.user;
      localStorage.setItem('smart_task_token', this.token);
      this.showToast('Account registered successfully!', 'success');
      this.renderNavbar();
      await this.loadInitialData();
    } catch (err) {
      this.showToast(err.message, 'error');
    }
  }

  logout() {
    this.token = null;
    this.currentUser = null;
    localStorage.removeItem('smart_task_token');
    this.renderNavbar();
    this.renderAuthView();
    this.showToast('Logged out securely.', 'info');
  }

  // --- DATA LOADING ---
  async loadInitialData() {
    try {
      const projects = await this.apiCall('/projects');
      this.projects = projects;
      if (projects.length > 0 && !this.selectedProjectId) {
        this.selectedProjectId = projects[0].id;
      }

      await this.refreshCurrentView();
    } catch (err) {
      this.showToast(err.message, 'error');
    }
  }

  async refreshCurrentView() {
    if (!this.currentUser) return;

    if (this.currentUser.role === 'ADMIN') {
      await this.renderAdminDashboard();
    } else if (this.currentUser.role === 'TEAM_LEAD') {
      await this.renderTeamLeadDashboard();
    } else {
      await this.renderMemberDashboard();
    }
  }

  // --- NAVBAR RENDERING ---
  renderNavbar() {
    const nav = document.getElementById('userNavSection');
    const switcher = document.getElementById('demoSwitcher');

    if (this.currentUser) {
      switcher.classList.remove('hidden');
      switcher.classList.add('lg:flex');

      const roleBadgeColors = {
        ADMIN: 'bg-purple-500/20 text-purple-300 border-purple-500/40',
        TEAM_LEAD: 'bg-sky-500/20 text-sky-300 border-sky-500/40',
        MEMBER: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
      };

      nav.innerHTML = `
        <div class="flex items-center gap-3">
          <div class="text-right hidden sm:block">
            <div class="text-sm font-semibold text-slate-200">${this.currentUser.name}</div>
            <div class="text-[11px] font-mono px-2 py-0.5 rounded-full border inline-block ${roleBadgeColors[this.currentUser.role] || ''}">
              ${this.currentUser.role}
            </div>
          </div>
          <button onclick="app.logout()" class="px-3 py-1.5 text-xs font-medium rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition">
            Sign Out
          </button>
        </div>
      `;
    } else {
      switcher.classList.add('hidden');
      switcher.classList.remove('lg:flex');
      nav.innerHTML = `
        <span class="text-xs text-slate-400 font-mono">Sign in to continue</span>
      `;
    }
  }

  // ==========================================
  // VIEW: AUTH (LOGIN & REGISTER)
  // ==========================================
  renderAuthView(isRegister = false) {
    const root = document.getElementById('appContainer');

    if (isRegister) {
      root.innerHTML = `
        <div class="max-w-md mx-auto my-8 glass-card p-8 rounded-2xl shadow-2xl border border-slate-700">
          <h2 class="text-2xl font-bold tracking-tight text-white mb-2">Create an Account</h2>
          <p class="text-sm text-slate-400 mb-6">Join your software engineering team</p>
          
          <form onsubmit="event.preventDefault(); app.handleRegisterSubmit(this);" class="space-y-4">
            <div>
              <label class="block text-xs font-medium text-slate-300 mb-1">Full Name</label>
              <input name="name" required class="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-sky-500" placeholder="e.g. John Doe">
            </div>
            <div>
              <label class="block text-xs font-medium text-slate-300 mb-1">Email Address</label>
              <input name="email" type="email" required class="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-sky-500" placeholder="name@company.com">
            </div>
            <div>
              <label class="block text-xs font-medium text-slate-300 mb-1">Password</label>
              <input name="password" type="password" required class="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-sky-500" placeholder="••••••••">
            </div>
            <div>
              <label class="block text-xs font-medium text-slate-300 mb-1">System Role</label>
              <select name="role" class="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-sky-500">
                <option value="MEMBER">Team Member (Developer / QA / DevOps)</option>
                <option value="TEAM_LEAD">Team Lead / Project Manager</option>
                <option value="ADMIN">Administrator</option>
              </select>
            </div>
            <div>
              <label class="block text-xs font-medium text-slate-300 mb-1">Technical Bio / Skills Profile (Free-text for NLP)</label>
              <textarea name="bio" rows="3" class="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-sky-500" placeholder="e.g. Experienced with React, Node.js, PostgreSQL, Docker containerization, and REST API design..."></textarea>
            </div>
            <button type="submit" class="w-full bg-gradient-to-r from-sky-500 to-indigo-600 hover:from-sky-400 hover:to-indigo-500 text-white font-medium py-2.5 rounded-xl shadow-lg shadow-sky-500/20 text-sm transition">
              Complete Registration
            </button>
          </form>

          <div class="mt-6 text-center text-xs text-slate-400">
            Already have an account? 
            <button onclick="app.renderAuthView(false)" class="text-sky-400 hover:underline font-medium">Log in</button>
          </div>
        </div>
      `;
      return;
    }

    // Default Login View
    root.innerHTML = `
      <div class="max-w-md mx-auto my-8 glass-card p-8 rounded-2xl shadow-2xl border border-slate-700">
        <div class="text-center mb-6">
          <div class="inline-flex w-12 h-12 rounded-2xl bg-gradient-to-tr from-sky-500 to-indigo-600 items-center justify-center text-white mb-3 shadow-lg shadow-sky-500/20">
            <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"></path>
            </svg>
          </div>
          <h2 class="text-2xl font-bold tracking-tight text-white">Sign In</h2>
          <p class="text-xs text-slate-400 mt-1">Smart Task Allocation & Workload Management</p>
        </div>

        <!-- Quick Demo Profiles for 1-Click Login -->
        <div class="mb-6 bg-slate-900/90 border border-slate-800 p-3.5 rounded-xl">
          <div class="text-[11px] font-mono uppercase text-slate-400 mb-2 flex items-center justify-between">
            <span>⚡ 1-Click Evaluation Login</span>
            <span class="text-[10px] text-sky-400">Default PW: password123</span>
          </div>
          <div class="grid grid-cols-2 gap-2 text-xs">
            <button onclick="app.quickLogin('lead@demo.com')" class="p-2 rounded-lg bg-sky-950/60 border border-sky-800/40 text-sky-200 hover:bg-sky-900/60 text-left transition">
              <div class="font-semibold">Alex Morgan</div>
              <div class="text-[10px] text-slate-400">Team Lead (PM)</div>
            </button>
            <button onclick="app.quickLogin('anantam@demo.com')" class="p-2 rounded-lg bg-emerald-950/60 border border-emerald-800/40 text-emerald-200 hover:bg-emerald-900/60 text-left transition">
              <div class="font-semibold">Anantam Aftab</div>
              <div class="text-[10px] text-slate-400">Member (Frontend/React)</div>
            </button>
            <button onclick="app.quickLogin('shivam@demo.com')" class="p-2 rounded-lg bg-indigo-950/60 border border-indigo-800/40 text-indigo-200 hover:bg-indigo-900/60 text-left transition">
              <div class="font-semibold">Shivam Saurabh</div>
              <div class="text-[10px] text-slate-400">Member (Backend/Node)</div>
            </button>
            <button onclick="app.quickLogin('admin@demo.com')" class="p-2 rounded-lg bg-purple-950/60 border border-purple-800/40 text-purple-200 hover:bg-purple-900/60 text-left transition">
              <div class="font-semibold">System Admin</div>
              <div class="text-[10px] text-slate-400">Administrator</div>
            </button>
          </div>
        </div>

        <form onsubmit="event.preventDefault(); app.handleLoginSubmit(this);" class="space-y-4">
          <div>
            <label class="block text-xs font-medium text-slate-300 mb-1">Email</label>
            <input name="email" type="email" required value="lead@demo.com" class="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-sky-500">
          </div>
          <div>
            <label class="block text-xs font-medium text-slate-300 mb-1">Password</label>
            <input name="password" type="password" required value="password123" class="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-sky-500">
          </div>
          <button type="submit" class="w-full bg-gradient-to-r from-sky-500 to-indigo-600 hover:from-sky-400 hover:to-indigo-500 text-white font-medium py-2.5 rounded-xl shadow-lg shadow-sky-500/20 text-sm transition">
            Sign In with Email
          </button>
        </form>

        <div class="mt-6 text-center text-xs text-slate-400">
          Need an account? 
          <button onclick="app.renderAuthView(true)" class="text-sky-400 hover:underline font-medium">Register here</button>
        </div>
      </div>
    `;
  }

  handleLoginSubmit(form) {
    const email = form.email.value;
    const password = form.password.value;
    this.login(email, password);
  }

  handleRegisterSubmit(form) {
    this.register({
      name: form.name.value,
      email: form.email.value,
      password: form.password.value,
      role: form.role.value,
      bio: form.bio.value
    });
  }

  // ==========================================
  // VIEW: TEAM LEAD DASHBOARD (R8, R2, R3, R4, R7, R9)
  // ==========================================
  async renderTeamLeadDashboard() {
    const root = document.getElementById('appContainer');

    // Fetch live project workload data and pending reassignments
    let workload = null;
    if (this.selectedProjectId) {
      try {
        workload = await this.apiCall(`/analytics/workload/${this.selectedProjectId}`);
        this.workloadData = workload;
      } catch (err) {
        console.error(err);
      }
    }

    const tasks = await this.apiCall(`/tasks${this.selectedProjectId ? `?projectId=${this.selectedProjectId}` : ''}`);
    this.tasks = tasks;

    const pendingReassignments = await this.apiCall('/reassignment/pending');
    this.pendingReassignments = pendingReassignments;

    const unassignedTasks = tasks.filter(t => !t.assigneeId);
    const completedTasks = tasks.filter(t => t.status === 'COMPLETED');
    const totalPoints = tasks.reduce((sum, t) => sum + (t.effortPoints || 1), 0);

    root.innerHTML = `
      <div class="space-y-6">
        
        <!-- PROJECT SELECTOR & TOP HEADER -->
        <div class="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-2 border-b border-slate-800">
          <div>
            <div class="flex items-center gap-2">
              <h1 class="text-2xl font-bold tracking-tight text-white">Team Lead Command Center</h1>
              <span class="px-2.5 py-0.5 rounded-full text-xs font-mono bg-sky-500/10 text-sky-400 border border-sky-500/20">Project Manager</span>
            </div>
            <p class="text-xs text-slate-400 mt-1">Effort-balanced allocation, NLP skill matching & team workload optimization</p>
          </div>

          <div class="flex items-center gap-3">
            <!-- Project Dropdown -->
            <select onchange="app.handleProjectChange(this.value)" class="bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-sky-500">
              ${this.projects.map(p => `
                <option value="${p.id}" ${p.id === this.selectedProjectId ? 'selected' : ''}>${p.name}</option>
              `).join('')}
            </select>

            <button onclick="app.openCreateProjectModal()" class="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-medium transition flex items-center gap-1.5">
              <span>+ New Project</span>
            </button>
            <button onclick="app.openCreateTaskModal()" class="px-3.5 py-2 rounded-xl bg-gradient-to-r from-sky-500 to-indigo-600 hover:from-sky-400 hover:to-indigo-500 text-white text-xs font-semibold shadow-lg shadow-sky-500/20 transition flex items-center gap-1.5">
              <span>+ Create Task</span>
            </button>
          </div>
        </div>

        <!-- REASSIGNMENT REQUESTS ALERT BANNER (If Any Pending) -->
        ${pendingReassignments.length > 0 ? `
          <div class="bg-amber-950/40 border border-amber-600/40 p-4 rounded-2xl flex flex-col md:flex-row items-start md:items-center justify-between gap-3 shadow-lg">
            <div class="flex items-start gap-3">
              <div class="w-8 h-8 rounded-lg bg-amber-500/20 text-amber-400 flex items-center justify-center font-bold text-sm shrink-0">
                ⚠️
              </div>
              <div>
                <div class="text-sm font-semibold text-amber-200">
                  ${pendingReassignments.length} Task Reassignment Request(s) Pending Review
                </div>
                <div class="text-xs text-amber-300/80">
                  Team members have requested reassignment due to capacity or domain requirements.
                </div>
              </div>
            </div>
            <button onclick="app.openReviewReassignmentsModal()" class="px-3 py-1.5 rounded-xl bg-amber-500 text-slate-950 text-xs font-bold hover:bg-amber-400 transition">
              Review Requests
            </button>
          </div>
        ` : ''}

        <!-- SUMMARY STATS TILES -->
        <div class="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div class="glass-card p-4 rounded-2xl">
            <div class="text-xs text-slate-400">Total Project Tasks</div>
            <div class="text-2xl font-bold text-white mt-1">${tasks.length}</div>
            <div class="text-[11px] text-slate-500 mt-1">${totalPoints} Total Effort Points</div>
          </div>
          <div class="glass-card p-4 rounded-2xl">
            <div class="text-xs text-slate-400">Unassigned Tasks</div>
            <div class="text-2xl font-bold ${unassignedTasks.length > 0 ? 'text-amber-400' : 'text-slate-300'} mt-1">
              ${unassignedTasks.length}
            </div>
            <div class="text-[11px] text-slate-500 mt-1">Awaiting Allocation</div>
          </div>
          <div class="glass-card p-4 rounded-2xl">
            <div class="text-xs text-slate-400">Completed Work</div>
            <div class="text-2xl font-bold text-emerald-400 mt-1">${completedTasks.length}</div>
            <div class="text-[11px] text-slate-500 mt-1">${tasks.length > 0 ? Math.round((completedTasks.length / tasks.length) * 100) : 0}% completion rate</div>
          </div>
          <div class="glass-card p-4 rounded-2xl">
            <div class="text-xs text-slate-400">Active Team Members</div>
            <div class="text-2xl font-bold text-sky-400 mt-1">${workload ? workload.memberDistribution.length : 0}</div>
            <div class="text-[11px] text-slate-500 mt-1">Tracking live effort</div>
          </div>
        </div>

        <!-- WORKLOAD DISTRIBUTION & BALANCING ENGINE PANEL -->
        <div class="glass-card p-6 rounded-2xl border border-slate-700/60">
          <div class="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
            <div>
              <h2 class="text-lg font-bold text-white flex items-center gap-2">
                <span>Real-Time Team Workload Distribution</span>
                <span class="text-xs font-normal text-slate-400">(Effort Points Balance)</span>
              </h2>
              <p class="text-xs text-slate-400 mt-0.5">Monitors capacity, active points, and prevents developer burnout</p>
            </div>

            <!-- ACTION BUTTON: Run Baseline Allocation -->
            <button onclick="app.runBaselineAllocation()" class="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-lg shadow-indigo-600/20 transition flex items-center gap-2">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path>
              </svg>
              <span>Run Balanced Baseline Allocation</span>
            </button>
          </div>

          <!-- Workload Distribution Bars -->
          <div class="space-y-4">
            ${workload && workload.memberDistribution.length > 0 ? workload.memberDistribution.map(m => {
              const maxScale = 12; // Maximum reference scale points
              const pct = Math.min(100, Math.round((m.effortPoints / maxScale) * 100));
              const isOverloaded = m.effortPoints > 8;
              const barColor = isOverloaded ? 'bg-rose-500' : (m.effortPoints > 5 ? 'bg-amber-500' : 'bg-emerald-500');

              return `
                <div class="p-3 bg-slate-900/60 rounded-xl border border-slate-800">
                  <div class="flex items-center justify-between text-xs mb-1.5">
                    <div class="flex items-center gap-2">
                      <span class="font-semibold text-white">${m.name}</span>
                      <span class="text-slate-500 font-mono">(${m.email})</span>
                      ${isOverloaded ? `
                        <span class="px-2 py-0.5 rounded-full text-[10px] bg-rose-500/10 text-rose-400 border border-rose-500/30">
                          ⚠️ Heavy Load
                        </span>
                      ` : `
                        <span class="px-2 py-0.5 rounded-full text-[10px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                          Balanced
                        </span>
                      `}
                    </div>
                    <div class="font-mono text-slate-300">
                      <span class="font-bold text-white">${m.effortPoints}</span> / 10 pts 
                      <span class="text-slate-500">(${m.activeTasksCount} active tasks)</span>
                    </div>
                  </div>

                  <!-- Progress Bar -->
                  <div class="w-full h-2.5 bg-slate-800 rounded-full overflow-hidden">
                    <div class="${barColor} h-full rounded-full transition-all duration-500" style="width: ${pct}%"></div>
                  </div>

                  <!-- Task status pills -->
                  <div class="flex items-center gap-3 mt-2 text-[11px] text-slate-400">
                    <span>TODO: <strong class="text-slate-200">${m.statusBreakdown.TODO}</strong></span>
                    <span>In Progress: <strong class="text-slate-200">${m.statusBreakdown.IN_PROGRESS}</strong></span>
                    <span>In Review: <strong class="text-slate-200">${m.statusBreakdown.IN_REVIEW}</strong></span>
                    <span>Completed: <strong class="text-emerald-400">${m.statusBreakdown.COMPLETED}</strong></span>
                  </div>
                </div>
              `;
            }).join('') : `
              <div class="text-center py-6 text-slate-500 text-xs">No team members assigned to this project yet.</div>
            `}
          </div>
        </div>

        <!-- TASKS MANAGEMENT SECTION -->
        <div class="glass-card p-6 rounded-2xl border border-slate-700/60">
          <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
            <div>
              <h2 class="text-lg font-bold text-white">Project Tasks & Allocation</h2>
              <p class="text-xs text-slate-400">Assign with AI, manually override, track status, and rate completed work</p>
            </div>

            <!-- Task Filters -->
            <div class="flex items-center gap-1.5 bg-slate-900 p-1 rounded-xl border border-slate-800 text-xs">
              <button onclick="app.setTaskFilter('ALL')" class="px-2.5 py-1 rounded-lg ${this.activeTaskFilter === 'ALL' ? 'bg-sky-500 text-white font-medium' : 'text-slate-400 hover:text-white'}">All (${tasks.length})</button>
              <button onclick="app.setTaskFilter('UNASSIGNED')" class="px-2.5 py-1 rounded-lg ${this.activeTaskFilter === 'UNASSIGNED' ? 'bg-sky-500 text-white font-medium' : 'text-slate-400 hover:text-white'}">Unassigned (${unassignedTasks.length})</button>
              <button onclick="app.setTaskFilter('IN_PROGRESS')" class="px-2.5 py-1 rounded-lg ${this.activeTaskFilter === 'IN_PROGRESS' ? 'bg-sky-500 text-white font-medium' : 'text-slate-400 hover:text-white'}">Active</button>
              <button onclick="app.setTaskFilter('COMPLETED')" class="px-2.5 py-1 rounded-lg ${this.activeTaskFilter === 'COMPLETED' ? 'bg-sky-500 text-white font-medium' : 'text-slate-400 hover:text-white'}">Completed (${completedTasks.length})</button>
            </div>
          </div>

          <!-- Tasks Table -->
          <div class="overflow-x-auto">
            <table class="w-full text-left text-xs">
              <thead class="bg-slate-900/80 text-slate-400 font-mono uppercase text-[10px] tracking-wider border-b border-slate-800">
                <tr>
                  <th class="py-3 px-3">Task Details</th>
                  <th class="py-3 px-3">Skill Requirement</th>
                  <th class="py-3 px-3">Effort / Priority</th>
                  <th class="py-3 px-3">Current Assignee</th>
                  <th class="py-3 px-3">Status</th>
                  <th class="py-3 px-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-slate-800/80">
                ${this.getFilteredTasks().map(task => {
                  const effortBadge = task.effortLevel === 'HIGH' ? 'badge-high' : (task.effortLevel === 'MEDIUM' ? 'badge-medium' : 'badge-low');
                  const isUnassigned = !task.assigneeId;

                  return `
                    <tr class="hover:bg-slate-800/40 transition">
                      <td class="py-3 px-3">
                        <div class="font-semibold text-white text-sm">${task.title}</div>
                        <div class="text-[11px] text-slate-400 line-clamp-1 mt-0.5">${task.description || 'No description provided'}</div>
                      </td>
                      <td class="py-3 px-3">
                        <span class="px-2 py-0.5 rounded-md bg-slate-800 border border-slate-700 text-sky-300 font-mono text-[11px]">
                          ${task.requiredSkill}
                        </span>
                      </td>
                      <td class="py-3 px-3">
                        <div class="flex items-center gap-1.5">
                          <span class="px-2 py-0.5 rounded-md ${effortBadge} text-[10px] font-bold">
                            ${task.effortLevel} (${task.effortPoints} pts)
                          </span>
                          <span class="text-slate-400 font-mono text-[10px]">${task.priority}</span>
                        </div>
                      </td>
                      <td class="py-3 px-3">
                        ${isUnassigned ? `
                          <span class="text-amber-400/90 font-mono flex items-center gap-1">
                            <span class="w-2 h-2 rounded-full bg-amber-400 animate-pulse"></span>
                            Unassigned
                          </span>
                        ` : `
                          <div class="font-medium text-slate-200">${task.assigneeName}</div>
                          <div class="text-[10px] text-slate-500 font-mono">${task.allocationType || 'Assigned'}</div>
                        `}
                      </td>
                      <td class="py-3 px-3">
                        <span class="px-2 py-0.5 rounded-full text-[10px] font-medium ${
                          task.status === 'COMPLETED' ? 'bg-emerald-500/20 text-emerald-300' :
                          task.status === 'IN_PROGRESS' ? 'bg-sky-500/20 text-sky-300' :
                          task.status === 'IN_REVIEW' ? 'bg-purple-500/20 text-purple-300' :
                          'bg-slate-800 text-slate-400'
                        }">
                          ${task.status}
                        </span>
                      </td>
                      <td class="py-3 px-3 text-right">
                        <div class="flex items-center justify-end gap-1.5">
                          ${isUnassigned ? `
                            <!-- Smart Allocate Recommendation Button (R7) -->
                            <button onclick="app.openSmartAllocationModal('${task.id}')" class="px-2.5 py-1 rounded-lg bg-sky-500/20 hover:bg-sky-500/30 text-sky-300 border border-sky-500/40 font-semibold text-[11px] transition flex items-center gap-1">
                              <span>🤖 Smart Allocate</span>
                            </button>
                          ` : `
                            <!-- Reassign / Override Button (R9.2) -->
                            <button onclick="app.openSmartAllocationModal('${task.id}')" class="px-2 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-[11px] transition">
                              Reassign
                            </button>
                          `}

                          ${task.status === 'COMPLETED' ? `
                            <!-- Rate Completed Task Button (R6.1) -->
                            <button onclick="app.openRateTaskModal('${task.id}')" class="px-2 py-1 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 text-[11px] font-semibold transition">
                              ⭐ Rate
                            </button>
                          ` : ''}

                          <button onclick="app.deleteTask('${task.id}')" class="p-1 rounded hover:bg-rose-500/20 text-slate-500 hover:text-rose-400 transition" title="Delete Task">
                            &times;
                          </button>
                        </div>
                      </td>
                    </tr>
                  `;
                }).join('')}
              </tbody>
            </table>
          </div>
        </div>

      </div>
    `;
  }

  getFilteredTasks() {
    if (this.activeTaskFilter === 'UNASSIGNED') {
      return this.tasks.filter(t => !t.assigneeId);
    }
    if (this.activeTaskFilter === 'IN_PROGRESS') {
      return this.tasks.filter(t => t.status === 'IN_PROGRESS' || t.status === 'IN_REVIEW');
    }
    if (this.activeTaskFilter === 'COMPLETED') {
      return this.tasks.filter(t => t.status === 'COMPLETED');
    }
    return this.tasks;
  }

  setTaskFilter(filter) {
    this.activeTaskFilter = filter;
    this.renderTeamLeadDashboard();
  }

  handleProjectChange(newId) {
    this.selectedProjectId = newId;
    this.refreshCurrentView();
  }

  // ==========================================
  // VIEW: TEAM MEMBER DASHBOARD (R8, R3.6, R5.1, R9.3)
  // ==========================================
  async renderMemberDashboard() {
    const root = document.getElementById('appContainer');

    // Fetch tasks assigned specifically to this member
    const myTasks = await this.apiCall('/tasks');
    const myActiveTasks = myTasks.filter(t => t.status !== 'COMPLETED');
    const myCompletedTasks = myTasks.filter(t => t.status === 'COMPLETED');
    const currentPoints = myActiveTasks.reduce((sum, t) => sum + (t.effortPoints || 1), 0);

    // Fetch user's rating profile
    let ratingsProfile = null;
    try {
      ratingsProfile = await this.apiCall(`/performance/user/${this.currentUser.id}`);
    } catch (err) {
      console.warn(err);
    }

    root.innerHTML = `
      <div class="space-y-6">

        <!-- MEMBER HEADER & WORKLOAD METER -->
        <div class="glass-card p-6 rounded-2xl border border-slate-700/60 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <div class="flex items-center gap-2">
              <h1 class="text-2xl font-bold tracking-tight text-white">Developer Workspace</h1>
              <span class="px-2.5 py-0.5 rounded-full text-xs font-mono bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">Team Member</span>
            </div>
            <p class="text-xs text-slate-400 mt-1">Logged in as <strong class="text-white">${this.currentUser.name}</strong> • ${this.currentUser.email}</p>
            
            <!-- Skill Badges -->
            <div class="flex flex-wrap items-center gap-1.5 mt-3">
              <span class="text-xs text-slate-400 font-mono">Verified Skills:</span>
              ${(this.currentUser.skills || []).map(s => `
                <span class="px-2 py-0.5 rounded-md bg-slate-900 border border-slate-700 text-sky-300 font-mono text-[11px]">${s}</span>
              `).join('')}
              <button onclick="app.openSkillProfileModal()" class="text-xs text-sky-400 hover:underline ml-2">+ Edit Bio & NLP Skills</button>
            </div>
          </div>

          <!-- Personal Workload Gauge -->
          <div class="bg-slate-900/80 border border-slate-800 p-4 rounded-xl min-w-[240px]">
            <div class="flex items-center justify-between text-xs text-slate-400 mb-1">
              <span>Personal Workload</span>
              <span class="font-mono font-bold text-white">${currentPoints} / 10 pts</span>
            </div>
            <div class="w-full h-2.5 bg-slate-800 rounded-full overflow-hidden">
              <div class="${currentPoints > 8 ? 'bg-rose-500' : 'bg-emerald-500'} h-full rounded-full transition-all duration-500" style="width: ${Math.min(100, (currentPoints / 10) * 100)}%"></div>
            </div>
            <div class="text-[11px] text-slate-500 mt-2 flex items-center justify-between">
              <span>${myActiveTasks.length} Active Tasks</span>
              <span>${myCompletedTasks.length} Completed</span>
            </div>
          </div>
        </div>

        <!-- PERFORMANCE HISTORY BADGE (R6) -->
        ${ratingsProfile && ratingsProfile.totalRatedTasks > 0 ? `
          <div class="bg-slate-800/40 border border-slate-700 p-4 rounded-2xl flex flex-wrap items-center justify-between gap-4 text-xs">
            <div class="flex items-center gap-2">
              <span class="text-base">⭐</span>
              <span class="font-semibold text-slate-200">Demonstrated Performance History:</span>
              <span class="text-emerald-400 font-bold">${ratingsProfile.ratingCounts.ABOVE_AVERAGE} Above Avg</span>
              <span class="text-slate-400">•</span>
              <span class="text-amber-400 font-bold">${ratingsProfile.ratingCounts.AVERAGE} Average</span>
              <span class="text-slate-400">•</span>
              <span class="text-rose-400 font-bold">${ratingsProfile.ratingCounts.BELOW_AVERAGE} Below Avg</span>
            </div>
            <div class="text-slate-400 font-mono text-[11px]">
              ${ratingsProfile.hasSufficientHistory ? '✅ Active in Intelligent Allocation Recommender' : '⏳ Warm-up phase (< 2 ratings)'}
            </div>
          </div>
        ` : ''}

        <!-- KANBAN BOARD (R3.6) -->
        <div>
          <h2 class="text-lg font-bold text-white mb-4">My Assigned Tasks (Kanban)</h2>

          <div class="grid grid-cols-1 md:grid-cols-4 gap-4">
            
            <!-- COLUMN: TODO -->
            <div class="bg-slate-900/50 border border-slate-800 p-3.5 rounded-2xl flex flex-col">
              <div class="flex items-center justify-between text-xs font-bold text-slate-300 pb-3 border-b border-slate-800 mb-3">
                <span class="flex items-center gap-2">
                  <span class="w-2 h-2 rounded-full bg-slate-500"></span>
                  TO DO
                </span>
                <span class="px-2 py-0.5 rounded-full bg-slate-800 text-slate-400 font-mono">${myTasks.filter(t => t.status === 'TODO').length}</span>
              </div>
              <div class="space-y-3 flex-1">
                ${this.renderKanbanColumnTasks(myTasks.filter(t => t.status === 'TODO'))}
              </div>
            </div>

            <!-- COLUMN: IN PROGRESS -->
            <div class="bg-slate-900/50 border border-slate-800 p-3.5 rounded-2xl flex flex-col">
              <div class="flex items-center justify-between text-xs font-bold text-sky-300 pb-3 border-b border-slate-800 mb-3">
                <span class="flex items-center gap-2">
                  <span class="w-2 h-2 rounded-full bg-sky-500 animate-pulse"></span>
                  IN PROGRESS
                </span>
                <span class="px-2 py-0.5 rounded-full bg-sky-950 text-sky-400 font-mono">${myTasks.filter(t => t.status === 'IN_PROGRESS').length}</span>
              </div>
              <div class="space-y-3 flex-1">
                ${this.renderKanbanColumnTasks(myTasks.filter(t => t.status === 'IN_PROGRESS'))}
              </div>
            </div>

            <!-- COLUMN: IN REVIEW -->
            <div class="bg-slate-900/50 border border-slate-800 p-3.5 rounded-2xl flex flex-col">
              <div class="flex items-center justify-between text-xs font-bold text-purple-300 pb-3 border-b border-slate-800 mb-3">
                <span class="flex items-center gap-2">
                  <span class="w-2 h-2 rounded-full bg-purple-500"></span>
                  IN REVIEW
                </span>
                <span class="px-2 py-0.5 rounded-full bg-purple-950 text-purple-400 font-mono">${myTasks.filter(t => t.status === 'IN_REVIEW').length}</span>
              </div>
              <div class="space-y-3 flex-1">
                ${this.renderKanbanColumnTasks(myTasks.filter(t => t.status === 'IN_REVIEW'))}
              </div>
            </div>

            <!-- COLUMN: COMPLETED -->
            <div class="bg-slate-900/50 border border-slate-800 p-3.5 rounded-2xl flex flex-col">
              <div class="flex items-center justify-between text-xs font-bold text-emerald-300 pb-3 border-b border-slate-800 mb-3">
                <span class="flex items-center gap-2">
                  <span class="w-2 h-2 rounded-full bg-emerald-500"></span>
                  COMPLETED
                </span>
                <span class="px-2 py-0.5 rounded-full bg-emerald-950 text-emerald-400 font-mono">${myTasks.filter(t => t.status === 'COMPLETED').length}</span>
              </div>
              <div class="space-y-3 flex-1">
                ${this.renderKanbanColumnTasks(myTasks.filter(t => t.status === 'COMPLETED'))}
              </div>
            </div>

          </div>
        </div>

      </div>
    `;
  }

  renderKanbanColumnTasks(columnTasks) {
    if (columnTasks.length === 0) {
      return `<div class="text-center py-8 text-slate-600 text-xs font-mono">No tasks</div>`;
    }

    return columnTasks.map(task => {
      const effortBadge = task.effortLevel === 'HIGH' ? 'badge-high' : (task.effortLevel === 'MEDIUM' ? 'badge-medium' : 'badge-low');
      const nextStatusMap = {
        TODO: 'IN_PROGRESS',
        IN_PROGRESS: 'IN_REVIEW',
        IN_REVIEW: 'COMPLETED'
      };
      const nextStatus = nextStatusMap[task.status];

      return `
        <div class="glass-card p-3.5 rounded-xl border border-slate-800 hover:border-slate-700 transition">
          <div class="flex items-center justify-between gap-2 mb-1.5">
            <span class="px-2 py-0.5 rounded ${effortBadge} text-[10px] font-bold">
              ${task.effortLevel} (${task.effortPoints} pts)
            </span>
            <span class="text-[10px] text-slate-500 font-mono">${task.priority}</span>
          </div>

          <div class="font-semibold text-white text-xs mb-1">${task.title}</div>
          <div class="text-[11px] text-slate-400 line-clamp-2 mb-2.5">${task.description || ''}</div>

          <div class="flex items-center justify-between text-[11px] text-slate-500 pt-2 border-t border-slate-800/80">
            <span class="text-sky-400 font-mono text-[10px]">${task.requiredSkill}</span>

            <div class="flex items-center gap-1.5">
              ${task.status !== 'COMPLETED' ? `
                <!-- Request Reassignment Button (R9.3) -->
                <button onclick="app.openRequestReassignmentModal('${task.id}', '${task.title.replace(/'/g, "\\'")}')" class="text-[10px] text-slate-400 hover:text-amber-400 font-mono underline" title="Request Reassignment">
                  Reassign?
                </button>
              ` : ''}

              ${nextStatus ? `
                <button onclick="app.updateTaskStatus('${task.id}', '${nextStatus}')" class="px-2 py-0.5 rounded bg-sky-500/20 hover:bg-sky-500/30 text-sky-300 border border-sky-500/30 font-medium text-[10px] transition">
                  → ${nextStatus.replace('_', ' ')}
                </button>
              ` : `
                <span class="text-emerald-400 font-bold text-[10px]">Done ✓</span>
              `}
            </div>
          </div>
        </div>
      `;
    }).join('');
  }

  // ==========================================
  // VIEW: ADMIN DASHBOARD (R8, Admin)
  // ==========================================
  async renderAdminDashboard() {
    const root = document.getElementById('appContainer');

    const stats = await this.apiCall('/admin/stats');
    const users = await this.apiCall('/admin/users');
    const logs = await this.apiCall('/admin/logs');

    root.innerHTML = `
      <div class="space-y-6">

        <!-- HEADER -->
        <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-800">
          <div>
            <div class="flex items-center gap-2">
              <h1 class="text-2xl font-bold tracking-tight text-white">System Administration</h1>
              <span class="px-2.5 py-0.5 rounded-full text-xs font-mono bg-purple-500/10 text-purple-400 border border-purple-500/20">Administrator</span>
            </div>
            <p class="text-xs text-slate-400 mt-1">User privileges, security roles, system performance & audit logging</p>
          </div>

          <div class="flex items-center gap-3">
            <a href="/api/admin/export-report" download class="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-medium transition flex items-center gap-1.5">
              <span>📥 Export System Report (JSON)</span>
            </a>
          </div>
        </div>

        <!-- STATS TILES -->
        <div class="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div class="glass-card p-4 rounded-2xl">
            <div class="text-xs text-slate-400">Total System Users</div>
            <div class="text-2xl font-bold text-white mt-1">${stats.totalUsers}</div>
            <div class="text-[11px] text-slate-500 mt-1">${stats.activeUsers} Active Accounts</div>
          </div>
          <div class="glass-card p-4 rounded-2xl">
            <div class="text-xs text-slate-400">Total Tasks Managed</div>
            <div class="text-2xl font-bold text-sky-400 mt-1">${stats.totalTasks}</div>
            <div class="text-[11px] text-slate-500 mt-1">${stats.taskStatusCounts.COMPLETED} Completed</div>
          </div>
          <div class="glass-card p-4 rounded-2xl">
            <div class="text-xs text-slate-400">Total Projects</div>
            <div class="text-2xl font-bold text-purple-400 mt-1">${stats.totalProjects}</div>
            <div class="text-[11px] text-slate-500 mt-1">Multi-tenant teams</div>
          </div>
          <div class="glass-card p-4 rounded-2xl">
            <div class="text-xs text-slate-400">Performance Ratings</div>
            <div class="text-2xl font-bold text-amber-400 mt-1">${stats.totalRatings}</div>
            <div class="text-[11px] text-slate-500 mt-1">Historical evaluations</div>
          </div>
        </div>

        <!-- USER ROLES MANAGEMENT TABLE -->
        <div class="glass-card p-6 rounded-2xl border border-slate-700/60">
          <h2 class="text-lg font-bold text-white mb-2">User Access & Role Management</h2>
          <p class="text-xs text-slate-400 mb-4">Grant Team Lead privileges, member access, or deactivate users</p>

          <div class="overflow-x-auto">
            <table class="w-full text-left text-xs">
              <thead class="bg-slate-900/80 text-slate-400 font-mono uppercase text-[10px] tracking-wider border-b border-slate-800">
                <tr>
                  <th class="py-3 px-3">User</th>
                  <th class="py-3 px-3">Role</th>
                  <th class="py-3 px-3">Active Workload</th>
                  <th class="py-3 px-3">Status</th>
                  <th class="py-3 px-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-slate-800">
                ${users.map(u => `
                  <tr class="hover:bg-slate-800/40 transition">
                    <td class="py-3 px-3">
                      <div class="font-semibold text-white">${u.name}</div>
                      <div class="text-[11px] text-slate-500 font-mono">${u.email}</div>
                    </td>
                    <td class="py-3 px-3">
                      <select onchange="app.changeUserRole('${u.id}', this.value)" class="bg-slate-900 border border-slate-700 rounded-lg px-2 py-1 text-xs text-slate-200">
                        <option value="MEMBER" ${u.role === 'MEMBER' ? 'selected' : ''}>Team Member</option>
                        <option value="TEAM_LEAD" ${u.role === 'TEAM_LEAD' ? 'selected' : ''}>Team Lead</option>
                        <option value="ADMIN" ${u.role === 'ADMIN' ? 'selected' : ''}>Admin</option>
                      </select>
                    </td>
                    <td class="py-3 px-3">
                      <span class="font-mono text-slate-300">${u.currentWorkloadPoints || 0} effort pts</span>
                    </td>
                    <td class="py-3 px-3">
                      <span class="px-2 py-0.5 rounded-full text-[10px] font-medium ${u.isActive !== false ? 'bg-emerald-500/20 text-emerald-300' : 'bg-rose-500/20 text-rose-300'}">
                        ${u.isActive !== false ? 'Active' : 'Disabled'}
                      </span>
                    </td>
                    <td class="py-3 px-3 text-right">
                      <button onclick="app.toggleUserStatus('${u.id}', ${u.isActive !== false ? 'false' : 'true'})" class="text-xs ${u.isActive !== false ? 'text-rose-400 hover:underline' : 'text-emerald-400 hover:underline'}">
                        ${u.isActive !== false ? 'Deactivate' : 'Activate'}
                      </button>
                    </td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
        </div>

        <!-- SYSTEM ACTIVITY AUDIT LOG -->
        <div class="glass-card p-6 rounded-2xl border border-slate-700/60">
          <h2 class="text-lg font-bold text-white mb-2">System Activity Audit Log</h2>
          <p class="text-xs text-slate-400 mb-4">Immutable trace of allocations, overrides, authentication, and status transitions</p>

          <div class="max-h-72 overflow-y-auto space-y-2 font-mono text-[11px]">
            ${logs.map(log => `
              <div class="p-2.5 bg-slate-900/60 border border-slate-800/80 rounded-xl flex items-center justify-between text-slate-300">
                <div class="flex items-center gap-3">
                  <span class="text-sky-400 font-bold">${log.action}</span>
                  <span class="text-slate-500 text-[10px]">${JSON.stringify(log.details || {})}</span>
                </div>
                <span class="text-slate-500 text-[10px] shrink-0">${new Date(log.timestamp).toLocaleTimeString()}</span>
              </div>
            `).join('')}
          </div>
        </div>

      </div>
    `;
  }

  // ==========================================
  // MODALS & ACTIONS
  // ==========================================

  // 1. SMART ALLOCATION RECOMMENDATION MODAL (R7)
  async openSmartAllocationModal(taskId) {
    const modal = document.getElementById('modalContainer');
    modal.innerHTML = `
      <div class="fixed inset-0 modal-backdrop flex items-center justify-center p-4">
        <div class="glass-card p-6 rounded-2xl max-w-2xl w-full border border-slate-700 shadow-2xl flex flex-col items-center justify-center py-12 text-slate-400">
          <div class="w-8 h-8 border-2 border-sky-500 border-t-transparent rounded-full animate-spin mb-3"></div>
          <p class="text-sm">Running NLP Skill Matching & Multi-Factor Allocation Engine...</p>
        </div>
      </div>
    `;

    try {
      const data = await this.apiCall(`/allocation/recommend/${taskId}`);
      const task = data;

      modal.innerHTML = `
        <div class="fixed inset-0 modal-backdrop flex items-center justify-center p-4">
          <div class="glass-card p-6 rounded-2xl max-w-2xl w-full border border-slate-700 shadow-2xl max-h-[90vh] overflow-y-auto">
            
            <div class="flex items-start justify-between pb-4 border-b border-slate-800">
              <div>
                <div class="flex items-center gap-2">
                  <span class="text-lg">🤖</span>
                  <h3 class="text-lg font-bold text-white">Intelligent Allocation Recommendations</h3>
                </div>
                <p class="text-xs text-slate-400 mt-1">Multi-factor recommendation based on NLP skills, history, workload & deadlines</p>
              </div>
              <button onclick="app.closeModal()" class="text-slate-400 hover:text-white text-lg">&times;</button>
            </div>

            <!-- Task Context Banner -->
            <div class="my-4 bg-slate-900/90 border border-slate-800 p-3.5 rounded-xl text-xs">
              <div class="font-bold text-white text-sm mb-1">${task.taskTitle}</div>
              <div class="flex items-center gap-3 text-slate-400 font-mono text-[11px]">
                <span>Required Skill: <strong class="text-sky-300">${task.requiredSkill}</strong></span>
                <span>Effort Points: <strong class="text-amber-300">${task.taskEffort} pts</strong></span>
              </div>
            </div>

            <!-- Candidate Rankings List -->
            <div class="space-y-3 my-4">
              <div class="text-xs font-mono uppercase text-slate-400 tracking-wider">Candidate Rankings:</div>
              ${task.recommendations.map((rec, index) => {
                const isBest = index === 0;
                return `
                  <div class="p-4 rounded-xl border ${isBest ? 'bg-sky-950/30 border-sky-500/40 shadow-lg shadow-sky-500/5' : 'bg-slate-900/40 border-slate-800'}">
                    <div class="flex items-start justify-between gap-3">
                      <div>
                        <div class="flex items-center gap-2">
                          <span class="font-bold text-white text-sm">${rec.candidateName}</span>
                          ${isBest ? `
                            <span class="px-2 py-0.5 rounded-full text-[10px] font-bold bg-sky-500/20 text-sky-300 border border-sky-500/40">
                              🏆 Top Recommendation
                            </span>
                          ` : ''}
                        </div>
                        <div class="text-[11px] text-slate-400 mt-1">${rec.recommendationReason}</div>
                      </div>

                      <div class="text-right">
                        <div class="text-xl font-extrabold ${isBest ? 'text-sky-400' : 'text-slate-300'} font-mono">
                          ${rec.matchPercentage}%
                        </div>
                        <div class="text-[10px] text-slate-500 uppercase font-mono">Fit Score</div>
                      </div>
                    </div>

                    <!-- NLP Skill Details -->
                    <div class="mt-3 pt-3 border-t border-slate-800/80 flex flex-wrap items-center justify-between gap-2 text-[11px]">
                      <div class="flex items-center gap-1.5">
                        <span class="text-slate-400">Matched Skills:</span>
                        ${rec.nlpDetails.matchedSkills.length > 0 ? rec.nlpDetails.matchedSkills.map(s => `
                          <span class="px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-300 text-[10px]">${s}</span>
                        `).join('') : '<span class="text-slate-500">None exact</span>'}
                      </div>

                      <div class="flex items-center gap-2">
                        <button onclick="app.assignTask('${task.taskId}', '${rec.candidateId}', false)" class="px-3 py-1.5 rounded-lg ${isBest ? 'bg-sky-500 hover:bg-sky-400 text-slate-950 font-bold' : 'bg-slate-800 hover:bg-slate-700 text-slate-200'} text-xs transition">
                          ${isBest ? 'Approve AI Assignment' : 'Assign to Candidate'}
                        </button>
                      </div>
                    </div>
                  </div>
                `;
              }).join('')}
            </div>

            <!-- Manual Override Option (R9.2) -->
            <div class="mt-4 pt-4 border-t border-slate-800 flex items-center justify-between">
              <span class="text-xs text-slate-400">Need manual managerial override?</span>
              <button onclick="app.promptManualOverride('${task.taskId}')" class="text-xs text-amber-400 hover:underline font-mono">
                Manual Override with Custom Justification →
              </button>
            </div>

          </div>
        </div>
      `;
    } catch (err) {
      this.closeModal();
      this.showToast(err.message, 'error');
    }
  }

  async assignTask(taskId, assigneeId, isOverride = false, overrideReason = null) {
    try {
      await this.apiCall('/allocation/assign', 'POST', {
        taskId,
        assigneeId,
        overrideReason: isOverride ? overrideReason : null
      });
      this.closeModal();
      this.showToast(isOverride ? 'Manual override applied.' : 'AI recommendation approved and assigned.', 'success');
      await this.refreshCurrentView();
    } catch (err) {
      this.showToast(err.message, 'error');
    }
  }

  promptManualOverride(taskId) {
    const reason = prompt('Enter managerial reason for overriding AI recommendation:');
    if (!reason) return;

    // Pick from current project members
    const memberOptions = (this.workloadData ? this.workloadData.memberDistribution : []).map((m, idx) => `${idx + 1}. ${m.name}`).join('\n');
    const pick = prompt(`Select member by number:\n${memberOptions}`);
    if (!pick) return;

    const index = parseInt(pick, 10) - 1;
    const selectedMember = this.workloadData.memberDistribution[index];
    if (selectedMember) {
      this.assignTask(taskId, selectedMember.userId, true, reason);
    }
  }

  // 2. BASELINE ALLOCATION ACTION (R4)
  async runBaselineAllocation() {
    if (!confirm('Run Balanced Baseline Allocation? This will distribute all unassigned tasks randomly across team members while strictly equalizing total effort points.')) {
      return;
    }

    try {
      const res = await this.apiCall('/allocation/baseline', 'POST', { projectId: this.selectedProjectId });
      this.showToast(res.message, 'success');
      await this.refreshCurrentView();
    } catch (err) {
      this.showToast(err.message, 'error');
    }
  }

  // 3. TASK CREATION MODAL (R3)
  openCreateTaskModal() {
    const modal = document.getElementById('modalContainer');
    modal.innerHTML = `
      <div class="fixed inset-0 modal-backdrop flex items-center justify-center p-4">
        <div class="glass-card p-6 rounded-2xl max-w-lg w-full border border-slate-700 shadow-2xl">
          <div class="flex items-center justify-between pb-3 border-b border-slate-800 mb-4">
            <h3 class="text-base font-bold text-white">Create New Task</h3>
            <button onclick="app.closeModal()" class="text-slate-400 hover:text-white">&times;</button>
          </div>

          <form onsubmit="event.preventDefault(); app.handleCreateTaskSubmit(this);" class="space-y-4 text-xs">
            <div>
              <label class="block text-slate-300 font-medium mb-1">Task Title</label>
              <input name="title" required class="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white text-xs focus:outline-none focus:border-sky-500" placeholder="e.g. Implement OAuth2 Refresh Token Flow">
            </div>
            <div>
              <label class="block text-slate-300 font-medium mb-1">Description</label>
              <textarea name="description" rows="3" class="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white text-xs focus:outline-none focus:border-sky-500" placeholder="Provide task context, requirements, and acceptance criteria..."></textarea>
            </div>
            <div class="grid grid-cols-2 gap-3">
              <div>
                <label class="block text-slate-300 font-medium mb-1">Required Skill</label>
                <input name="requiredSkill" class="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white text-xs focus:outline-none focus:border-sky-500" placeholder="e.g. react, node.js, docker">
              </div>
              <div>
                <label class="block text-slate-300 font-medium mb-1">Effort Level (Workload)</label>
                <select name="effortLevel" class="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white text-xs focus:outline-none focus:border-sky-500">
                  <option value="LOW">Low (1 Point)</option>
                  <option value="MEDIUM" selected>Medium (3 Points)</option>
                  <option value="HIGH">High (5 Points)</option>
                </select>
              </div>
            </div>
            <div class="grid grid-cols-2 gap-3">
              <div>
                <label class="block text-slate-300 font-medium mb-1">Priority</label>
                <select name="priority" class="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white text-xs focus:outline-none focus:border-sky-500">
                  <option value="LOW">Low</option>
                  <option value="MEDIUM" selected>Medium</option>
                  <option value="HIGH">High</option>
                  <option value="CRITICAL">Critical</option>
                </select>
              </div>
              <div>
                <label class="block text-slate-300 font-medium mb-1">Deadline Date</label>
                <input name="deadline" type="date" class="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white text-xs focus:outline-none focus:border-sky-500">
              </div>
            </div>

            <div class="pt-2 flex justify-end gap-2">
              <button type="button" onclick="app.closeModal()" class="px-3 py-2 rounded-xl bg-slate-800 text-slate-300 hover:bg-slate-700">Cancel</button>
              <button type="submit" class="px-4 py-2 rounded-xl bg-sky-500 hover:bg-sky-400 text-slate-950 font-bold">Create Task</button>
            </div>
          </form>
        </div>
      </div>
    `;
  }

  async handleCreateTaskSubmit(form) {
    try {
      await this.apiCall('/tasks', 'POST', {
        title: form.title.value,
        description: form.description.value,
        projectId: this.selectedProjectId,
        requiredSkill: form.requiredSkill.value,
        effortLevel: form.effortLevel.value,
        priority: form.priority.value,
        deadline: form.deadline.value ? new Date(form.deadline.value).toISOString() : null
      });
      this.closeModal();
      this.showToast('Task created successfully.', 'success');
      await this.refreshCurrentView();
    } catch (err) {
      this.showToast(err.message, 'error');
    }
  }

  // 4. RATE COMPLETED TASK MODAL (R6)
  openRateTaskModal(taskId) {
    const modal = document.getElementById('modalContainer');
    modal.innerHTML = `
      <div class="fixed inset-0 modal-backdrop flex items-center justify-center p-4">
        <div class="glass-card p-6 rounded-2xl max-w-md w-full border border-slate-700 shadow-2xl">
          <div class="flex items-center justify-between pb-3 border-b border-slate-800 mb-4">
            <h3 class="text-base font-bold text-white">Rate Completed Task</h3>
            <button onclick="app.closeModal()" class="text-slate-400 hover:text-white">&times;</button>
          </div>

          <form onsubmit="event.preventDefault(); app.handleRateTaskSubmit(this, '${taskId}');" class="space-y-4 text-xs">
            <div>
              <label class="block text-slate-300 font-medium mb-1">Performance Rating</label>
              <select name="rating" class="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white text-xs focus:outline-none focus:border-sky-500">
                <option value="ABOVE_AVERAGE">Above Average (1.25x Multiplier)</option>
                <option value="AVERAGE" selected>Average (1.0x Multiplier)</option>
                <option value="BELOW_AVERAGE">Below Average (0.75x Multiplier)</option>
              </select>
            </div>
            <div>
              <label class="block text-slate-300 font-medium mb-1">Qualitative Feedback</label>
              <textarea name="feedback" rows="3" class="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white text-xs focus:outline-none focus:border-sky-500" placeholder="e.g. Delivered code ahead of schedule, comprehensive unit test coverage..."></textarea>
            </div>

            <div class="pt-2 flex justify-end gap-2">
              <button type="button" onclick="app.closeModal()" class="px-3 py-2 rounded-xl bg-slate-800 text-slate-300 hover:bg-slate-700">Cancel</button>
              <button type="submit" class="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold">Submit Rating</button>
            </div>
          </form>
        </div>
      </div>
    `;
  }

  async handleRateTaskSubmit(form, taskId) {
    try {
      await this.apiCall('/performance/rate', 'POST', {
        taskId,
        rating: form.rating.value,
        feedback: form.feedback.value
      });
      this.closeModal();
      this.showToast('Performance rating recorded.', 'success');
      await this.refreshCurrentView();
    } catch (err) {
      this.showToast(err.message, 'error');
    }
  }

  // 5. REASSIGNMENT REQUEST MODAL (R9.3)
  openRequestReassignmentModal(taskId, taskTitle) {
    const modal = document.getElementById('modalContainer');
    modal.innerHTML = `
      <div class="fixed inset-0 modal-backdrop flex items-center justify-center p-4">
        <div class="glass-card p-6 rounded-2xl max-w-md w-full border border-slate-700 shadow-2xl">
          <div class="flex items-center justify-between pb-3 border-b border-slate-800 mb-4">
            <h3 class="text-base font-bold text-white">Request Task Reassignment</h3>
            <button onclick="app.closeModal()" class="text-slate-400 hover:text-white">&times;</button>
          </div>

          <p class="text-xs text-slate-400 mb-3">Task: <strong class="text-white">${taskTitle}</strong></p>

          <form onsubmit="event.preventDefault(); app.handleReassignmentRequestSubmit(this, '${taskId}');" class="space-y-4 text-xs">
            <div>
              <label class="block text-slate-300 font-medium mb-1">Reason for Reassignment Request</label>
              <textarea name="reason" required rows="3" class="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white text-xs focus:outline-none focus:border-sky-500" placeholder="Explain reason (e.g. Current sprint overload, unfamiliar with specialized tech stack, conflicting deadline)..."></textarea>
            </div>

            <div class="pt-2 flex justify-end gap-2">
              <button type="button" onclick="app.closeModal()" class="px-3 py-2 rounded-xl bg-slate-800 text-slate-300 hover:bg-slate-700">Cancel</button>
              <button type="submit" class="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold">Submit Request</button>
            </div>
          </form>
        </div>
      </div>
    `;
  }

  async handleReassignmentRequestSubmit(form, taskId) {
    try {
      await this.apiCall('/reassignment/request', 'POST', {
        taskId,
        reason: form.reason.value
      });
      this.closeModal();
      this.showToast('Reassignment request sent to Team Lead.', 'info');
      await this.refreshCurrentView();
    } catch (err) {
      this.showToast(err.message, 'error');
    }
  }

  // 6. REVIEW REASSIGNMENTS MODAL (R9.4)
  openReviewReassignmentsModal() {
    const modal = document.getElementById('modalContainer');
    modal.innerHTML = `
      <div class="fixed inset-0 modal-backdrop flex items-center justify-center p-4">
        <div class="glass-card p-6 rounded-2xl max-w-xl w-full border border-slate-700 shadow-2xl max-h-[85vh] overflow-y-auto">
          <div class="flex items-center justify-between pb-3 border-b border-slate-800 mb-4">
            <h3 class="text-base font-bold text-white">Pending Reassignment Requests</h3>
            <button onclick="app.closeModal()" class="text-slate-400 hover:text-white">&times;</button>
          </div>

          <div class="space-y-3">
            ${this.pendingReassignments.map(r => `
              <div class="p-4 bg-slate-900 border border-slate-800 rounded-xl text-xs space-y-2">
                <div class="flex items-center justify-between">
                  <span class="font-bold text-white">${r.taskTitle}</span>
                  <span class="text-slate-500 font-mono text-[10px]">${new Date(r.createdAt).toLocaleDateString()}</span>
                </div>
                <div class="text-slate-300">Requested by: <strong class="text-sky-300">${r.requesterName}</strong></div>
                <div class="p-2.5 bg-slate-950 rounded-lg text-slate-400 italic">
                  "${r.reason}"
                </div>
                <div class="flex items-center justify-end gap-2 pt-2">
                  <button onclick="app.actionReassignment('${r.id}', 'REJECT')" class="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-rose-300 font-medium">Reject</button>
                  <button onclick="app.actionReassignment('${r.id}', 'APPROVE')" class="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold">Approve Reassignment</button>
                </div>
              </div>
            `).join('')}
          </div>
        </div>
      </div>
    `;
  }

  async actionReassignment(requestId, action) {
    try {
      const res = await this.apiCall(`/reassignment/${requestId}/action`, 'POST', { action });
      this.closeModal();
      this.showToast(res.message, 'success');
      await this.refreshCurrentView();
    } catch (err) {
      this.showToast(err.message, 'error');
    }
  }

  // 7. EDIT SKILL PROFILE MODAL (R5.1, R5.2)
  openSkillProfileModal() {
    const modal = document.getElementById('modalContainer');
    modal.innerHTML = `
      <div class="fixed inset-0 modal-backdrop flex items-center justify-center p-4">
        <div class="glass-card p-6 rounded-2xl max-w-lg w-full border border-slate-700 shadow-2xl">
          <div class="flex items-center justify-between pb-3 border-b border-slate-800 mb-4">
            <h3 class="text-base font-bold text-white">Edit Skill Profile & Bio (NLP)</h3>
            <button onclick="app.closeModal()" class="text-slate-400 hover:text-white">&times;</button>
          </div>

          <form onsubmit="event.preventDefault(); app.handleProfileSubmit(this);" class="space-y-4 text-xs">
            <div>
              <label class="block text-slate-300 font-medium mb-1">Free-Text Technical Bio / Skills</label>
              <textarea id="profileBioText" name="bio" rows="4" class="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white text-xs focus:outline-none focus:border-sky-500" placeholder="Describe your languages, frameworks, databases, and architectural experience in free natural language...">${this.currentUser.bio || ''}</textarea>
            </div>

            <!-- NLP Trigger Button -->
            <div class="flex items-center justify-between">
              <button type="button" onclick="app.triggerNlpAnalysis()" class="px-3 py-1.5 rounded-lg bg-sky-500/20 text-sky-300 border border-sky-500/30 text-xs font-semibold hover:bg-sky-500/30 transition flex items-center gap-1.5">
                <span>⚡ Test NLP Skill Extraction</span>
              </button>
              <span id="nlpLoadingIndicator" class="hidden text-[11px] text-sky-400 animate-pulse">Analyzing...</span>
            </div>

            <div id="nlpPreviewSection" class="p-3 bg-slate-900/90 border border-slate-800 rounded-xl">
              <div class="text-[11px] text-slate-400 font-mono mb-1.5">Extracted Skills:</div>
              <div id="nlpSkillBadges" class="flex flex-wrap gap-1.5">
                ${(this.currentUser.skills || []).map(s => `
                  <span class="px-2 py-0.5 rounded bg-slate-800 text-sky-300 font-mono text-[10px]">${s}</span>
                `).join('')}
              </div>
            </div>

            <div class="pt-2 flex justify-end gap-2">
              <button type="button" onclick="app.closeModal()" class="px-3 py-2 rounded-xl bg-slate-800 text-slate-300 hover:bg-slate-700">Cancel</button>
              <button type="submit" class="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold">Save Profile</button>
            </div>
          </form>
        </div>
      </div>
    `;
  }

  async triggerNlpAnalysis() {
    const text = document.getElementById('profileBioText').value;
    const indicator = document.getElementById('nlpLoadingIndicator');
    const container = document.getElementById('nlpSkillBadges');

    if (!text) {
      this.showToast('Please enter some text in the bio area first.', 'info');
      return;
    }

    indicator.classList.remove('hidden');
    try {
      const res = await this.apiCall('/users/analyze-skills', 'POST', { text });
      indicator.classList.add('hidden');
      if (res.extracted_skills && res.extracted_skills.length > 0) {
        container.innerHTML = res.extracted_skills.map(s => `
          <span class="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-mono text-[10px]">${s}</span>
        `).join('');
      } else {
        container.innerHTML = `<span class="text-slate-500 text-[10px]">No recognized technical skills found.</span>`;
      }
    } catch (err) {
      indicator.classList.add('hidden');
      this.showToast(err.message, 'error');
    }
  }

  async handleProfileSubmit(form) {
    try {
      const res = await this.apiCall('/users/profile', 'PUT', { bio: form.bio.value });
      this.currentUser = res.user;
      this.closeModal();
      this.showToast('Profile and skills updated.', 'success');
      await this.refreshCurrentView();
    } catch (err) {
      this.showToast(err.message, 'error');
    }
  }

  // 8. UPDATE TASK STATUS (R3.6)
  async updateTaskStatus(taskId, status) {
    try {
      await this.apiCall(`/tasks/${taskId}/status`, 'PUT', { status });
      this.showToast(`Task status updated to ${status}.`, 'success');
      await this.refreshCurrentView();
    } catch (err) {
      this.showToast(err.message, 'error');
    }
  }

  // 9. DELETE TASK
  async deleteTask(taskId) {
    if (!confirm('Are you sure you want to delete this task?')) return;
    try {
      await this.apiCall(`/tasks/${taskId}`, 'DELETE');
      this.showToast('Task deleted.', 'info');
      await this.refreshCurrentView();
    } catch (err) {
      this.showToast(err.message, 'error');
    }
  }

  // 10. ADMIN ACTIONS
  async changeUserRole(userId, newRole) {
    try {
      await this.apiCall(`/admin/users/${userId}`, 'PUT', { role: newRole });
      this.showToast('User role updated.', 'success');
    } catch (err) {
      this.showToast(err.message, 'error');
    }
  }

  async toggleUserStatus(userId, isActive) {
    try {
      await this.apiCall(`/admin/users/${userId}`, 'PUT', { isActive });
      this.showToast(`User ${isActive ? 'activated' : 'deactivated'}.`, 'info');
      await this.refreshCurrentView();
    } catch (err) {
      this.showToast(err.message, 'error');
    }
  }

  // 11. CREATE PROJECT MODAL (R2)
  openCreateProjectModal() {
    const modal = document.getElementById('modalContainer');
    modal.innerHTML = `
      <div class="fixed inset-0 modal-backdrop flex items-center justify-center p-4">
        <div class="glass-card p-6 rounded-2xl max-w-md w-full border border-slate-700 shadow-2xl">
          <div class="flex items-center justify-between pb-3 border-b border-slate-800 mb-4">
            <h3 class="text-base font-bold text-white">Create New Project</h3>
            <button onclick="app.closeModal()" class="text-slate-400 hover:text-white">&times;</button>
          </div>

          <form onsubmit="event.preventDefault(); app.handleCreateProjectSubmit(this);" class="space-y-4 text-xs">
            <div>
              <label class="block text-slate-300 font-medium mb-1">Project Name</label>
              <input name="name" required class="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white text-xs focus:outline-none focus:border-sky-500" placeholder="e.g. NextGen Microservices Platform">
            </div>
            <div>
              <label class="block text-slate-300 font-medium mb-1">Description</label>
              <textarea name="description" rows="3" class="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white text-xs focus:outline-none focus:border-sky-500" placeholder="Brief project overview..."></textarea>
            </div>
            <div>
              <label class="block text-slate-300 font-medium mb-1">Deadline</label>
              <input name="deadline" type="date" class="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white text-xs focus:outline-none focus:border-sky-500">
            </div>

            <div class="pt-2 flex justify-end gap-2">
              <button type="button" onclick="app.closeModal()" class="px-3 py-2 rounded-xl bg-slate-800 text-slate-300 hover:bg-slate-700">Cancel</button>
              <button type="submit" class="px-4 py-2 rounded-xl bg-sky-500 hover:bg-sky-400 text-slate-950 font-bold">Create Project</button>
            </div>
          </form>
        </div>
      </div>
    `;
  }

  async handleCreateProjectSubmit(form) {
    try {
      const res = await this.apiCall('/projects', 'POST', {
        name: form.name.value,
        description: form.description.value,
        deadline: form.deadline.value ? new Date(form.deadline.value).toISOString() : null,
        memberIds: ['usr_anantam', 'usr_shivam', 'usr_golu', 'usr_rick'] // auto-assign core members
      });
      this.closeModal();
      this.projects.push(res.project);
      this.selectedProjectId = res.project.id;
      this.showToast('Project created.', 'success');
      await this.refreshCurrentView();
    } catch (err) {
      this.showToast(err.message, 'error');
    }
  }

  closeModal() {
    const modal = document.getElementById('modalContainer');
    modal.innerHTML = '';
  }
}

// Global instance
const app = new TaskManagementApp();

