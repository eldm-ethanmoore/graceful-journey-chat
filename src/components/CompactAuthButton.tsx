import React from 'react';
import { ConnectButton } from '@rainbow-me/rainbowkit';

interface CompactAuthButtonProps {
  isDark: boolean;
  onClick?: () => void;
}

/**
 * A wallet authentication button for the header
 */
export const CompactAuthButton: React.FC<CompactAuthButtonProps> = ({
  isDark,
  onClick
}) => {
  const handleClick = (e: React.MouseEvent) => {
    // Stop event propagation to prevent it from being caught by parent elements
    e.stopPropagation();
    
    // Log to verify the function is being called
    console.log("CompactAuthButton: handleClick called");
    
    // Still call the original onClick if provided
    if (onClick) {
      try {
        onClick();
      } catch (callbackError) {
        console.error("CompactAuthButton: Error in onClick callback", callbackError);
      }
    }
  };
  
  return (
    <ConnectButton.Custom>
      {({
        account,
        chain,
        openAccountModal,
        openChainModal,
        openConnectModal,
        mounted,
      }) => {
        return (
          <div
            {...(!mounted && {
              'aria-hidden': true,
              'style': {
                opacity: 0,
                pointerEvents: 'none',
                userSelect: 'none',
              },
            })}
          >
            {(() => {
              if (!mounted || !account || !chain) {
                return (
                  <button
                    className={`px-2 py-1 rounded-lg transition-colors duration-300 ${
                      isDark
                        ? "bg-[#03a9f4]/20 hover:bg-[#03a9f4]/30 text-[#03a9f4]"
                        : "bg-[#0088fb]/10 hover:bg-[#0088fb]/20 text-[#0088fb]"
                    } flex items-center gap-1 text-xs font-medium`}
                    title="Connect Wallet"
                    onClick={openConnectModal}
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M20 12V8H6a2 2 0 0 1-2-2c0-1.1.9-2 2-2h12v4" />
                      <path d="M20 12v4H6a2 2 0 0 0-2 2c0 1.1.9 2 2 2h12v-4" />
                      <path d="M20 12h2v4h-2v-4Z" />
                    </svg>
                  </button>
                );
              }

              return (
                <button
                  className={`px-2 py-1 rounded-lg transition-colors duration-300 ${
                    isDark
                      ? "bg-[#03a9f4]/20 hover:bg-[#03a9f4]/30 text-[#03a9f4]"
                      : "bg-[#0088fb]/10 hover:bg-[#0088fb]/20 text-[#0088fb]"
                  } flex items-center gap-1 text-xs font-medium`}
                  title="Connected"
                  onClick={openAccountModal}
                >
                  <span className="hidden sm:inline">{account.displayName}</span>
                </button>
              );
            })()}
          </div>
        );
      }}
    </ConnectButton.Custom>
  );
};