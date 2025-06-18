import React, { useState, useEffect } from 'react';

interface SendDataButtonProps {
  isDark: boolean;
  isSending: boolean;
  onClick: () => void;
  syncCode?: string | null;
}

/**
 * A button for sending data via sync
 */
export const SendDataButton: React.FC<SendDataButtonProps> = ({
  isDark,
  isSending,
  onClick,
  syncCode
}) => {
  const [countdown, setCountdown] = useState<number | null>(null);
  const [displayCode, setDisplayCode] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (isSending && !countdown && !displayCode) {
      // Start countdown when sending begins
      setCountdown(30);
    }

    if (!isSending) {
      // Reset when sending stops
      setCountdown(null);
      setDisplayCode(null);
      setCopied(false);
    }
  }, [isSending]);

  // Update displayCode whenever syncCode changes and we're sending
  useEffect(() => {
    if (isSending && syncCode && !displayCode) {
      // If we're sending and have a syncCode but no displayCode yet, set it
      if (countdown === 0 || countdown === null) {
        setDisplayCode(syncCode);
        
        // Copy to clipboard
        navigator.clipboard.writeText(syncCode)
          .then(() => setCopied(true))
          .catch(err => console.error('Failed to copy code:', err));
      }
    }
  }, [isSending, syncCode, countdown, displayCode]);

  useEffect(() => {
    let timer: NodeJS.Timeout;
    
    if (countdown !== null && countdown > 0) {
      timer = setTimeout(() => {
        setCountdown(countdown - 1);
      }, 1000);
    } else if (countdown === 0 && syncCode) {
      // When countdown reaches 0, display the code
      setDisplayCode(syncCode);
      setCountdown(null);
      
      // Copy to clipboard
      navigator.clipboard.writeText(syncCode)
        .then(() => setCopied(true))
        .catch(err => console.error('Failed to copy code:', err));
    }
    
    return () => {
      if (timer) clearTimeout(timer);
    };
  }, [countdown, syncCode]);

  // Update displayCode whenever syncCode changes and we're sending
  useEffect(() => {
    if (isSending && syncCode && !countdown) {
      setDisplayCode(syncCode);
      
      // Copy to clipboard
      navigator.clipboard.writeText(syncCode)
        .then(() => setCopied(true))
        .catch(err => console.error('Failed to copy code:', err));
    }
  }, [isSending, syncCode]);

  return (
    <div className="flex flex-col items-center">
      <button
        onClick={onClick}
        className={`px-2 py-1 rounded-lg transition-colors duration-300 ${
          isDark
            ? isSending ? "bg-[#2ecc71]/30 text-[#2ecc71]" : "bg-[#03a9f4]/20 hover:bg-[#03a9f4]/30 text-[#03a9f4]"
            : isSending ? "bg-[#54ad95]/30 text-[#54ad95]" : "bg-[#0088fb]/10 hover:bg-[#0088fb]/20 text-[#0088fb]"
        } flex items-center gap-1 text-xs font-medium`}
        title="Send Data"
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M22 2 11 13M22 2l-7 20-4-9-9-4 20-7z"/>
        </svg>
        <span className="hidden sm:inline">Send</span>
        {isSending && <span className="animate-pulse">•</span>}
      </button>
      
      {countdown !== null && (
        <div className={`text-xs mt-1 ${isDark ? "text-white/70" : "text-black/70"}`}>
          {countdown}s
        </div>
      )}
      
      {displayCode && (
        <div className="mt-1 flex flex-col items-center">
          <div className={`text-xs font-mono bg-black/10 px-2 py-1 rounded ${
            isDark ? "text-[#2ecc71]" : "text-[#54ad95]"
          }`}>
            {displayCode}
          </div>
          <div className={`text-xs mt-0.5 ${copied ? "text-green-500" : isDark ? "text-white/50" : "text-black/50"}`}>
            {copied ? "Copied!" : "Click to copy"}
          </div>
        </div>
      )}
    </div>
  );
};
