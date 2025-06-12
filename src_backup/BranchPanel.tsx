"use client"

import { useState, useEffect } from "react"
import { ConversationStore } from "./conversationStore"
import type { Branch, Message } from "./conversationStore"
import { ChevronLeft, ChevronRight, Plus, Camera, GitBranch } from "lucide-react"

interface BranchPanelProps {
  currentBranch: Branch | null;
  onBranchSelect: (branch: Branch) => void;
  onCreateBranch: (name: string) => void;
  messages: Message[];
  isDark: boolean;
}

export function BranchPanel({ currentBranch, onBranchSelect, onCreateBranch, messages, isDark }: BranchPanelProps) {
  const [branches, setBranches] = useState<Branch[]>([]);
  const [showNewBranchDialog, setShowNewBranchDialog] = useState(false);
  const [newBranchName, setNewBranchName] = useState('');
  const [expandedView, setExpandedView] = useState(false);

  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
    if (typeof window !== 'undefined') {
      loadBranches();
    }
  }, []);

  if (!isClient) {
    return (
      <div className={`w-16 ${isDark ? 'bg-black/20' : 'bg-white/20'} border-r`}>
        {/* Loading state */}
      </div>
    );
  }

  const loadBranches = async () => {
    const allBranches = await ConversationStore.getAllBranches();
    setBranches(allBranches);
  };

  const handleCreateBranch = async () => {
    if (newBranchName.trim()) {
      await onCreateBranch(newBranchName);
      setNewBranchName('');
      setShowNewBranchDialog(false);
      loadBranches();
    }
  };

  const handleSnapshot = async () => {
    if (currentBranch) {
      const description = prompt('Snapshot description (optional):');
      await ConversationStore.createSnapshot(currentBranch.id, messages, description || undefined);
      alert('Snapshot saved!');
    }
  };

  return (
    <div
      className={`transition-all duration-500 ${expandedView ? "w-80" : "w-16"} ${
        isDark ? "bg-black/20 border-white/10" : "bg-white/20 border-black/10"
      } backdrop-blur-xl border-r relative`}
    >
      {/* Collapse/Expand Button */}
      <button
        onClick={() => setExpandedView(!expandedView)}
        className={`w-full p-4 transition-all duration-300 ${
          isDark ? "hover:bg-white/10 text-gray-300" : "hover:bg-black/10 text-gray-700"
        } flex items-center justify-center group`}
      >
        {expandedView ? (
          <ChevronLeft className="w-5 h-5 group-hover:scale-110 transition-transform" />
        ) : (
          <ChevronRight className="w-5 h-5 group-hover:scale-110 transition-transform" />
        )}
      </button>

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
                onClick={() => onBranchSelect(branch)}
                className={`p-4 rounded-xl cursor-pointer transition-all duration-300 ${
                  currentBranch?.id === branch.id
                    ? isDark
                      ? "bg-purple-500/30 border-purple-500/50 shadow-lg shadow-purple-500/20"
                      : "bg-indigo-500/20 border-indigo-500/40 shadow-lg shadow-indigo-500/10"
                    : isDark
                    ? "bg-white/5 hover:bg-white/10 border-white/10 hover:border-white/20"
                    : "bg-black/5 hover:bg-black/10 border-black/10 hover:border-black/20"
                } backdrop-blur-sm border hover:scale-105 transform`}
              >
                <div className="flex items-center justify-between mb-2">
                  <span
                    className={`font-medium transition-colors duration-500 ${isDark ? "text-white" : "text-gray-900"}`}
                  >
                    {branch.name}
                  </span>
                  {branch.parentId && (
                    <span
                      className={`text-xs px-2 py-1 rounded-full transition-colors duration-500 ${
                        isDark ? "bg-yellow-500/20 text-yellow-300" : "bg-yellow-500/10 text-yellow-700"
                      }`}
                    >
                      forked
                    </span>
                  )}
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  {branch.messages.length} msgs • {branch.createdAt.toLocaleDateString()}
                </p>
              </div>
            ))}
          </div>

          {/* New Branch Dialog */}
          {showNewBranchDialog && (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
              <div className="bg-gray-800 p-6 rounded-xl w-96">
                <h3 className="text-lg font-semibold mb-4">Create New Branch</h3>
                <input
                  type="text"
                  value={newBranchName}
                  onChange={(e) => setNewBranchName(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleCreateBranch()}
                  placeholder="Branch name..."
                  className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg focus:outline-none focus:border-purple-500 mb-4"
                  autoFocus
                />
                <div className="flex gap-3">
                  <button
                    onClick={handleCreateBranch}
                    className="flex-1 px-4 py-2 bg-purple-600 hover:bg-purple-700 rounded-lg font-medium transition-colors"
                  >
                    Create Branch
                  </button>
                  <button
                    onClick={() => setShowNewBranchDialog(false)}
                    className="flex-1 px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg font-medium transition-colors"
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
  );
}