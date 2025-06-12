import Dexie from 'dexie';
import type { Table } from 'dexie';

export interface Branch {
  id: string;
  name: string;
  parentId?: string;
  messages: Message[];
  createdAt: Date;
  summary?: string;
}

export interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  attestation?: any;
}

export interface Snapshot {
  id: string;
  branchId: string;
  messages: Message[];
  timestamp: Date;
  description?: string;
}

class ConversationDatabase extends Dexie {
  branches!: Table<Branch>;
  snapshots!: Table<Snapshot>;

  constructor() {
    super('GracefulJourneyDB');
    this.version(1).stores({
      branches: 'id, parentId, createdAt',
      snapshots: 'id, branchId, timestamp'
    });
  }
}

// Only create the database in the browser environment
let db: ConversationDatabase;

if (typeof window !== 'undefined') {
  db = new ConversationDatabase();
}

export { db };

export class ConversationStore {
  // Create a new branch from current point
  static async createBranch(name: string, parentMessages: Message[], parentBranchId?: string): Promise<Branch> {
    const branch: Branch = {
      id: `branch-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      name,
      parentId: parentBranchId,
      messages: [...parentMessages],
      createdAt: new Date()
    };
    
    await db.branches.add(branch);
    return branch;
  }

  // Save a snapshot of current conversation
  static async createSnapshot(branchId: string, messages: Message[], description?: string): Promise<Snapshot> {
    const snapshot: Snapshot = {
      id: `snapshot-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      branchId,
      messages: [...messages],
      timestamp: new Date(),
      description
    };
    
    await db.snapshots.add(snapshot);
    return snapshot;
  }

  // Get all branches
  static async getAllBranches(): Promise<Branch[]> {
    return await db.branches.toArray();
  }

  // Get branch by ID
  static async getBranch(id: string): Promise<Branch | undefined> {
    return await db.branches.get(id);
  }

  // Update branch messages
  static async updateBranch(id: string, messages: Message[]): Promise<void> {
    await db.branches.update(id, { messages });
  }

  // Get snapshots for a branch
  static async getBranchSnapshots(branchId: string): Promise<Snapshot[]> {
    return await db.snapshots.where('branchId').equals(branchId).toArray();
  }

  // Generate AI summary for a conversation
  static async generateSummary(messages: Message[]): Promise<string> {
    if (messages.length === 0) return 'No messages yet';
    
    // Simple summary for now - in production, use AI
    const topics = messages
      .filter(m => m.role === 'user')
      .map(m => m.content.substring(0, 50))
      .join(', ');
    
    return `Discussed: ${topics}...`;
  }

  // Merge branches (combine conversation histories)
  static async mergeBranches(sourceBranchId: string, targetBranchId: string): Promise<Branch> {
    const source = await db.branches.get(sourceBranchId);
    const target = await db.branches.get(targetBranchId);
    
    if (!source || !target) {
      throw new Error('Branch not found');
    }

    // Create a new branch that combines both histories
    const mergedBranch: Branch = {
      id: `branch-merged-${Date.now()}`,
      name: `Merged: ${source.name} + ${target.name}`,
      parentId: targetBranchId,
      messages: [...target.messages, ...source.messages],
      createdAt: new Date(),
      summary: `Merged from ${source.name} into ${target.name}`
    };

    await db.branches.add(mergedBranch);
    return mergedBranch;
  }

  // Export conversation as markdown
  static exportAsMarkdown(messages: Message[]): string {
    let markdown = '# Conversation Export\n\n';
    
    messages.forEach(msg => {
      markdown += `## ${msg.role === 'user' ? '👤 User' : '🤖 Assistant'}\n`;
      markdown += `*${msg.timestamp.toLocaleString()}*\n\n`;
      markdown += `${msg.content}\n\n`;
      markdown += '---\n\n';
    });
    
    return markdown;
  }
}