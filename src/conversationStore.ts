import Dexie from "dexie";
import type { Table } from "dexie";
import { secureStorage } from "./utils/secureStorage";

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
  role: "user" | "assistant";
  content: string | Array<{ type: "text"; text: string } | { type: "image_url"; image_url: { url: string } }>;
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
    super("GracefulJourneyDB");
    this.version(1).stores({
      branches: "id, parentId, createdAt",
      snapshots: "id, branchId, timestamp",
    });
  }
}

export const db = new ConversationDatabase();

export class ConversationStore {
  // API Keys
  private static redPillApiKey: string | null = secureStorage.get("redpill_api_key");
  private static openRouterApiKey: string | null = secureStorage.get("openrouter_api_key");

  // Models
  private static teeModels = [
    { id: "phala/llama-3.3-70b-instruct", name: "Llama 3.3 70B", description: "Fast & multilingual" },
    { id: "phala/deepseek-r1-70b", name: "DeepSeek R1 70B", description: "Advanced reasoning" },
    { id: "phala/qwen-2.5-7b-instruct", name: "Qwen 2.5 7B", description: "Efficient & capable" },
  ];
  private static openRouterModels = [
    { id: "openai/gpt-4o", name: "OpenAI GPT-4o", description: "The latest and greatest from OpenAI", supportsAttachments: true },
    { id: "google/gemini-2.5-flash-preview-05-20", name: "Google Gemini 2.5 Flash (Preview)", description: "The latest flash model from Google", supportsAttachments: true },
    { id: "perplexity/sonar-deep-research", name: "Perplexity Sonar Deep Research", description: "For deep, research-based queries", supportsAttachments: false },
  ];

  // Event listeners for sync
  private static listeners: (() => void)[] = [];

  static getAvailableModels(): { id: string; name: string; description: string; supportsAttachments?: boolean }[] {
    const models = [];
    if (this.redPillApiKey) {
      models.push(...this.teeModels);
    }
    if (this.openRouterApiKey) {
      models.push(...this.openRouterModels);
    }
    return models;
  }

  static isRedPillModel(modelId: string): boolean {
    return this.teeModels.some(model => model.id === modelId);
  }

  static setRedPillApiKey(key: string | null): void {
    if (key) {
      secureStorage.set("redpill_api_key", key);
      this.redPillApiKey = key;
    } else {
      secureStorage.remove("redpill_api_key");
      this.redPillApiKey = null;
    }
    this.notifyListeners();
  }

  static setOpenRouterApiKey(key: string | null): void {
    if (key) {
      secureStorage.set("openrouter_api_key", key);
      this.openRouterApiKey = key;
    } else {
      secureStorage.remove("openrouter_api_key");
      this.openRouterApiKey = null;
    }
    this.notifyListeners();
  }

  static getRedPillApiKey(): string | null {
    return this.redPillApiKey;
  }

  static getOpenRouterApiKey(): string | null {
    return this.openRouterApiKey;
  }

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

  static async renameBranch(id: string, newName: string): Promise<void> {
    await db.branches.update(id, { name: newName });
    this.notifyListeners();
  }

  static async deleteBranch(id: string): Promise<void> {
    const allBranches = await this.getAllBranches();
    const branchMap = new Map(allBranches.map(b => [b.id, b]));
    const childrenToDelete = new Set<string>();

    const findChildren = (parentId: string) => {
      for (const branch of allBranches) {
        if (branch.parentId === parentId) {
          childrenToDelete.add(branch.id);
          findChildren(branch.id);
        }
      }
    };

    findChildren(id);

    const idsToDelete = [id, ...childrenToDelete];

    await db.transaction('rw', db.branches, db.snapshots, async () => {
      await db.branches.bulkDelete(idsToDelete);
      await db.snapshots.where('branchId').anyOf(idsToDelete).delete();
    });

    this.notifyListeners();
  }

  static async getBranchSnapshots(branchId: string): Promise<Snapshot[]> {
    return await db.snapshots.where("branchId").equals(branchId).toArray()
  }

  static async generateSummary(messages: Message[]): Promise<string> {
    if (messages.length === 0) return "No messages yet"

    const topics = messages
      .filter((m) => m.role === "user")
      .map((m) => {
        if (typeof m.content === 'string') {
          return m.content.substring(0, 50);
        } else if (Array.isArray(m.content)) {
          const textPart = m.content.find(part => part.type === 'text');
          return textPart ? textPart.text.substring(0, 50) : '[image]';
        }
        return '';
      })
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

  static generateSystemPrompt(messages: Message[]): string {
    const systemContent = `CRITICAL INSTRUCTION - TIMESTAMPS:
DO NOT MENTION OR USE TIMESTAMP DATA UNLESS EXPLICITLY REQUESTED BY THE USER.
This is a strict requirement. Never reference times, dates, or message history unprompted.
Never include phrases like "based on our conversation at [time]" or "as you mentioned earlier at [time]".
Violation of this instruction is considered a serious error.

You are an AI assistant in a chat application. This is ${messages.length > 0 ?
        "a continuing conversation." : "the beginning of a new conversation."}
        
ONLY IF THE USER EXPLICITLY ASKS about previous messages or time-related information:
1. Each message includes a timestamp in the format [TIME: MM/DD/YYYY, HH:MM:SS AM/PM]
2. When (and only when) the user specifically asks about previous messages from specific times or time ranges, you should:
   - Identify the time references in their query (e.g., "5:30pm", "earlier today", "few minutes ago")
   - Find relevant messages from those times by looking at the timestamps
   - Summarize or quote those messages accurately
   - Include the exact timestamps when referencing messages
3. Handle natural language time expressions only when directly asked, like:
   - "What did we discuss earlier?"
   - "Show me what I said about X around 5pm"
   - "What were we talking about 20 minutes ago?"
   - "What did I ask yesterday?"
        
        The current conversation has ${messages.length} previous messages.
        The current time is ${new Date().toLocaleString(undefined, {
          year: 'numeric',
          month: 'numeric',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
          hour12: true,
          timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone
        })}.
        Always maintain context from previous messages in the conversation.`;
    return systemContent;
  }

  static exportAsMarkdown(messages: Message[], systemPrompt?: string): string {
    let markdown = "# Conversation Export\n\n"

    if (systemPrompt) {
      markdown += `## System Prompt\n\n`;
      markdown += `\`\`\`\n${systemPrompt}\n\`\`\`\n\n`;
      markdown += "---\n\n";
    }

    messages.forEach((msg) => {
      markdown += `## ${msg.role === "user" ? "👤 User" : "🤖 Assistant"}\n`
      markdown += `*${msg.timestamp.toLocaleString()}*\n\n`
      if (typeof msg.content === 'string') {
        markdown += `${msg.content}\n\n`
      } else {
        msg.content.forEach(part => {
          if (part.type === 'text') {
            markdown += `${part.text}\n\n`;
          } else if (part.type === 'image_url') {
            markdown += `![Attached Image](${part.image_url.url})\n\n`;
          }
        });
      }
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
