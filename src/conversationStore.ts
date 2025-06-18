import Dexie from "dexie";
import type { Table } from "dexie";
import { secureStorage } from "./utils/secureStorage";

export interface Bind {
  id: string;
  userPrompt: Message;
  aiResponse: Message;
  summary: string; // AI-generated, user-editable
  isPinned: boolean;
  createdAt: Date;
  isLocked: boolean; // true when user "commits" the bind
  branchId: string;
  parentBindId?: string; // for branching from specific binds
}

export interface Branch {
  id: string;
  name: string;
  ideaId: string; // belongs to an idea
  parentBranchId?: string; // for branching from other branches
  parentBindId?: string; // specific bind this branch originated from
  binds: Bind[];
  createdAt: Date;
  summary?: string;
  isLinear: boolean; // true until manually branched
  mergedFrom?: string[]; // IDs of branches/binds merged into this one
  isMerged?: boolean;
  // Legacy support for migration
  messages?: Message[];
}

export interface Idea {
  id: string;
  name: string;
  description?: string;
  branches: Branch[];
  createdAt: Date;
  updatedAt: Date;
  isPinned: boolean;
  tags?: string[];
}

export interface Message {
  id: string;
  role: "user" | "assistant";
  content: string | Array<{ type: "text"; text: string } | { type: "image_url"; image_url: { url: string } }>;
  timestamp: Date;
  attestation?: any;
}

export interface PinnedBind {
  id: string;
  bindId: string;
  pinnedAt: Date;
  customName?: string;
}

// Legacy interface for backward compatibility
export interface Snapshot {
  id: string;
  branchId: string;
  messages: Message[];
  timestamp: Date;
  description?: string;
}

class ConversationDatabase extends Dexie {
  ideas!: Table<Idea>;
  branches!: Table<Branch>;
  binds!: Table<Bind>;
  pinnedBinds!: Table<PinnedBind>;
  snapshots!: Table<Snapshot>; // Keep for backward compatibility

  constructor() {
    super("GracefulJourneyDB");
    
    // Version 1 - Original schema
    this.version(1).stores({
      branches: "id, parentId, createdAt",
      snapshots: "id, branchId, timestamp"
    });

    // Version 2 - Add bind system
    this.version(2).stores({
      branches: "id, parentId, parentBindId, createdAt, isLinear",
      binds: "id, branchId, parentBindId, createdAt, isLocked, isPinned",
      pinnedBinds: "id, bindId, pinnedAt",
      snapshots: "id, branchId, timestamp" // Keep for backward compatibility
    }).upgrade(async tx => {
      // Migration logic for existing data
      console.log("Migrating database to version 2...");
      
      try {
        const branches = await tx.table('branches').toArray();
        console.log(`Found ${branches.length} branches to migrate`);
        
        for (const branch of branches) {
          const updates: Partial<Branch> = {};
          
          if (!branch.binds) {
            updates.binds = [];
          }
          if (branch.isLinear === undefined) {
            updates.isLinear = true;
          }
          
          // Convert existing messages to binds if they exist
          if (branch.messages && branch.messages.length > 0) {
            const messages = branch.messages;
            const binds: Bind[] = [];
            
            // Group messages into user-assistant pairs
            for (let i = 0; i < messages.length - 1; i += 2) {
              if (messages[i].role === 'user' && messages[i + 1]?.role === 'assistant') {
                const bind: Bind = {
                  id: `bind-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
                  userPrompt: messages[i],
                  aiResponse: messages[i + 1],
                  summary: messages[i].content.toString().substring(0, 100) + '...',
                  isPinned: false,
                  createdAt: messages[i].timestamp,
                  isLocked: true, // Lock existing binds
                  branchId: branch.id
                };
                binds.push(bind);
                
                // Add bind to binds table
                await tx.table('binds').add(bind);
              }
            }
            updates.binds = binds;
          }
          
          // Update branch with new fields
          if (Object.keys(updates).length > 0) {
            await tx.table('branches').update(branch.id, updates);
          }
        }
        
        console.log("Database migration completed successfully");
      } catch (error) {
        console.error("Database migration failed:", error);
        throw error;
      }
    });

    // Version 3 - Add Ideas and restructure hierarchy
    this.version(3).stores({
      ideas: "id, name, createdAt, updatedAt, isPinned",
      branches: "id, ideaId, parentBranchId, parentBindId, createdAt, isLinear",
      binds: "id, branchId, parentBindId, createdAt, isLocked, isPinned",
      pinnedBinds: "id, bindId, pinnedAt",
      snapshots: "id, branchId, timestamp" // Keep for backward compatibility
    }).upgrade(async tx => {
      // Migration logic for version 3 - convert branches to ideas
      console.log("Migrating database to version 3 (Ideas system)...");
      
      try {
        const branches = await tx.table('branches').toArray();
        console.log(`Found ${branches.length} branches to migrate to ideas`);
        
        // Convert top-level branches (those without parentId) to Ideas
        const topLevelBranches = branches.filter(b => !b.parentId);
        const childBranches = branches.filter(b => b.parentId);
        
        for (const topBranch of topLevelBranches) {
          // Create an Idea from this top-level branch
          const idea: Idea = {
            id: `idea-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            name: topBranch.name,
            description: topBranch.summary,
            branches: [],
            createdAt: topBranch.createdAt,
            updatedAt: new Date(),
            isPinned: false,
            tags: []
          };
          
          await tx.table('ideas').add(idea);
          
          // Update the branch to belong to this idea
          await tx.table('branches').update(topBranch.id, {
            ideaId: idea.id,
            parentBranchId: undefined,
            // Remove old parentId field
            parentId: undefined
          });
          
          // Update child branches to belong to this idea
          const children = childBranches.filter(cb => cb.parentId === topBranch.id);
          for (const child of children) {
            await tx.table('branches').update(child.id, {
              ideaId: idea.id,
              parentBranchId: topBranch.id,
              // Remove old parentId field
              parentId: undefined
            });
          }
        }
        
        console.log("Database migration to Ideas system completed successfully");
      } catch (error) {
        console.error("Database migration to Ideas system failed:", error);
        throw error;
      }
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

  // New Idea Management Methods
  static async createIdea(name: string, description?: string): Promise<Idea> {
    const idea: Idea = {
      id: `idea-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      name,
      description,
      branches: [],
      createdAt: new Date(),
      updatedAt: new Date(),
      isPinned: false,
      tags: []
    }

    await db.ideas.add(idea)
    
    // Create a default "Main" branch for this idea
    const mainBranch = await this.createBranch("Main", [], idea.id)
    
    this.notifyListeners()
    return idea
  }

  static async getAllIdeas(): Promise<Idea[]> {
    return await db.ideas.toArray()
  }

  static async getIdea(id: string): Promise<Idea | undefined> {
    return await db.ideas.get(id)
  }

  static async updateIdea(id: string, updates: Partial<Idea>): Promise<void> {
    await db.ideas.update(id, { ...updates, updatedAt: new Date() })
    this.notifyListeners()
  }

  static async deleteIdea(id: string): Promise<void> {
    try {
      // Get all branches for this idea
      const ideaBranches = await this.getIdeaBranches(id)
      
      // Delete all binds for all branches
      for (const branch of ideaBranches) {
        const branchBinds = await this.getBranchBinds(branch.id)
        for (const bind of branchBinds) {
          await db.binds.delete(bind.id)
          await db.pinnedBinds.where('bindId').equals(bind.id).delete()
        }
      }
      
      // Delete all branches for this idea
      await db.branches.where('ideaId').equals(id).delete()
      
      // Delete the idea
      await db.ideas.delete(id)
      
      this.notifyListeners()
    } catch (error) {
      console.error("Failed to delete idea:", error)
      throw error
    }
  }

  static async createBranch(name: string, parentMessages: Message[], ideaId: string, parentBranchId?: string): Promise<Branch> {
    const branch: Branch = {
      id: `branch-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      name,
      ideaId,
      parentBranchId,
      binds: [],
      isLinear: true,
      createdAt: new Date(),
      // Keep messages for backward compatibility during transition
      messages: [...parentMessages],
    }

    await db.branches.add(branch)
    this.notifyListeners()
    return branch
  }

  static async getIdeaBranches(ideaId: string): Promise<Branch[]> {
    return await db.branches.where('ideaId').equals(ideaId).toArray()
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

  // New Bind Management Methods
  static async createBind(userPrompt: Message, aiResponse: Message, branchId: string, parentBindId?: string): Promise<Bind> {
    // Check for duplicate binds based on user prompt and AI response content
    const existingBinds = await this.getBranchBinds(branchId);
    const userContent = typeof userPrompt.content === 'string' ? userPrompt.content : JSON.stringify(userPrompt.content);
    const aiContent = typeof aiResponse.content === 'string' ? aiResponse.content : JSON.stringify(aiResponse.content);
    
    const duplicate = existingBinds.find(bind => {
      const existingUserContent = typeof bind.userPrompt.content === 'string' ? bind.userPrompt.content : JSON.stringify(bind.userPrompt.content);
      const existingAiContent = typeof bind.aiResponse.content === 'string' ? bind.aiResponse.content : JSON.stringify(bind.aiResponse.content);
      return existingUserContent === userContent && existingAiContent === aiContent;
    });
    
    if (duplicate) {
      console.warn('Duplicate bind detected, returning existing bind:', duplicate.id);
      return duplicate;
    }

    const bind: Bind = {
      id: `bind-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      userPrompt,
      aiResponse,
      summary: await this.generateBindSummary(userPrompt, aiResponse),
      isPinned: false,
      createdAt: new Date(),
      isLocked: false, // New binds start unlocked
      branchId,
      parentBindId
    }

    await db.binds.add(bind)
    
    // Add bind to branch
    const branch = await db.branches.get(branchId)
    if (branch) {
      const updatedBinds = [...(branch.binds || []), bind]
      await db.branches.update(branchId, { binds: updatedBinds })
    }
    
    this.notifyListeners()
    return bind
  }

  static async lockBind(bindId: string): Promise<void> {
    await db.binds.update(bindId, { isLocked: true })
    this.notifyListeners()
  }

  static async editBindResponse(bindId: string, newResponse: string): Promise<void> {
    const bind = await db.binds.get(bindId)
    if (!bind || bind.isLocked) {
      throw new Error("Cannot edit locked bind")
    }

    const updatedResponse: Message = {
      ...bind.aiResponse,
      content: newResponse,
      timestamp: new Date()
    }

    await db.binds.update(bindId, {
      aiResponse: updatedResponse,
      summary: await this.generateBindSummary(bind.userPrompt, updatedResponse)
    })
    
    this.notifyListeners()
  }

  static async generateBindSummary(userPrompt: Message, aiResponse: Message): Promise<string> {
    const userContent = typeof userPrompt.content === 'string'
      ? userPrompt.content
      : userPrompt.content.find(part => part.type === 'text')?.text || '[image]'
    
    const aiContent = typeof aiResponse.content === 'string'
      ? aiResponse.content
      : aiResponse.content.find(part => part.type === 'text')?.text || '[image]'

    // Simple summary generation - could be enhanced with AI
    const userSummary = userContent.substring(0, 50)
    const aiSummary = aiContent.substring(0, 50)
    
    return `Q: ${userSummary}${userContent.length > 50 ? '...' : ''} | A: ${aiSummary}${aiContent.length > 50 ? '...' : ''}`
  }

  static async toggleBindPin(bindId: string): Promise<void> {
    const bind = await db.binds.get(bindId)
    if (!bind) return

    const newPinnedState = !bind.isPinned
    await db.binds.update(bindId, { isPinned: newPinnedState })

    if (newPinnedState) {
      // Add to pinned binds table
      const pinnedBind: PinnedBind = {
        id: `pinned-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        bindId,
        pinnedAt: new Date()
      }
      await db.pinnedBinds.add(pinnedBind)
    } else {
      // Remove from pinned binds table
      await db.pinnedBinds.where('bindId').equals(bindId).delete()
    }

    this.notifyListeners()
  }

  static async deleteBind(bindId: string): Promise<void> {
    const bind = await db.binds.get(bindId)
    if (!bind) return

    // Remove from binds table
    await db.binds.delete(bindId)
    
    // Remove from pinned binds if it was pinned
    await db.pinnedBinds.where('bindId').equals(bindId).delete()
    
    // Remove from branch's binds array
    const branch = await db.branches.get(bind.branchId)
    if (branch && branch.binds) {
      const updatedBinds = branch.binds.filter(b => b.id !== bindId)
      await db.branches.update(bind.branchId, { binds: updatedBinds })
    }
    
    this.notifyListeners()
  }

  static async getAllBinds(): Promise<Bind[]> {
    return await db.binds.toArray()
  }

  static async getBranchBinds(branchId: string): Promise<Bind[]> {
    return await db.binds.where('branchId').equals(branchId).toArray()
  }

  static async getPinnedBinds(): Promise<PinnedBind[]> {
    return await db.pinnedBinds.toArray()
  }

  static async createBranchFromBind(bindId: string, branchName: string): Promise<Branch> {
    const bind = await db.binds.get(bindId)
    if (!bind) {
      throw new Error("Bind not found")
    }

    const parentBranch = await db.branches.get(bind.branchId)
    if (!parentBranch) {
      throw new Error("Parent branch not found")
    }

    // Get all binds up to and including the specified bind
    const parentBinds = await this.getBranchBinds(bind.branchId)
    const bindIndex = parentBinds.findIndex(b => b.id === bindId)
    const bindsUpToBranch = parentBinds.slice(0, bindIndex + 1)

    const newBranch: Branch = {
      id: `branch-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      name: branchName,
      ideaId: parentBranch.ideaId,
      parentBranchId: bind.branchId,
      parentBindId: bindId,
      binds: bindsUpToBranch.map(b => ({ ...b, branchId: `branch-${Date.now()}-${Math.random().toString(36).substr(2, 9)}` })),
      isLinear: true,
      createdAt: new Date(),
      // Convert binds back to messages for backward compatibility
      messages: bindsUpToBranch.flatMap(b => [b.userPrompt, b.aiResponse])
    }

    await db.branches.add(newBranch)
    
    // Mark parent branch as no longer linear
    await db.branches.update(bind.branchId, { isLinear: false })
    
    this.notifyListeners()
    return newBranch
  }

  static async renameBranch(id: string, newName: string): Promise<void> {
    await db.branches.update(id, { name: newName });
    this.notifyListeners();
  }

  static async deleteBranch(id: string): Promise<void> {
    try {
      const allBranches = await this.getAllBranches();
      const childrenToDelete = new Set<string>();

      const findChildren = (parentBranchId: string) => {
        for (const branch of allBranches) {
          if (branch.parentBranchId === parentBranchId) {
            childrenToDelete.add(branch.id);
            findChildren(branch.id);
          }
        }
      };

      findChildren(id);
      const idsToDelete = [id, ...childrenToDelete];

      // Delete related binds first
      for (const branchId of idsToDelete) {
        const branchBinds = await this.getBranchBinds(branchId);
        for (const bind of branchBinds) {
          await db.binds.delete(bind.id);
          await db.pinnedBinds.where('bindId').equals(bind.id).delete();
        }
      }

      // Then delete branches and snapshots
      await db.transaction('rw', db.branches, db.snapshots, async () => {
        await db.branches.bulkDelete(idsToDelete);
        await db.snapshots.where('branchId').anyOf(idsToDelete).delete();
      });

      this.notifyListeners();
    } catch (error) {
      console.error("Failed to delete branch:", error);
      throw error;
    }
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
      ideaId: target.ideaId,
      parentBranchId: targetBranchId,
      binds: [...(target.binds || []), ...(source.binds || [])],
      isLinear: false, // Merged branches are not linear
      createdAt: new Date(),
      summary: `Merged from ${source.name} into ${target.name}`,
      mergedFrom: [sourceBranchId, targetBranchId],
      isMerged: true,
      // Keep messages for backward compatibility
      messages: [...(target.messages || []), ...(source.messages || [])],
    }

    await db.branches.add(mergedBranch)
    return mergedBranch
  }

  static async mergeSelectedBinds(bindIds: string[], targetBranchId: string, newBranchName?: string): Promise<Branch> {
    if (bindIds.length === 0) {
      throw new Error("No binds selected for merge")
    }

    // Get all selected binds
    const selectedBinds = await Promise.all(bindIds.map(id => db.binds.get(id)))
    const validBinds = selectedBinds.filter(bind => bind !== undefined) as Bind[]
    
    if (validBinds.length === 0) {
      throw new Error("No valid binds found")
    }

    // Sort binds by creation date
    validBinds.sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime())

    // Use AI to intelligently merge the content
    const { mergedUserContent, mergedAiContent } = await this.aiMergeBinds(validBinds)

    // Create merged user prompt and AI response
    const mergedUserPrompt: Message = {
      id: `merged-user-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      role: 'user',
      content: mergedUserContent,
      timestamp: new Date()
    }

    const mergedAiResponse: Message = {
      id: `merged-ai-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      role: 'assistant',
      content: mergedAiContent,
      timestamp: new Date()
    }

    // Determine target branch
    let targetBranch: Branch
    if (newBranchName) {
      // Get the idea ID from the target branch
      const existingTargetBranch = await db.branches.get(targetBranchId)
      if (!existingTargetBranch) {
        throw new Error("Target branch not found")
      }
      
      // Create new branch for merged bind
      targetBranch = {
        id: `branch-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        name: newBranchName,
        ideaId: existingTargetBranch.ideaId,
        parentBranchId: targetBranchId,
        binds: [],
        isLinear: false,
        createdAt: new Date(),
        summary: `Merged ${validBinds.length} binds`,
        mergedFrom: bindIds,
        isMerged: true,
        messages: []
      }
      await db.branches.add(targetBranch)
    } else {
      // Use existing target branch
      const existing = await db.branches.get(targetBranchId)
      if (!existing) {
        throw new Error("Target branch not found")
      }
      targetBranch = existing
    }

    // Create single merged bind
    const mergedBind: Bind = {
      id: `bind-merged-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      userPrompt: mergedUserPrompt,
      aiResponse: mergedAiResponse,
      summary: await this.generateBindSummary(mergedUserPrompt, mergedAiResponse),
      isPinned: false,
      createdAt: new Date(),
      isLocked: true, // Lock merged binds
      branchId: targetBranch.id,
      parentBindId: validBinds[0].id // Reference to first original bind
    }

    // Add merged bind to database
    await db.binds.add(mergedBind)

    // Delete original binds
    for (const bind of validBinds) {
      await db.binds.delete(bind.id)
      
      // Remove from original branch's binds array
      const originalBranch = await db.branches.get(bind.branchId)
      if (originalBranch && originalBranch.binds) {
        const updatedOriginalBinds = originalBranch.binds.filter(b => b.id !== bind.id)
        await db.branches.update(originalBranch.id, { binds: updatedOriginalBinds })
      }
    }

    // Update target branch with merged bind
    const currentTargetBinds = await this.getBranchBinds(targetBranch.id)
    const updatedMessages = [...(targetBranch.messages || []), mergedUserPrompt, mergedAiResponse]
    
    await db.branches.update(targetBranch.id, {
      binds: currentTargetBinds,
      messages: updatedMessages,
      isLinear: false
    })

    this.notifyListeners()
    return targetBranch
  }

  static async aiMergeBinds(binds: Bind[]): Promise<{ mergedUserContent: string; mergedAiContent: string }> {
    // Extract content from binds
    const conversations = binds.map((bind, index) => {
      const userContent = typeof bind.userPrompt.content === 'string'
        ? bind.userPrompt.content
        : bind.userPrompt.content.find(part => part.type === 'text')?.text || '[image]'
      
      const aiContent = typeof bind.aiResponse.content === 'string'
        ? bind.aiResponse.content
        : bind.aiResponse.content.find(part => part.type === 'text')?.text || '[image]'
      
      return `Conversation ${index + 1}:\nUser: ${userContent}\nAssistant: ${aiContent}`
    }).join('\n\n---\n\n')

    // Create AI prompt for merging
    const mergePrompt = `You are tasked with intelligently merging multiple conversation exchanges into a single, coherent conversation. Please combine the following conversations in a natural way:

${conversations}

Please provide:
1. A merged user question/prompt that naturally combines the user's inquiries
2. A merged AI response that comprehensively addresses all the topics in a flowing, natural manner

Format your response as:
MERGED_USER: [combined user prompt]
MERGED_AI: [combined AI response]

Make the merged content feel like a natural conversation, not just concatenated text. Find common themes and create smooth transitions between topics.`

    try {
      // Use the existing API infrastructure
      const response = await this.makeApiCall([
        { role: 'user', content: mergePrompt, id: 'merge-prompt', timestamp: new Date() }
      ], 'openai/gpt-4o') // Use a capable model for merging

      // Parse the response to extract merged content
      const responseText = response.content
      const userMatch = responseText.match(/MERGED_USER:\s*([\s\S]*?)(?=MERGED_AI:|$)/)
      const aiMatch = responseText.match(/MERGED_AI:\s*([\s\S]*)/)

      if (userMatch && aiMatch) {
        return {
          mergedUserContent: userMatch[1].trim(),
          mergedAiContent: aiMatch[1].trim()
        }
      } else {
        throw new Error('Failed to parse AI merge response')
      }
    } catch (error) {
      console.error('AI merge failed, falling back to simple concatenation:', error)
      
      // Fallback to simple concatenation if AI merge fails
      const mergedUserContent = binds.map(bind => {
        const content = typeof bind.userPrompt.content === 'string'
          ? bind.userPrompt.content
          : bind.userPrompt.content.find(part => part.type === 'text')?.text || '[image]'
        return content
      }).join('\n\n---\n\n')

      const mergedAiContent = binds.map(bind => {
        const content = typeof bind.aiResponse.content === 'string'
          ? bind.aiResponse.content
          : bind.aiResponse.content.find(part => part.type === 'text')?.text || '[image]'
        return content
      }).join('\n\n---\n\n')

      return { mergedUserContent, mergedAiContent }
    }
  }

  static async makeApiCall(messages: Message[], modelId: string): Promise<{ content: string }> {
    // This is a simplified version - you'll need to implement the actual API call
    // using your existing API infrastructure from the main chat functionality
    
    if (this.isRedPillModel(modelId)) {
      // Use Red Pill API
      const response = await fetch('https://api.red-pill.ai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.redPillApiKey}`
        },
        body: JSON.stringify({
          model: modelId,
          messages: messages.map(m => ({
            role: m.role,
            content: typeof m.content === 'string' ? m.content : JSON.stringify(m.content)
          }))
        })
      })
      
      const data = await response.json()
      return { content: data.choices[0].message.content }
    } else {
      // Use OpenRouter API
      const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.openRouterApiKey}`,
          'HTTP-Referer': window.location.origin,
          'X-Title': 'Graceful Journey Chat'
        },
        body: JSON.stringify({
          model: modelId,
          messages: messages.map(m => ({
            role: m.role,
            content: typeof m.content === 'string' ? m.content : JSON.stringify(m.content)
          }))
        })
      })
      
      const data = await response.json()
      return { content: data.choices[0].message.content }
    }
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
   * Export complete hierarchy as structured markdown
   * @returns Promise resolving to hierarchical markdown export
   */
  static async exportHierarchyAsMarkdown(): Promise<string> {
    const ideas = await this.getAllIdeas();
    let markdown = "# Graceful Journey Chat - Complete Export\n\n";
    markdown += `*Exported on ${new Date().toLocaleString()}*\n\n`;
    markdown += "---\n\n";

    for (const idea of ideas) {
      markdown += `# 💡 ${idea.name}\n\n`;
      
      if (idea.description) {
        markdown += `**Description:** ${idea.description}\n\n`;
      }
      
      markdown += `**Created:** ${idea.createdAt.toLocaleString()}\n`;
      markdown += `**Updated:** ${idea.updatedAt.toLocaleString()}\n`;
      
      if (idea.tags && idea.tags.length > 0) {
        markdown += `**Tags:** ${idea.tags.join(', ')}\n`;
      }
      
      markdown += "\n";

      // Get branches for this idea
      const branches = await this.getIdeaBranches(idea.id);
      
      if (branches.length === 0) {
        markdown += "*No branches in this idea*\n\n";
      } else {
        for (const branch of branches) {
          markdown += `## 🌿 ${branch.name}\n\n`;
          markdown += `**Created:** ${branch.createdAt.toLocaleString()}\n`;
          
          if (branch.summary) {
            markdown += `**Summary:** ${branch.summary}\n`;
          }
          
          if (branch.parentBranchId) {
            const parentBranch = await this.getBranch(branch.parentBranchId);
            markdown += `**Branched from:** ${parentBranch?.name || 'Unknown'}\n`;
          }
          
          markdown += "\n";

          // Get binds for this branch
          const binds = await this.getBranchBinds(branch.id);
          
          if (binds.length === 0) {
            markdown += "*No binds in this branch*\n\n";
          } else {
            for (let i = 0; i < binds.length; i++) {
              const bind = binds[i];
              markdown += `### 🔗 Bind ${i + 1}: ${bind.summary}\n\n`;
              markdown += `**Created:** ${bind.createdAt.toLocaleString()}\n`;
              markdown += `**Status:** ${bind.isLocked ? '🔒 Locked' : '🔓 Unlocked'}${bind.isPinned ? ' 📌 Pinned' : ''}\n\n`;
              
              // User prompt
              markdown += `#### 👤 User\n`;
              if (typeof bind.userPrompt.content === 'string') {
                markdown += `${bind.userPrompt.content}\n\n`;
              } else {
                bind.userPrompt.content.forEach(part => {
                  if (part.type === 'text') {
                    markdown += `${part.text}\n\n`;
                  } else if (part.type === 'image_url') {
                    markdown += `![User Image](${part.image_url.url})\n\n`;
                  }
                });
              }
              
              // AI response
              markdown += `#### 🤖 Assistant\n`;
              if (typeof bind.aiResponse.content === 'string') {
                markdown += `${bind.aiResponse.content}\n\n`;
              } else {
                bind.aiResponse.content.forEach(part => {
                  if (part.type === 'text') {
                    markdown += `${part.text}\n\n`;
                  } else if (part.type === 'image_url') {
                    markdown += `![AI Image](${part.image_url.url})\n\n`;
                  }
                });
              }
              
              markdown += "---\n\n";
            }
          }
          
          markdown += "\n";
        }
      }
      
      markdown += "===\n\n";
    }

    return markdown;
  }

  /**
   * Export all data for piping sync
   * @returns Promise resolving to complete data structure
   */
  static async exportAllData(): Promise<{ideas: Idea[], branches: Branch[], binds: Bind[], snapshots: Snapshot[]}> {
    const [ideas, branches, binds, snapshots] = await Promise.all([
      db.ideas.toArray(),
      db.branches.toArray(),
      db.binds.toArray(),
      db.snapshots.toArray()
    ]);
    
    return { ideas, branches, binds, snapshots };
  }

  /**
   * Import complete data structure from another device
   * @param data Complete data to import
   */
  static async importAllData(data: {ideas?: Idea[], branches?: Branch[], binds?: Bind[], snapshots?: Snapshot[]}): Promise<void> {
    try {
      // Import in order: Ideas first, then Branches, then Binds, then Snapshots
      if (data.ideas) {
        await this.importIdeas(data.ideas);
      }
      
      if (data.branches) {
        await this.importBranches(data.branches);
      }
      
      if (data.binds) {
        await this.importBinds(data.binds);
      }
      
      if (data.snapshots) {
        await this.importSnapshots(data.snapshots);
      }
      
      console.log('Complete data import successful');
    } catch (error) {
      console.error('Failed to import complete data:', error);
      throw error;
    }
  }

  /**
   * Import ideas from another device
   * @param ideas Ideas to import
   */
  static async importIdeas(ideas: Idea[]): Promise<void> {
    for (const idea of ideas) {
      const existingIdea = await db.ideas.get(idea.id);
      
      if (!existingIdea) {
        // Add new idea if it doesn't exist
        await db.ideas.add(idea);
      } else {
        // Update existing idea with newer data (conflict resolution: keep newer)
        if (new Date(idea.updatedAt) > new Date(existingIdea.updatedAt)) {
          await db.ideas.update(existingIdea.id, {
            name: idea.name,
            description: idea.description,
            updatedAt: idea.updatedAt,
            isPinned: idea.isPinned,
            tags: idea.tags
          });
        }
      }
    }
    
    this.notifyListeners();
  }

  /**
   * Import binds from another device
   * @param binds Binds to import
   */
  static async importBinds(binds: Bind[]): Promise<void> {
    for (const bind of binds) {
      const existingBind = await db.binds.get(bind.id);
      
      if (!existingBind) {
        // Check if the branch exists, if not skip this bind (orphan handling)
        const branchExists = await db.branches.get(bind.branchId);
        if (branchExists) {
          await db.binds.add(bind);
        } else {
          console.warn(`Skipping orphaned bind ${bind.id} - branch ${bind.branchId} not found`);
        }
      }
      // Don't update existing binds - they're immutable once created
    }
    
    this.notifyListeners();
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
        // Check if the idea exists, if not create a default one (orphan handling)
        if (branch.ideaId) {
          const ideaExists = await db.ideas.get(branch.ideaId);
          if (!ideaExists) {
            // Create a default idea for orphaned branches
            const defaultIdea: Idea = {
              id: branch.ideaId,
              name: `Imported Idea (${branch.name})`,
              description: `Auto-created for imported branch: ${branch.name}`,
              branches: [],
              createdAt: branch.createdAt,
              updatedAt: new Date(),
              isPinned: false,
              tags: ['imported']
            };
            await db.ideas.add(defaultIdea);
            console.log(`Created default idea ${defaultIdea.id} for orphaned branch ${branch.id}`);
          }
        }
        
        // Add the branch
        await db.branches.add(branch);
      } else {
        // If branch exists, merge messages and binds
        const mergedMessages = [...(existingBranch.messages || [])];
        const mergedBinds = [...(existingBranch.binds || [])];
        
        // Add messages that don't already exist (for backward compatibility)
        if (branch.messages) {
          for (const message of branch.messages) {
            if (!mergedMessages.some(m => m.id === message.id)) {
              mergedMessages.push(message);
            }
          }
        }
        
        // Add binds that don't already exist
        if (branch.binds) {
          for (const bind of branch.binds) {
            if (!mergedBinds.some(b => b.id === bind.id)) {
              mergedBinds.push(bind);
            }
          }
        }
        
        // Sort messages by timestamp
        mergedMessages.sort((a, b) =>
          new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
        );
        
        // Sort binds by timestamp
        mergedBinds.sort((a, b) =>
          new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
        );
        
        // Update the branch
        await db.branches.update(existingBranch.id, {
          messages: mergedMessages,
          binds: mergedBinds,
          // Take the most recent metadata
          name: branch.createdAt > existingBranch.createdAt ? branch.name : existingBranch.name,
          summary: branch.summary || existingBranch.summary,
          isLinear: existingBranch.isLinear && (branch.isLinear ?? true)
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
