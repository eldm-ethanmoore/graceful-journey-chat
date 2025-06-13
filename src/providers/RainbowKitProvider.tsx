import React from 'react';
import '@rainbow-me/rainbowkit/styles.css';
import {
  RainbowKitProvider as RKProvider,
  darkTheme,
  lightTheme,
  getDefaultConfig,
} from '@rainbow-me/rainbowkit';
import { WagmiConfig } from 'wagmi';
import { mainnet } from 'wagmi/chains';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

// Create a client for react-query
const queryClient = new QueryClient();

// Create a simplified config
const config = getDefaultConfig({
  appName: 'Graceful Journey Chat',
  projectId: '7a77bcd9f0b1d9c8a9e5f1d6e3c2b1a0', // WalletConnect project ID
  chains: [mainnet],
  ssr: false, // Disable server-side rendering
});

interface RainbowKitProviderProps {
  children: React.ReactNode;
  isDark?: boolean;
}

export const RainbowKitProvider: React.FC<RainbowKitProviderProps> = ({
  children,
  isDark = true
}) => {
  return (
    <WagmiConfig config={config}>
      <QueryClientProvider client={queryClient}>
        <RKProvider
          theme={isDark ? darkTheme() : lightTheme()}
          modalSize="compact"
        >
          {children}
        </RKProvider>
      </QueryClientProvider>
    </WagmiConfig>
  );
};