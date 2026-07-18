import React, { createContext, useContext, useState, useCallback } from 'react';
import { StatusModal } from '@/features/pos/components/StatusModal';

interface ShowStatusOptions {
  type: 'success' | 'error' | 'warning';
  title: string;
  message: string;
  actionText?: string;
  onClose?: () => void;
}

interface StatusModalContextType {
  showStatus: (options: ShowStatusOptions) => void;
  hideStatus: () => void;
}

const StatusModalContext = createContext<StatusModalContextType | undefined>(undefined);

export const StatusModalProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isVisible, setIsVisible] = useState(false);
  const [config, setConfig] = useState<ShowStatusOptions>({
    type: 'success',
    title: '',
    message: '',
  });

  const showStatus = useCallback((options: ShowStatusOptions) => {
    setConfig(options);
    setIsVisible(true);
  }, []);

  const hideStatus = useCallback(() => {
    setIsVisible(false);
    if (config.onClose) {
      config.onClose();
    }
  }, [config]);

  return (
    <StatusModalContext.Provider value={{ showStatus, hideStatus }}>
      {children}
      <StatusModal
        isVisible={isVisible}
        type={config.type}
        title={config.title}
        message={config.message}
        actionText={config.actionText}
        onClose={hideStatus}
      />
    </StatusModalContext.Provider>
  );
};

export const useStatusModal = () => {
  const context = useContext(StatusModalContext);
  if (!context) {
    throw new Error('useStatusModal must be used within a StatusModalProvider');
  }
  return context;
};
