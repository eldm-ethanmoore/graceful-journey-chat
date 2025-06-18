import React from 'react';

interface CompactSyncButtonProps {
  isDark: boolean;
  isSyncing: boolean;
  onClick: () => void;
}

/**
 * A compact sync button for the header
 */
export const CompactSyncButton: React.FC<CompactSyncButtonProps> = ({
  isDark,
  isSyncing,
  onClick
}) => {
  return (
    <button
      onClick={onClick}
      className={`p-2 rounded-lg transition-colors duration-300 ${
        isDark
          ? isSyncing ? "bg-[#2ecc71]/30 text-[#2ecc71]" : "bg-[#03a9f4]/20 hover:bg-[#03a9f4]/30 text-[#03a9f4]"
          : isSyncing ? "bg-[#54ad95]/30 text-[#54ad95]" : "bg-[#0088fb]/10 hover:bg-[#0088fb]/20 text-[#0088fb]"
      } flex items-center gap-1`}
      title="Sync"
    >
      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 12a9 9 0 0 1-9 9m9-9a9 9 0 0 0-9-9m9 9H3m9 9a9 9 0 0 1-9-9m9 9c-4.97 0-9-4.03-9-9m9 0a9 9 0 0 1 9 9"/>
      </svg>
      {isSyncing && <span className="animate-pulse">•</span>}
    </button>
  );
};