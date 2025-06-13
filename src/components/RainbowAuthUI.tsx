import React, { useEffect } from 'react';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { Wallet } from 'lucide-react';

// Define props for the RainbowAuthUI component
interface RainbowAuthUIProps {
  isDark: boolean;
  authServerUrl: string;
  onAuthChange?: (isAuthenticated: boolean) => void;
}

/**
 * RainbowAuthUI component for wallet authentication using RainbowKit
 */
export const RainbowAuthUI: React.FC<RainbowAuthUIProps> = ({
  isDark,
  authServerUrl,
  onAuthChange
}) => {
  // Notify parent component when mounted
  useEffect(() => {
    if (onAuthChange) {
      // We'll consider the user authenticated when the component mounts
      // In a real app, you'd check the actual connection status
      onAuthChange(false);
    }
  }, [onAuthChange]);
  
  return (
    <div className={`p-4 rounded-xl transition-all duration-500 ${
      isDark ? 'bg-[#333333]/60 border-[#2ecc71]/30' : 'bg-[#f0f8ff]/60 border-[#54ad95]/30'
    } backdrop-blur-xl border`}>
      <div className="flex items-center gap-2 mb-4">
        <Wallet className={`w-5 h-5 ${isDark ? 'text-[#2ecc71]' : 'text-[#54ad95]'}`} />
        <h2 className={`text-lg font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
          Wallet Authentication
        </h2>
      </div>
      
      {/* RainbowKit Connect Button */}
      <div className="my-4">
        <ConnectButton
          chainStatus="icon"
          showBalance={false}
          accountStatus={{
            smallScreen: 'avatar',
            largeScreen: 'full',
          }}
        />
      </div>
      
      {/* Information Text */}
      <p className={`mt-4 text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
        Connect your wallet for enhanced features (optional)
      </p>
    </div>
  );
};