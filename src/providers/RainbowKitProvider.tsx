import React, { useEffect, useState } from 'react';
import '@rainbow-me/rainbowkit/styles.css';
import {
  RainbowKitProvider as RKProvider,
  darkTheme,
  lightTheme,
  getDefaultConfig,
} from '@rainbow-me/rainbowkit';
import { WagmiProvider } from 'wagmi';
import { mainnet } from 'wagmi/chains';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { http } from 'wagmi';

// Use the WalletConnect project ID from environment variables only
const projectId = import.meta.env.VITE_WALLET_CONNECT_PROJECT_ID; // Temporary fallback for testing

// Log whether we're using the environment variable
if (import.meta.env.VITE_WALLET_CONNECT_PROJECT_ID) {
  console.log("Using WalletConnect project ID from environment variables");
} else {
  console.warn("Using temporary fallback projectId for testing - replace with environment variable in production");
}

// Create a wagmi config using RainbowKit's getDefaultConfig
const config = getDefaultConfig({
  appName: 'OSS-Graceful-Journey',
  projectId: projectId,
  chains: [mainnet],
  transports: {
    [mainnet.id]: http(),
  },
});

// Create a client for react-query
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 2, // Reduce retry attempts for better error handling
      refetchOnWindowFocus: false, // Prevent unnecessary refetches
    },
  },
});

// Log configuration for debugging
console.log("RainbowKit configuration initialized with wagmi v2");

// Global error handler for wallet connection issues
if (typeof window !== 'undefined') {
  window.addEventListener('unhandledrejection', (event) => {
    // Check if it's a wallet connection error
    if (event.reason &&
        (event.reason.message?.includes('wallet') ||
         event.reason.message?.includes('connect') ||
         event.reason.message?.includes('provider'))) {
      
      // Log the error but prevent it from showing alerts
      console.error('Wallet connection error (handled silently):', event.reason);
      
      // Prevent the default browser error handling
      event.preventDefault();
    }
  });
}

interface RainbowKitProviderProps {
  children: React.ReactNode;
  isDark?: boolean;
}

// Fallback component to render when RainbowKit fails to initialize
const FallbackProvider: React.FC<{children: React.ReactNode, isDark: boolean}> = ({
  children,
  isDark
}) => {
  return (
    <div className={`p-4 rounded-xl transition-all duration-500 ${
      isDark ? 'bg-[#333333]/60 border-[#2ecc71]/30' : 'bg-[#f0f8ff]/60 border-[#54ad95]/30'
    } backdrop-blur-xl border`}>
      <div className="text-center p-4">
        <p className={`text-sm ${isDark ? 'text-white' : 'text-gray-900'}`}>
          Wallet connection is temporarily unavailable.
        </p>
        <p className={`text-xs mt-2 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
          Please try again later or check the console for details.
        </p>
      </div>
      {children}
    </div>
  );
};

export const RainbowKitProvider: React.FC<RainbowKitProviderProps> = ({
  children,
  isDark = true
}) => {
  const [hasError, setHasError] = useState(false);

  // Add error monitoring for wallet connection issues
  useEffect(() => {
    const handleError = (error: ErrorEvent) => {
      // Check if it's a wallet-related error
      if (error.error &&
          (error.error.message?.includes('wallet') ||
           error.error.message?.includes('connect') ||
           error.error.message?.includes('provider') ||
           error.error.message?.includes('ethereum'))) {
        
        // Log the error but prevent it from showing alerts
        console.error('Wallet error intercepted (handled silently):', error.error);
        
        // Prevent the default browser error handling
        error.preventDefault();
      }
    };

    // Add global error handler for unhandled promise rejections
    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      if (event.reason &&
          (String(event.reason).includes('wallet') ||
           String(event.reason).includes('connect') ||
           String(event.reason).includes('provider'))) {
        
        console.error('Unhandled wallet promise rejection (handled silently):', event.reason);
        event.preventDefault();
      }
    };

    // Add global error handlers
    window.addEventListener('error', handleError);
    window.addEventListener('unhandledrejection', handleUnhandledRejection);
    
    // Log provider initialization
    console.log("RainbowKit provider mounted with theme:", isDark ? "dark" : "light");
    
    return () => {
      // Clean up event listeners
      window.removeEventListener('error', handleError);
      window.removeEventListener('unhandledrejection', handleUnhandledRejection);
    };
  }, [isDark]);

  // If we've detected an error, show the fallback UI
  if (hasError) {
    return <FallbackProvider isDark={isDark}>{children}</FallbackProvider>;
  }

  // Otherwise, try to render the normal provider
  try {
    return (
      <WagmiProvider config={config}>
        <QueryClientProvider client={queryClient}>
          <RKProvider
            theme={isDark ? darkTheme({
              accentColor: '#2ecc71',
              accentColorForeground: 'white',
            }) : lightTheme({
              accentColor: '#54ad95',
              accentColorForeground: 'white',
            })}
            modalSize="compact"
            showRecentTransactions={false}
            appInfo={{
              appName: 'OSS-Graceful-Journey',
            }}
          >
            {children}
          </RKProvider>
        </QueryClientProvider>
      </WagmiProvider>
    );
  } catch (error) {
    // If we catch an error during rendering, log it and show the fallback
    console.error("Failed to initialize RainbowKit provider:", error);
    
    // Update state to show fallback on next render
    if (!hasError) {
      setHasError(true);
    }
    
    // Return fallback UI with proper providers
    return (
      <WagmiProvider config={config}>
        <QueryClientProvider client={queryClient}>
          <FallbackProvider isDark={isDark}>{children}</FallbackProvider>
        </QueryClientProvider>
      </WagmiProvider>
    );
  }
};