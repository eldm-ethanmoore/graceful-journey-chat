import React from "react";
import { X } from "lucide-react";

interface ModelSwitchConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onKeepContext: () => void;
  onResetContext: () => void;
  isDark: boolean;
  newModelName: string;
}

export const ModelSwitchConfirmModal: React.FC<ModelSwitchConfirmModalProps> = ({
  isOpen,
  onClose,
  onKeepContext,
  onResetContext,
  isDark,
  newModelName
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div
        className={`w-full max-w-md rounded-2xl p-6 shadow-2xl transition-all duration-300 ${
          isDark ? 'bg-[#333333] text-white' : 'bg-white text-gray-900'
        }`}
      >
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-bold">Switch Model</h2>
          <button
            onClick={onClose}
            className={`p-1 rounded-full ${isDark ? 'hover:bg-[#444444]' : 'hover:bg-gray-100'}`}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <p className={`mb-4 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
          You're switching to <span className="font-semibold">{newModelName}</span>. Would you like to:
        </p>

        <div className="flex flex-col sm:flex-row gap-3 mt-6">
          <button
            onClick={onKeepContext}
            className={`flex-1 px-4 py-3 text-sm font-medium rounded-xl transition-all duration-300 ${
              isDark
                ? "bg-[#03a9f4]/30 hover:bg-[#03a9f4]/40 text-[#03a9f4] border-[#03a9f4]/30"
                : "bg-[#54ad95]/20 hover:bg-[#54ad95]/30 text-[#54ad95] border-[#54ad95]/30"
            } backdrop-blur-sm border hover:scale-105 active:scale-95`}
          >
            Keep Conversation
          </button>
          <button
            onClick={onResetContext}
            className={`flex-1 px-4 py-3 text-sm font-medium rounded-xl transition-all duration-300 ${
              isDark
                ? "bg-[#2ecc71]/30 hover:bg-[#2ecc71]/40 text-[#2ecc71] border-[#2ecc71]/30"
                : "bg-[#0088fb]/20 hover:bg-[#0088fb]/30 text-[#0088fb] border-[#0088fb]/30"
            } backdrop-blur-sm border hover:scale-105 active:scale-95`}
          >
            Reset Conversation
          </button>
        </div>
      </div>
    </div>
  );
};