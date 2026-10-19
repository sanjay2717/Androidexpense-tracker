import React, { createContext, useContext, useState, useCallback, useMemo } from 'react';
import { useQueryClient } from '@tanstack/react-query';

interface LoadingContextType {
  reloadApp: () => void;
  isLoadingVisible: boolean;
  loadingKey: number;
  handleLoadingFinish: () => void;
}

const LoadingContext = createContext<LoadingContextType>({
  reloadApp: () => {},
  isLoadingVisible: false,
  loadingKey: 0,
  handleLoadingFinish: () => {},
});

export const useLoading = () => useContext(LoadingContext);

export function LoadingProvider({ children }: { children: React.ReactNode }) {
  const queryClient = useQueryClient();
  const [loadingKey, setLoadingKey] = useState(0);
  const [isLoadingVisible, setIsLoadingVisible] = useState(true);

  const reloadApp = useCallback(() => {
    queryClient.invalidateQueries();
    setLoadingKey((prev) => prev + 1);
    setIsLoadingVisible(true);
  }, [queryClient]);

  const handleLoadingFinish = useCallback(() => {
    setIsLoadingVisible(false);
  }, []);

  const value = useMemo(
    () => ({
      reloadApp,
      isLoadingVisible,
      loadingKey,
      handleLoadingFinish,
    }),
    [reloadApp, isLoadingVisible, loadingKey, handleLoadingFinish]
  );

  return <LoadingContext.Provider value={value}>{children}</LoadingContext.Provider>;
}
