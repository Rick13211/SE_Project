import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_FILE = path.join(__dirname, '../data/database.json');

// Ensure directory exists
const dataDir = path.dirname(DATA_FILE);
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

// Initial default schema structure
const defaultData = {
  users: [],
  projects: [],
  tasks: [],
  assignment_history: [],
  reassignment_requests: [],
  performance_ratings: [],
  system_logs: []
};

class Database {
  constructor() {
    this.init();
  }

  init() {
    if (!fs.existsSync(DATA_FILE)) {
      this.save(defaultData);
    }
  }

  read() {
    try {
      if (!fs.existsSync(DATA_FILE)) {
        return { ...defaultData };
      }
      const raw = fs.readFileSync(DATA_FILE, 'utf-8');
      return JSON.parse(raw);
    } catch (err) {
      console.error('Error reading database file, resetting to defaults:', err);
      return { ...defaultData };
    }
  }

  save(data) {
    const tmpFile = `${DATA_FILE}.tmp`;
    fs.writeFileSync(tmpFile, JSON.stringify(data, null, 2), 'utf-8');
    fs.renameSync(tmpFile, DATA_FILE); // Atomic write
  }

  get(collectionName) {
    const data = this.read();
    return data[collectionName] || [];
  }

  findById(collectionName, id) {
    const items = this.get(collectionName);
    return items.find(item => item.id === id) || null;
  }

  findOne(collectionName, predicate) {
    const items = this.get(collectionName);
    return items.find(predicate) || null;
  }

  filter(collectionName, predicate) {
    const items = this.get(collectionName);
    return items.filter(predicate);
  }

  insert(collectionName, item) {
    const data = this.read();
    if (!data[collectionName]) {
      data[collectionName] = [];
    }
    data[collectionName].push(item);
    this.save(data);
    return item;
  }

  update(collectionName, id, updates) {
    const data = this.read();
    const items = data[collectionName] || [];
    const index = items.findIndex(item => item.id === id);
    if (index === -1) return null;

    items[index] = { ...items[index], ...updates, updatedAt: new Date().toISOString() };
    data[collectionName] = items;
    this.save(data);
    return items[index];
  }

  delete(collectionName, id) {
    const data = this.read();
    const items = data[collectionName] || [];
    const filtered = items.filter(item => item.id !== id);
    data[collectionName] = filtered;
    this.save(data);
    return filtered.length !== items.length;
  }

  logActivity(userId, action, details) {
    this.insert('system_logs', {
      id: `log_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
      userId,
      action,
      details,
      timestamp: new Date().toISOString()
    });
  }
}

export const db = new Database();

