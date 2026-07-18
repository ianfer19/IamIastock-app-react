import React, { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { ChatListScreen } from './ChatListScreen';
import { ChatRoomScreen } from './ChatRoomScreen';
import { useTheme } from '@/core/theme/theme';

export const OmniChatScreen = ({ onBack }: { onBack: () => void }) => {
  const { colors } = useTheme();
  const [activeChatId, setActiveChatId] = useState<string | null>(null);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {activeChatId === null ? (
        <ChatListScreen 
          onBack={onBack} 
          onSelectChat={(chatId) => setActiveChatId(chatId)} 
        />
      ) : (
        <ChatRoomScreen 
          chatId={activeChatId} 
          onBack={() => setActiveChatId(null)} 
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
