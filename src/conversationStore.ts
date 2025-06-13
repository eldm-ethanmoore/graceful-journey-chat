import Dexie from "dexie"
import type { Table } from "dexie"

export interface Branch {
  id: string
  name: string
  parentId?: string
  messages: Message[]
  createdAt: Date
  summary?: string
}

export interface Message {
  id: string
  role: "user" | "assistant"
  content: string
  timestamp: Date
  attestation?: any
}

export interface Snapshot {
  id: string
  branchId: string
  messages: Message[]
  timestamp: Date
  description?: string
}

class ConversationDatabase extends Dexie {
  branches!: Table<Branch>
  snapshots!: Table<Snapshot>

  constructor() {
    super("GracefulJourneyDB")
    this.version(1).stores({
      branches: "id, parentId, createdAt",
      snapshots: "id, branchId, timestamp",
    })
  }
}

export const db = new ConversationDatabase()

export class ConversationStore {
  // Event listeners for sync
  private static listeners: (() => void)[] = [];
  static async createBranch(name: string, parentMessages: Message[], parentBranchId?: string): Promise<Branch> {
    const branch: Branch = {
      id: `branch-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      name,
      parentId: parentBranchId,
      messages: [...parentMessages],
      createdAt: new Date(),
    }

    await db.branches.add(branch)
    return branch
  }

  static async createSnapshot(branchId: string, messages: Message[], description?: string): Promise<Snapshot> {
    const snapshot: Snapshot = {
      id: `snapshot-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      branchId,
      messages: [...messages],
      timestamp: new Date(),
      description,
    }

    await db.snapshots.add(snapshot)
    return snapshot
  }

  static async getAllBranches(): Promise<Branch[]> {
    return await db.branches.toArray()
  }

  static async getBranch(id: string): Promise<Branch | undefined> {
    return await db.branches.get(id)
  }

  static async updateBranch(id: string, messages: Message[]): Promise<void> {
    await db.branches.update(id, { messages })
  }

  static async getBranchSnapshots(branchId: string): Promise<Snapshot[]> {
    return await db.snapshots.where("branchId").equals(branchId).toArray()
  }

  static async generateSummary(messages: Message[]): Promise<string> {
    if (messages.length === 0) return "No messages yet"

    const topics = messages
      .filter((m) => m.role === "user")
      .map((m) => m.content.substring(0, 50))
      .join(", ")

    return `Discussed: ${topics}...`
  }

  static async mergeBranches(sourceBranchId: string, targetBranchId: string): Promise<Branch> {
    const source = await db.branches.get(sourceBranchId)
    const target = await db.branches.get(targetBranchId)

    if (!source || !target) {
      throw new Error("Branch not found")
    }

    const mergedBranch: Branch = {
      id: `branch-merged-${Date.now()}`,
      name: `Merged: ${source.name} + ${target.name}`,
      parentId: targetBranchId,
      messages: [...target.messages, ...source.messages],
      createdAt: new Date(),
      summary: `Merged from ${source.name} into ${target.name}`,
    }

    await db.branches.add(mergedBranch)
    return mergedBranch
  }

  static exportAsMarkdown(messages: Message[]): string {
    let markdown = "# Conversation Export\n\n"

    messages.forEach((msg) => {
      markdown += `## ${msg.role === "user" ? "👤 User" : "🤖 Assistant"}\n`
      markdown += `*${msg.timestamp.toLocaleString()}*\n\n`
      markdown += `${msg.content}\n\n`
      markdown += "---\n\n"
    })

    return markdown
  }
  
  /**
   * Get all snapshots (not just for a specific branch)
   * @returns Promise resolving to all snapshots
   */
  static async getAllSnapshots(): Promise<Snapshot[]> {
    return await db.snapshots.toArray();
  }
  
  /**
   * Import branches from another device
   * @param branches Branches to import
   */
  static async importBranches(branches: Branch[]): Promise<void> {
    // For each branch, check if it already exists
    for (const branch of branches) {
      const existingBranch = await db.branches.get(branch.id);
      
      if (!existingBranch) {
        // If branch doesn't exist, add it
        await db.branches.add(branch);
      } else {
        // If branch exists, merge messages
        const mergedMessages = [...existingBranch.messages];
        
        // Add messages that don't already exist
        for (const message of branch.messages) {
          if (!mergedMessages.some(m => m.id === message.id)) {
            mergedMessages.push(message);
          }
        }
        
        // Sort messages by timestamp
        mergedMessages.sort((a, b) =>
          new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
        );
        
        // Update the branch
        await db.branches.update(existingBranch.id, {
          messages: mergedMessages,
          // Take the most recent metadata
          name: branch.createdAt > existingBranch.createdAt ? branch.name : existingBranch.name,
          summary: branch.summary || existingBranch.summary
        });
      }
    }
    
    // Notify listeners
    this.notifyListeners();
  }
  
  /**
   * Import snapshots from another device
   * @param snapshots Snapshots to import
   */
  static async importSnapshots(snapshots: Snapshot[]): Promise<void> {
    // For each snapshot, check if it already exists
    for (const snapshot of snapshots) {
      const existingSnapshot = await db.snapshots.get(snapshot.id);
      
      if (!existingSnapshot) {
        // If snapshot doesn't exist, add it
        await db.snapshots.add(snapshot);
      }
      // For snapshots, we don't merge - they're immutable
    }
    
    // Notify listeners
    this.notifyListeners();
  }
  
  /**
   * Register a listener for changes
   * @param callback Callback to call when changes occur
   */
  static listenForChanges(callback: () => void): void {
    this.listeners.push(callback);
    
    // Set up hooks for database changes
    db.branches.hook('creating', () => this.notifyListeners());
    db.branches.hook('updating', () => this.notifyListeners());
    db.snapshots.hook('creating', () => this.notifyListeners());
  }
  
  /**
   * Remove a listener
   * @param callback Callback to remove
   */
  static removeListener(callback: () => void): void {
    const index = this.listeners.indexOf(callback);
    if (index !== -1) {
      this.listeners.splice(index, 1);
    }
  }
  
  /**
   * Notify all listeners of changes
   */
  private static notifyListeners(): void {
    for (const listener of this.listeners) {
      listener();
    }
  }
}
