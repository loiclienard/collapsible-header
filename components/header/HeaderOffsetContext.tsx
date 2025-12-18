// HeaderOffsetContext.tsx
import React, { createContext, ReactNode, useContext } from 'react';
import { Animated } from 'react-native';

type HeaderOffsetContextType = Animated.Value | null;

const HeaderOffsetContext = createContext<HeaderOffsetContextType>(null);

type HeaderOffsetProviderProps = {
  value: Animated.Value;
  children: ReactNode;
};

export function HeaderOffsetProvider({ value, children }: HeaderOffsetProviderProps) {
  return (
    <HeaderOffsetContext.Provider value={value}>
      {children}
    </HeaderOffsetContext.Provider>
  );
}

export function useHeaderOffset(): Animated.Value | null {
  return useContext(HeaderOffsetContext);
}