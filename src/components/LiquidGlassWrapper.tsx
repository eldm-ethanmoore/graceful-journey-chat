import React from 'react';
import '../styles/liquidGlass.css';

interface LiquidGlassWrapperProps {
  children: React.ReactNode;
  className?: string;
  isDark?: boolean;
}

/**
 * A wrapper component that applies the liquid glass effect to its children
 */
export const LiquidGlassWrapper: React.FC<LiquidGlassWrapperProps> = ({
  children,
  className = '',
  isDark = true
}) => {
  return (
    <div className={`liquidGlass-wrapper ${className} ${isDark ? 'dark' : 'light'}`}>
      {/* Glass distortion effect layer */}
      <div className="liquidGlass-effect"></div>
      
      {/* Tint layer for color */}
      <div className="liquidGlass-tint"></div>
      
      {/* Shine effect layer */}
      <div className="liquidGlass-shine"></div>
      
      {/* Content layer */}
      <div className="liquidGlass-content">
        {children}
      </div>
    </div>
  );
};

export default LiquidGlassWrapper;