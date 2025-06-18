"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { ConversationStore } from "./conversationStore"
import type { Branch, Message } from "./conversationStore"
import { Plus, Camera, GitBranch, Pencil, Trash2, Check, X } from "lucide-react"

interface BranchPanelProps {
  currentBranch: Branch | null
  onBranchSelect: (branch: Branch) => void
  onCreateBranch: (name: string) => void
  messages: Message[]
  isDark: boolean
  expandedView: boolean
  onClose: () => void
}

export function BranchPanel({ 
  currentBranch, 
  onBranchSelect, 
  onCreateBranch, 
  messages, 
  isDark, 
  expandedView, 
  onClose
}: BranchPanelProps) {
  const panelRef = useRef<HTMLDivElement>(null);

  // Handle click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(event.target as Node)) {
        onClose();
      }
    }

    if (expandedView) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [expandedView, onClose]);

  const [branches, setBranches] = useState<Branch[]>([])
  const [showNewBranchDialog, setShowNewBranchDialog] = useState(false)
  const [newBranchName, setNewBranchName] = useState("")
  const [editingBranchId, setEditingBranchId] = useState<string | null>(null)
  const [editingBranchName, setEditingBranchName] = useState("")
  // expandedView is now controlled by parent component
  
  const loadBranches = useCallback(async () => {
    const allBranches = await ConversationStore.getAllBranches()
    setBranches(allBranches)
  }, [])

  useEffect(() => {
    ConversationStore.listenForChanges(loadBranches);
    loadBranches();
    
    return () => {
      ConversationStore.removeListener(loadBranches);
    };
  }, [loadBranches])

  const handleCreateBranch = async () => {
    if (newBranchName.trim()) {
      await onCreateBranch(newBranchName)
      setNewBranchName("")
      setShowNewBranchDialog(false)
      loadBranches()
    }
  }

  const handleSnapshot = async () => {
    if (currentBranch) {
      const description = prompt("Snapshot description (optional):")
      await ConversationStore.createSnapshot(currentBranch.id, messages, description || undefined)
      alert("Snapshot saved!")
    }
  }

  const handleRenameBranch = async (branchId: string) => {
    if (editingBranchName.trim()) {
      await ConversationStore.renameBranch(branchId, editingBranchName);
      setEditingBranchId(null);
      setEditingBranchName("");
      loadBranches();
    }
  };

  const handleDeleteBranch = async (branchId: string) => {
    if (window.confirm("Are you sure you want to delete this branch and all its children? This action cannot be undone.")) {
      await ConversationStore.deleteBranch(branchId);
      loadBranches();
      // If the deleted branch was the current one, select the first available branch
      if (currentBranch?.id === branchId) {
        const allBranches = await ConversationStore.getAllBranches();
        if (allBranches.length > 0) {
          onBranchSelect(allBranches[0]);
        } else {
          // Handle case where no branches are left
        }
      }
    }
  };

  return (
    <div
      ref={panelRef}
      className={`fixed inset-y-0 left-0 z-50 transform transition-transform duration-300 ease-in-out ${
        expandedView ? 'translate-x-0' : '-translate-x-full'
      } w-80 ${isDark ? 'bg-black/90' : 'bg-white/95'} backdrop-blur-xl border-r ${
        isDark ? 'border-white/10' : 'border-black/10'
      }`}
    >

      {expandedView && (
        <div className="p-6">
          <h3
            className={`text-sm font-bold mb-6 transition-colors duration-500 ${
              isDark ? "text-gray-400" : "text-gray-600"
            } tracking-wider uppercase`}
          >
            Conversation Branches
          </h3>

          {/* Current Branch Info */}
          {currentBranch && (
            <div
              className={`mb-6 p-4 rounded-xl transition-all duration-500 ${
                isDark
                  ? "bg-purple-500/20 border-purple-500/30 text-purple-300"
                  : "bg-indigo-500/10 border-indigo-500/20 text-indigo-700"
              } backdrop-blur-sm border`}
            >
              <div className="flex items-center gap-2 mb-2">
                <GitBranch className="w-4 h-4" />
                <p className="font-semibold">{currentBranch.name}</p>
              </div>
              <p className={`text-xs transition-colors duration-500 ${isDark ? "text-gray-400" : "text-gray-600"}`}>
                {messages.length} messages
              </p>
            </div>
          )}

          {/* Action Buttons */}
          <div className="space-y-3 mb-8">
            <button
              onClick={() => setShowNewBranchDialog(true)}
              className={`w-full px-4 py-3 rounded-xl font-medium transition-all duration-300 ${
                isDark
                  ? "bg-purple-500/30 hover:bg-purple-500/40 text-purple-300 border-purple-500/30 shadow-lg shadow-purple-500/20"
                  : "bg-indigo-500/20 hover:bg-indigo-500/30 text-indigo-700 border-indigo-500/30 shadow-lg shadow-indigo-500/10"
              } backdrop-blur-sm border hover:scale-105 active:scale-95 transform flex items-center justify-center gap-2`}
            >
              <Plus className="w-4 h-4" />
              New Branch
            </button>

            <button
              onClick={handleSnapshot}
              disabled={!currentBranch}
              className={`w-full px-4 py-3 rounded-xl font-medium transition-all duration-300 ${
                isDark
                  ? "bg-white/10 hover:bg-white/20 text-gray-300 border-white/20"
                  : "bg-black/10 hover:bg-black/20 text-gray-700 border-black/20"
              } backdrop-blur-sm border disabled:opacity-50 hover:scale-105 active:scale-95 transform flex items-center justify-center gap-2`}
            >
              <Camera className="w-4 h-4" />
              Save Snapshot
            </button>
          </div>

          {/* Branch List */}
          <div className="space-y-3">
            {branches.map((branch) => (
              <div
                key={branch.id}
                onClick={(e) => {
                  // Prevent selection when clicking on buttons
                  if ((e.target as HTMLElement).closest('button')) return;
                  if (editingBranchId !== branch.id) {
                    onBranchSelect(branch);
                  }
                }}
                className={`p-4 rounded-xl transition-all duration-300 group ${
                  editingBranchId === branch.id
                    ? isDark
                      ? "bg-yellow-500/20 border-yellow-500/30"
                      : "bg-yellow-500/10 border-yellow-500/20"
                    : currentBranch?.id === branch.id
                    ? isDark
                      ? "bg-purple-500/30 border-purple-500/50 shadow-lg shadow-purple-500/20"
                      : "bg-indigo-500/20 border-indigo-500/40 shadow-lg shadow-indigo-500/10"
                    : isDark
                      ? "bg-white/5 hover:bg-white/10 border-white/10 hover:border-white/20"
                      : "bg-black/5 hover:bg-black/10 border-black/10 hover:border-black/20"
                } backdrop-blur-sm border hover:scale-105 transform`}
              >
                {editingBranchId === branch.id ? (
                  <div>
                    <input
                      type="text"
                      value={editingBranchName}
                      onChange={(e) => setEditingBranchName(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && handleRenameBranch(branch.id)}
                      className={`w-full px-3 py-2 rounded-md text-sm mb-2 ${
                        isDark
                          ? "bg-black/50 border-white/20 text-white"
                          : "bg-white/50 border-black/20 text-black"
                      }`}
                      autoFocus
                      onFocus={(e) => e.target.select()}
                    />
                    <div className="flex justify-end gap-2">
                      <button onClick={() => handleRenameBranch(branch.id)} className={`p-2 rounded-md ${isDark ? 'bg-green-500/30 hover:bg-green-500/40' : 'bg-green-500/20 hover:bg-green-500/30'}`}><Check className="w-4 h-4" /></button>
                      <button onClick={() => setEditingBranchId(null)} className={`p-2 rounded-md ${isDark ? 'bg-red-500/30 hover:bg-red-500/40' : 'bg-red-500/20 hover:bg-red-500/30'}`}><X className="w-4 h-4" /></button>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="flex items-center justify-between mb-2">
                      <span
                        className={`font-medium transition-colors duration-500 ${isDark ? "text-white" : "text-gray-900"}`}
                      >
                        {branch.name}
                      </span>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => {
                            setEditingBranchId(branch.id);
                            setEditingBranchName(branch.name);
                          }}
                          className={`p-1 rounded-md ${isDark ? 'hover:bg-white/20' : 'hover:bg-black/20'}`}
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteBranch(branch.id)}
                          className={`p-1 rounded-md ${isDark ? 'hover:bg-red-500/30' : 'hover:bg-red-500/20'}`}
                        >
                          <Trash2 className="w-4 h-4 text-red-500" />
                        </button>
                      </div>
                    </div>
                    <p className={`text-xs transition-colors duration-500 ${isDark ? "text-gray-400" : "text-gray-600"}`}>
                      {branch.messages.length} msgs • {branch.createdAt.toLocaleDateString()}
                    </p>
                  </>
                )}
              </div>
            ))}
          </div>

          {/* New Branch Dialog */}
          {showNewBranchDialog && (
            <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
              <div
                className={`p-8 rounded-2xl w-full max-w-md transition-all duration-500 ${
                  isDark ? "bg-gray-900/90 border-white/20" : "bg-white/90 border-black/20"
                } backdrop-blur-xl border shadow-2xl`}
              >
                <h3
                  className={`text-xl font-bold mb-6 transition-colors duration-500 ${
                    isDark ? "text-white" : "text-gray-900"
                  }`}
                >
                  Create New Branch
                </h3>
                <input
                  type="text"
                  value={newBranchName}
                  onChange={(e) => setNewBranchName(e.target.value)}
                  onKeyPress={(e) => e.key === "Enter" && handleCreateBranch()}
                  placeholder="Branch name..."
                  className={`w-full px-4 py-3 rounded-xl transition-all duration-500 ${
                    isDark
                      ? "bg-white/10 border-white/20 text-white placeholder-gray-400"
                      : "bg-black/10 border-black/20 text-gray-900 placeholder-gray-600"
                  } backdrop-blur-sm border focus:outline-none focus:ring-2 ${
                    isDark ? "focus:ring-purple-500/50" : "focus:ring-indigo-500/50"
                  } mb-6`}
                  autoFocus
                />
                <div className="flex gap-3">
                  <button
                    onClick={handleCreateBranch}
                    className={`flex-1 px-6 py-3 rounded-xl font-medium transition-all duration-300 ${
                      isDark
                        ? "bg-purple-500/30 hover:bg-purple-500/40 text-purple-300 border-purple-500/30"
                        : "bg-indigo-500/20 hover:bg-indigo-500/30 text-indigo-700 border-indigo-500/30"
                    } backdrop-blur-sm border hover:scale-105 active:scale-95 transform`}
                  >
                    Create Branch
                  </button>
                  <button
                    onClick={() => setShowNewBranchDialog(false)}
                    className={`flex-1 px-6 py-3 rounded-xl font-medium transition-all duration-300 ${
                      isDark
                        ? "bg-white/10 hover:bg-white/20 text-gray-300 border-white/20"
                        : "bg-black/10 hover:bg-black/20 text-gray-700 border-black/20"
                    } backdrop-blur-sm border hover:scale-105 active:scale-95 transform`}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
