import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  TextInput,
  ScrollView,
  Dimensions,
  Animated,
  Platform,
  KeyboardAvoidingView,
  ActivityIndicator,
  Linking,
  Modal
} from 'react-native';
import { MotiView, AnimatePresence } from 'moti';
import * as Haptics from 'expo-haptics';
import { BlurView } from 'expo-blur';
import { Audio, Video } from 'expo-av';
import { 
  ArrowLeft, 
  Send, 
  Sparkles, 
  FileText, 
  UserCheck, 
  X, 
  MessageSquare, 
  Check, 
  Paperclip,
  CheckCheck,
  AlertTriangle,
  Play,
  Pause,
  Download
} from 'lucide-react-native';

import { useTheme } from '@/core/theme/theme';
import { rem } from '@/core/utils/responsive';
import { useOmniChannelChat } from '@/presentation/hooks/useOmniChannelChat';
import { ChatMessage, ChatConversation } from '@/domain/entities/Chat';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

// SVG Icons
import WhatsAppIcon from './icons/WhatsAppIcon';
import InstagramIcon from './icons/InstagramIcon';
import MessengerIcon from './icons/MessengerIcon';
import WebIcon from './icons/WebIcon';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface AudioBubblePlayerProps {
  audioUrl: string;
  isClient: boolean;
  colors: any;
}

const AudioBubblePlayer = ({ audioUrl, isClient, colors }: AudioBubblePlayerProps) => {
  const soundRef = useRef<Audio.Sound | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [position, setPosition] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    return () => {
      if (soundRef.current) {
        soundRef.current.unloadAsync().catch(() => {});
      }
    };
  }, []);

  const onPlaybackStatusUpdate = (status: any) => {
    if (status.isLoaded) {
      setPosition(status.positionMillis);
      setDuration(status.durationMillis || 0);
      setIsPlaying(status.isPlaying);
      if (status.didJustFinish) {
        setIsPlaying(false);
        setPosition(0);
        soundRef.current?.setPositionAsync(0).catch(() => {});
      }
    } else if (status.error) {
      console.error(`[Audio] Playback error: ${status.error}`);
    }
  };

  const playSound = async () => {
    try {
      setIsLoading(true);
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: false,
        playsInSilentModeIOS: true,
        shouldRouteThroughReceiverIOS: false,
        staysActiveInBackground: false,
      });

      if (soundRef.current) {
        setIsLoading(false);
        await soundRef.current.playAsync();
        setIsPlaying(true);
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      } else {
        const { sound } = await Audio.Sound.createAsync(
          { uri: audioUrl },
          { shouldPlay: true },
          onPlaybackStatusUpdate
        );
        soundRef.current = sound;
        setIsLoading(false);
        setIsPlaying(true);
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      }
    } catch (err) {
      setIsLoading(false);
      console.error('Error playing sound:', err);
    }
  };

  const pauseSound = async () => {
    try {
      if (soundRef.current) {
        await soundRef.current.pauseAsync();
        setIsPlaying(false);
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      }
    } catch (err) {
      console.error('Error pausing sound:', err);
    }
  };

  const togglePlay = async () => {
    if (isPlaying) {
      await pauseSound();
    } else {
      await playSound();
    }
  };

  const progressPercent = duration > 0 ? position / duration : 0;

  // Replicate beautiful dynamic waveform
  const waves = [12, 18, 8, 15, 22, 10, 14, 20, 6, 12, 18, 10, 16, 24, 8, 14, 18, 10];
  const numBars = waves.length;

  const formatTime = (ms: number) => {
    if (!ms || isNaN(ms)) return '0:00';
    const totalSecs = Math.floor(ms / 1000);
    const mins = Math.floor(totalSecs / 60);
    const secs = totalSecs % 60;
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  const activeColor = isClient ? colors.primary : '#FFFFFF';
  const inactiveColor = isClient ? 'rgba(0, 0, 0, 0.15)' : 'rgba(255, 255, 255, 0.35)';

  return (
    <View style={audioStyles.playerContainer}>
      <TouchableOpacity 
        style={[
          audioStyles.playBtn, 
          { backgroundColor: isClient ? colors.primary + '15' : 'rgba(255,255,255,0.2)' }
        ]} 
        onPress={togglePlay}
        disabled={isLoading}
      >
        {isLoading ? (
          <ActivityIndicator size="small" color={activeColor} />
        ) : isPlaying ? (
          <Pause size={rem(14)} color={activeColor} fill={activeColor} />
        ) : (
          <Play size={rem(14)} color={activeColor} fill={activeColor} />
        )}
      </TouchableOpacity>

      <View style={audioStyles.waveformCol}>
        <View style={audioStyles.waveformRow}>
          {waves.map((height, i) => {
            const barProgress = (i / numBars);
            const isActive = progressPercent > barProgress;
            return (
              <View 
                key={i} 
                style={[
                  audioStyles.waveBar, 
                  { 
                    height: rem(height), 
                    backgroundColor: isActive ? activeColor : inactiveColor 
                  }
                ]} 
              />
            );
          })}
        </View>

        <View style={audioStyles.timeRow}>
          <Text style={[audioStyles.timeText, { color: isClient ? colors.textMuted : 'rgba(255,255,255,0.7)' }]}>
            {formatTime(position)} / {formatTime(duration || 0)}
          </Text>
        </View>
      </View>
    </View>
  );
};

const audioStyles = StyleSheet.create({
  playerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: rem(4),
    width: rem(200),
  },
  playBtn: {
    width: rem(32),
    height: rem(32),
    borderRadius: rem(16),
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: rem(10),
  },
  waveformCol: {
    flex: 1,
    justifyContent: 'center',
  },
  waveformRow: {
    flexDirection: 'row',
    alignItems: 'center',
    height: rem(26),
  },
  waveBar: {
    width: rem(3),
    borderRadius: rem(1.5),
    marginHorizontal: rem(1.5),
  },
  timeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: rem(2),
  },
  timeText: {
    fontSize: rem(8),
    fontFamily: 'Inter-Medium',
  },
});

interface ChatRoomScreenProps {
  chatId: string;
  onBack: () => void;
}

export const ChatRoomScreen = ({ chatId, onBack }: ChatRoomScreenProps) => {
  const { colors, mode } = useTheme();
  const styles = getStyles(colors, mode);
  const insets = useSafeAreaInsets();

  const {
    conversations,
    messages,
    loadingMessages,
    currentAgent,
    selectConversation,
    sendTextMessage,
    assignToMe,
    closeTicket,
    reopenTicket,
    generateAiReply
  } = useOmniChannelChat();

  const [inputText, setInputText] = useState('');
  const [isWhisper, setIsWhisper] = useState(false); // Mode for internal private staff coordinate notes
  const [aiDraft, setAiDraft] = useState('');
  const [generatingAi, setGeneratingAi] = useState(false);
  const [showStatusMenu, setShowStatusMenu] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);

  // References for dynamic scrolling
  const scrollRef = useRef<ScrollView>(null);

  // Locate current conversation metadata
  const conversation = useMemo(() => {
    return conversations.find(c => c.id === chatId);
  }, [conversations, chatId]);

  useEffect(() => {
    selectConversation(chatId);
    return () => {
      selectConversation(null); // Clean up active routing on unmount
    };
  }, [chatId]);

  // Scroll to bottom on new messages
  useEffect(() => {
    if (scrollRef.current && messages.length > 0) {
      setTimeout(() => {
        scrollRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  }, [messages]);

  const handleSend = () => {
    if (!inputText.trim()) return;
    sendTextMessage(inputText.trim(), isWhisper ? 'whisper' : 'normal');
    setInputText('');
    setIsWhisper(false); // Reset to normal messages
  };

  const handleSuggestAiReply = async () => {
    if (messages.length === 0 || generatingAi) return;
    
    // Find last client message in history
    const lastClientMsg = [...messages]
      .reverse()
      .find(m => m.sender === 'client');

    if (!lastClientMsg) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      return;
    }

    setGeneratingAi(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    try {
      const suggestion = await generateAiReply(lastClientMsg.text);
      setAiDraft(suggestion);
    } catch (e) {
      console.error(e);
    } finally {
      setGeneratingAi(false);
    }
  };

  const handleApplyAiDraft = () => {
    setInputText(aiDraft);
    setAiDraft('');
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const renderChannelLogo = (channel: ChatConversation['channel'], size = 18) => {
    switch (channel) {
      case 'whatsapp':
        return <WhatsAppIcon size={rem(size)} color="#25D366" />;
      case 'instagram':
        return <InstagramIcon size={rem(size)} color="#E1306C" />;
      case 'messenger':
        return <MessengerIcon size={rem(size)} color="#0084FF" />;
      case 'web':
        return <WebIcon size={rem(size)} color={colors.primary} />;
    }
  };

  const renderTicks = (status: ChatMessage['status']) => {
    const isRead = status === 'read';
    const tickColor = isRead ? '#34B7F1' : colors.textMuted; // WhatsApp read blue
    
    if (status === 'sent') {
      return <Check size={rem(10)} color={colors.textMuted} />;
    }
    return <CheckCheck size={rem(10)} color={tickColor} />;
  };

  const renderMessageBubble = (msg: ChatMessage, index: number) => {
    const isClient = msg.sender === 'client';
    const isSystem = msg.sender === 'system';
    const isWhisperMsg = msg.noteType === 'whisper';

    if (isSystem) {
      return (
        <MotiView
          key={msg.id}
          from={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          style={styles.systemMessageContainer}
        >
          <View style={styles.systemMessageBadge}>
            <Text style={styles.systemMessageText}>{msg.text}</Text>
          </View>
        </MotiView>
      );
    }

    const hasAttachment = !!msg.attachment && !!msg.attachment.url;
    const mediaType = msg.attachment?.type;

    return (
      <MotiView
        key={msg.id}
        from={{ opacity: 0, scale: 0.95, translateY: 15 }}
        animate={{ opacity: 1, scale: 1, translateY: 0 }}
        transition={{ type: 'spring', damping: 18 }}
        style={[
          styles.bubbleWrapper,
          isClient ? styles.clientBubbleWrapper : styles.agentBubbleWrapper
        ]}
      >
        <View style={[
          styles.bubbleBase,
          isClient ? styles.clientBubble : styles.agentBubble,
          isWhisperMsg && styles.whisperBubble,
          hasAttachment && { padding: rem(6) }
        ]}>
          {/* Sender Name tag for team note or internal agent */}
          {!isClient && msg.senderName && (
            <Text style={[styles.senderNameLabel, isWhisperMsg && { color: colors.gold }, hasAttachment && { marginHorizontal: rem(4), marginTop: rem(4) }]}>
              {isWhisperMsg ? '🤫 Susurro Interno' : msg.senderName}
            </Text>
          )}

          {/* Multimedia Attachments */}
          {hasAttachment && (
            <View style={styles.mediaContainer}>
              {mediaType === 'image' && (
                <TouchableOpacity 
                  activeOpacity={0.9} 
                  onPress={() => setSelectedImage(msg.attachment!.url)}
                  style={styles.mediaImageWrapper}
                >
                  <Animated.Image 
                    source={{ uri: msg.attachment!.url }} 
                    style={styles.mediaImage} 
                    resizeMode="cover"
                  />
                </TouchableOpacity>
              )}

              {mediaType === 'video' && (
                <View style={styles.mediaVideoWrapper}>
                  <Video
                    source={{ uri: msg.attachment!.url }}
                    style={styles.mediaVideo}
                    useNativeControls
                    resizeMode="cover"
                    shouldPlay={false}
                  />
                </View>
              )}

              {mediaType === 'audio' && (
                <AudioBubblePlayer 
                  audioUrl={msg.attachment!.url} 
                  isClient={isClient}
                  colors={colors}
                />
              )}

              {mediaType === 'document' && (
                <TouchableOpacity 
                  activeOpacity={0.8}
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    Linking.openURL(msg.attachment!.url).catch(err => 
                      console.error("Couldn't open document URL", err)
                    );
                  }}
                  style={[
                    styles.mediaDocumentWrapper,
                    { backgroundColor: isClient ? colors.slate[200] + '40' : 'rgba(255,255,255,0.15)' }
                  ]}
                >
                  <View style={styles.docIconContainer}>
                    <FileText size={rem(20)} color={isClient ? colors.primary : '#FFFFFF'} />
                  </View>
                  <View style={styles.docMetaCol}>
                    <Text 
                      style={[styles.docNameText, { color: isClient ? colors.text : '#FFFFFF' }]} 
                      numberOfLines={1}
                      ellipsizeMode="middle"
                    >
                      {msg.attachment!.name || 'documento.pdf'}
                    </Text>
                    <Text style={[styles.docSizeText, { color: isClient ? colors.textMuted : 'rgba(255,255,255,0.7)' }]}>
                      Documento de soporte
                    </Text>
                  </View>
                  <View style={styles.docActionBtn}>
                    <Download size={rem(14)} color={isClient ? colors.textMuted : '#FFFFFF'} />
                  </View>
                </TouchableOpacity>
              )}
            </View>
          )}

          {/* Message Text content */}
          {!!msg.text && (
            <Text style={[
              styles.messageText,
              isClient ? styles.clientText : styles.agentText,
              isWhisperMsg && styles.whisperText,
              hasAttachment && { marginTop: rem(6), marginHorizontal: rem(6), marginBottom: rem(2) }
            ]}>
              {msg.text}
            </Text>
          )}

          {/* Timestamp footer block with WhatsApp ticks */}
          <View style={[styles.bubbleFooter, hasAttachment && { marginHorizontal: rem(6), marginBottom: rem(2) }]}>
            <Text style={[styles.timeLabel, isClient ? styles.clientTime : styles.agentTime]}>
              {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </Text>
            {!isClient && !isWhisperMsg && (
              <View style={styles.tickContainer}>
                {renderTicks(msg.status)}
              </View>
            )}
          </View>
        </View>
      </MotiView>
    );
  };

  if (!conversation) {
    return (
      <View style={[styles.container, styles.center]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  const isClosed = conversation.status === 'closed';
  const isAssignedToMe = conversation.assignedAgent?.id === currentAgent?.id;

  return (
    <KeyboardAvoidingView 
      style={styles.container} 
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? rem(40) : 0}
    >
      {/* Header bar */}
      <View style={[styles.headerBar, { height: rem(54) + insets.top, paddingTop: insets.top }]}>
        <TouchableOpacity style={styles.backBtn} onPress={onBack}>
          <ArrowLeft size={rem(18)} color={colors.text} />
        </TouchableOpacity>

        {/* Client Avatar bubble with floating channel badge */}
        <View style={styles.headerAvatarWrapper}>
          {conversation.customerAvatar ? (
            <Animated.Image 
              source={{ uri: conversation.customerAvatar }} 
              style={styles.headerAvatarImage} 
            />
          ) : (
            <View style={[
              styles.headerAvatarFallback, 
              { 
                backgroundColor: 
                  conversation.channel === 'whatsapp' ? '#25D366' :
                  conversation.channel === 'instagram' ? '#E1306C' :
                  conversation.channel === 'messenger' ? '#0084FF' :
                  colors.primary
              }
            ]}>
              <Text style={styles.headerAvatarFallbackText}>
                {conversation.customerName && conversation.customerName !== 'none' ? conversation.customerName.charAt(0).toUpperCase() : '?'}
              </Text>
            </View>
          )}
          {/* Small channel badge overlay */}
          <View style={[styles.headerChannelBadge, { backgroundColor: colors.surface }]}>
            {renderChannelLogo(conversation.channel, 8)}
          </View>
        </View>

        {/* Client identity */}
        <View style={styles.headerIdentityCol}>
          <Text style={styles.headerTitleName} numberOfLines={1}>
            {conversation.customerName}
          </Text>
          
          <Text style={styles.headerSubPhone} numberOfLines={1}>
            {conversation.customerPhone || 'Cliente de Landing'}
          </Text>
        </View>

        {/* Ticket control buttons */}
        <View style={styles.headerActionsRow}>
          {/* Status badge toggler */}
          <TouchableOpacity 
            activeOpacity={0.8}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              setShowStatusMenu(!showStatusMenu);
            }}
            style={[
              styles.statusHeaderBadge,
              conversation.status === 'open' && { backgroundColor: colors.success + '20' },
              conversation.status === 'pending' && { backgroundColor: '#F59E0B20' },
              conversation.status === 'closed' && { backgroundColor: colors.slate[200] }
            ]}
          >
            <Text style={[
              styles.statusHeaderBadgeText,
              conversation.status === 'open' && { color: colors.success },
              conversation.status === 'pending' && { color: '#F59E0B' },
              conversation.status === 'closed' && { color: colors.textMuted }
            ]}>
              {conversation.status.toUpperCase()}
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Floating ticket status contextual popover */}
      <AnimatePresence>
        {showStatusMenu && (
          <MotiView
            from={{ opacity: 0, translateY: -10 }}
            animate={{ opacity: 1, translateY: 0 }}
            exit={{ opacity: 0, translateY: -10 }}
            style={styles.statusPopOverMenu}
          >
            <Text style={styles.popOverTitle}>CAMBIAR ESTADO</Text>
            
            <TouchableOpacity 
              style={styles.popOverItem} 
              onPress={() => {
                reopenTicket(conversation.id);
                setShowStatusMenu(false);
              }}
            >
              <Text style={[styles.popOverItemText, { color: colors.success }]}>Marcar como Abierto</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.popOverItem} 
              onPress={() => {
                closeTicket(conversation.id);
                setShowStatusMenu(false);
              }}
            >
              <Text style={[styles.popOverItemText, { color: colors.textMuted }]}>Resolver / Cerrar Ticket</Text>
            </TouchableOpacity>
          </MotiView>
        )}
      </AnimatePresence>

      {/* Ticket Assignment Ribbon */}
      <View style={styles.assignmentRibbon}>
        {conversation.assignedAgent ? (
          <View style={styles.assignedStateBox}>
            <UserCheck size={rem(11)} color={colors.primary} style={{ marginRight: 6 }} />
            <Text style={styles.assignmentText}>
              Asignado a: <Text style={{ fontWeight: '800' }}>{conversation.assignedAgent.name}</Text>
            </Text>
            {!isAssignedToMe && (
              <TouchableOpacity style={styles.reassignActionBtn} onPress={() => assignToMe(conversation.id)}>
                <Text style={styles.reassignActionBtnText}>Asignármelo</Text>
              </TouchableOpacity>
            )}
          </View>
        ) : (
          <View style={styles.assignedStateBox}>
            <AlertTriangle size={rem(11)} color="#F59E0B" style={{ marginRight: 6 }} />
            <Text style={styles.assignmentText}>
              Este chat no tiene un asesor asignado todavía.
            </Text>
            <TouchableOpacity style={styles.takeActionBtn} onPress={() => assignToMe(conversation.id)}>
              <Text style={styles.takeActionBtnText}>Tomar Chat</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>

      {/* Main scrolling chat thread */}
      {loadingMessages ? (
        <View style={styles.threadLoader}>
          <ActivityIndicator size="small" color={colors.primary} />
          <Text style={styles.threadLoaderText}>Cargando mensajes del cliente...</Text>
        </View>
      ) : (
        <ScrollView
          ref={scrollRef}
          style={styles.chatScroll}
          contentContainerStyle={styles.chatScrollContent}
          showsVerticalScrollIndicator={false}
        >
          {messages.map((msg, index) => renderMessageBubble(msg, index))}
        </ScrollView>
      )}

      {/* IAStock Copilot Recommendation Box overlay */}
      <AnimatePresence>
        {aiDraft.length > 0 && (
          <MotiView
            from={{ opacity: 0, scale: 0.96, translateY: 15 }}
            animate={{ opacity: 1, scale: 1, translateY: 0 }}
            exit={{ opacity: 0, scale: 0.95 }}
            style={styles.aiGlowDashboard}
          >
            <View style={styles.aiHeaderBlock}>
              <View style={styles.aiHeaderTitleRow}>
                <Sparkles size={rem(12)} color={colors.gold} style={{ marginRight: 6 }} />
                <Text style={styles.aiTitleText}>IASTOCK COPILOT (SUGERENCIA AUTOMATIZADA)</Text>
              </View>
              <TouchableOpacity onPress={() => setAiDraft('')}>
                <X size={rem(14)} color={colors.textMuted} />
              </TouchableOpacity>
            </View>

            <Text style={styles.aiBodyDraftText}>{aiDraft}</Text>

            <View style={styles.aiActionsPanel}>
              <TouchableOpacity 
                style={[styles.aiDraftBtn, { backgroundColor: colors.slate[200] }]} 
                onPress={handleApplyAiDraft}
              >
                <Text style={[styles.aiDraftBtnText, { color: colors.text }]}>Copiar al editor</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={[styles.aiDraftBtn, { backgroundColor: colors.primary }]} 
                onPress={() => {
                  sendTextMessage(aiDraft, 'normal');
                  setAiDraft('');
                }}
              >
                <Send size={rem(10)} color="#FFFFFF" style={{ marginRight: 4 }} />
                <Text style={styles.aiDraftBtnText}>Enviar sugerencia</Text>
              </TouchableOpacity>
            </View>
          </MotiView>
        )}
      </AnimatePresence>

      {/* Outbound chat controller toolbar (Disabled if ticket is closed) */}
      {isClosed ? (
        <View style={[styles.closedTicketBanner, { paddingBottom: Math.max(insets.bottom, rem(16)) }]}>
          <Text style={styles.closedTicketText}>Esta conversación se encuentra cerrada.</Text>
          <TouchableOpacity 
            style={styles.reopenButton} 
            onPress={() => reopenTicket(conversation.id)}
          >
            <Text style={styles.reopenButtonText}>Reabrir para responder</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <View style={[styles.bottomToolbarWrapper, { paddingBottom: Math.max(insets.bottom, Platform.OS === 'ios' ? rem(16) : rem(8)) }]}>
          {/* Toggle button to switch into private notes coordinating (whisper mode) */}
          <View style={styles.toolbarSelectorLine}>
            <TouchableOpacity 
              style={[styles.modeToggleBtn, !isWhisper && styles.modeToggleBtnActive]} 
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                setIsWhisper(false);
              }}
            >
              <Text style={[styles.modeToggleText, !isWhisper && styles.modeToggleTextActive]}>Cliente</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={[
                styles.modeToggleBtn, 
                isWhisper && { backgroundColor: colors.goldGlow, borderColor: colors.gold }
              ]} 
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                setIsWhisper(true);
              }}
            >
              <Text style={[styles.modeToggleText, isWhisper && { color: colors.gold, fontWeight: '800' }]}>
                🤫 Susurrar (Nota Interna)
              </Text>
            </TouchableOpacity>
          </View>

          {/* Interactive tools row */}
          <View style={styles.inputAreaRow}>
            {/* Attachment paperclip */}
            <TouchableOpacity style={styles.actionIconCircleBtn}>
              <Paperclip size={rem(15)} color={colors.textMuted} />
            </TouchableOpacity>

            {/* Smart AI Draft Generation button */}
            <TouchableOpacity 
              style={[
                styles.actionIconCircleBtn, 
                generatingAi && { backgroundColor: colors.primaryGlow }
              ]}
              onPress={handleSuggestAiReply}
              disabled={generatingAi}
            >
              {generatingAi ? (
                <ActivityIndicator size="small" color={colors.gold} />
              ) : (
                <Sparkles size={rem(15)} color={colors.gold} />
              )}
            </TouchableOpacity>

            {/* Text input editor */}
            <TextInput
              style={[
                styles.inputBox,
                isWhisper && { borderColor: colors.gold, backgroundColor: colors.gold + '05' }
              ]}
              value={inputText}
              onChangeText={setInputText}
              placeholder={isWhisper ? "Escribe una nota que solo verá el staff..." : "Escribe un mensaje..."}
              placeholderTextColor={colors.textMuted}
              multiline
              maxLength={1000}
            />

            {/* Send circular trigger */}
            <TouchableOpacity 
              style={[
                styles.sendRoundBtn, 
                { backgroundColor: isWhisper ? colors.gold : colors.primary },
                !inputText.trim() && { opacity: 0.5 }
              ]}
              onPress={handleSend}
              disabled={!inputText.trim()}
            >
              <Send size={rem(12)} color="#FFFFFF" />
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Lightbox Modal for Premium Image Previews */}
      <Modal
        visible={!!selectedImage}
        transparent
        animationType="fade"
        onRequestClose={() => setSelectedImage(null)}
      >
        <TouchableOpacity 
          style={styles.lightboxOverlay}
          activeOpacity={1}
          onPress={() => setSelectedImage(null)}
        >
          {Platform.OS === 'ios' ? (
            <BlurView intensity={90} tint={mode === 'dark' ? 'dark' : 'light'} style={StyleSheet.absoluteFill}>
              <View style={styles.lightboxContainer}>
                {selectedImage && (
                  <MotiView
                    from={{ opacity: 0, scale: 0.85 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.85 }}
                    transition={{ type: 'spring', damping: 15 }}
                    style={styles.lightboxContent}
                  >
                    <Animated.Image
                      source={{ uri: selectedImage }}
                      style={styles.lightboxImage}
                      resizeMode="contain"
                    />
                  </MotiView>
                )}
                
                <TouchableOpacity 
                  style={[styles.closeLightboxBtn, { top: insets.top + rem(10) }]}
                  onPress={() => setSelectedImage(null)}
                >
                  <X size={rem(18)} color={colors.text} />
                </TouchableOpacity>
              </View>
            </BlurView>
          ) : (
            <View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(0,0,0,0.85)' }]}>
              <View style={styles.lightboxContainer}>
                {selectedImage && (
                  <MotiView
                    from={{ opacity: 0, scale: 0.85 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.85 }}
                    transition={{ type: 'spring', damping: 15 }}
                    style={styles.lightboxContent}
                  >
                    <Animated.Image
                      source={{ uri: selectedImage }}
                      style={styles.lightboxImage}
                      resizeMode="contain"
                    />
                  </MotiView>
                )}
                
                <TouchableOpacity 
                  style={[styles.closeLightboxBtn, { top: insets.top + rem(10) }]}
                  onPress={() => setSelectedImage(null)}
                >
                  <X size={rem(18)} color="#FFFFFF" />
                </TouchableOpacity>
              </View>
            </View>
          )}
        </TouchableOpacity>
      </Modal>
    </KeyboardAvoidingView>
  );
};

const getStyles = (colors: any, mode: 'light' | 'dark') => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  center: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerBar: {
    flexDirection: 'row',
    alignItems: 'center',
    height: rem(54),
    paddingHorizontal: rem(12),
    backgroundColor: mode === 'light' ? '#FFFFFF' : '#1e293b',
    borderBottomWidth: 1,
    borderColor: colors.glassBorder,
    zIndex: 10,
  },
  backBtn: {
    padding: rem(6),
  },
  headerAvatarWrapper: {
    width: rem(34),
    height: rem(34),
    position: 'relative',
    marginLeft: rem(4),
  },
  headerAvatarImage: {
    width: rem(34),
    height: rem(34),
    borderRadius: rem(17),
  },
  headerAvatarFallback: {
    width: rem(34),
    height: rem(34),
    borderRadius: rem(17),
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerAvatarFallbackText: {
    fontFamily: 'Inter-Bold',
    fontSize: rem(13),
    color: '#FFFFFF',
  },
  headerChannelBadge: {
    position: 'absolute',
    bottom: -rem(2),
    right: -rem(2),
    width: rem(14),
    height: rem(14),
    borderRadius: rem(7),
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#FFFFFF',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 1,
    elevation: 1,
  },
  headerIdentityCol: {
    flex: 1,
    marginLeft: rem(10),
  },
  headerNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerTitleName: {
    fontFamily: 'Inter-Bold',
    fontSize: rem(13),
    color: colors.text,
    marginLeft: rem(6),
  },
  headerSubPhone: {
    fontFamily: 'Inter-Regular',
    fontSize: rem(9),
    color: colors.textMuted,
    marginTop: rem(1),
  },
  headerActionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusHeaderBadge: {
    paddingHorizontal: rem(8),
    paddingVertical: rem(3),
    borderRadius: rem(6),
    borderWidth: 1,
    borderColor: colors.glassBorder,
  },
  statusHeaderBadgeText: {
    fontFamily: 'Inter-Bold',
    fontSize: rem(8),
  },
  statusPopOverMenu: {
    position: 'absolute',
    top: rem(56),
    right: rem(16),
    backgroundColor: mode === 'light' ? '#FFFFFF' : '#1e293b',
    width: rem(160),
    borderRadius: rem(10),
    borderWidth: 1,
    borderColor: colors.glassBorder,
    padding: rem(8),
    zIndex: 100,
    elevation: 10,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
  },
  popOverTitle: {
    fontFamily: 'Inter-Bold',
    fontSize: rem(7),
    color: colors.textMuted,
    paddingBottom: rem(4),
    borderBottomWidth: 1,
    borderColor: colors.slate[200],
    letterSpacing: 0.5,
  },
  popOverItem: {
    paddingVertical: rem(8),
  },
  popOverItemText: {
    fontFamily: 'Inter-Medium',
    fontSize: rem(10),
  },
  assignmentRibbon: {
    paddingVertical: rem(6),
    paddingHorizontal: rem(16),
    backgroundColor: mode === 'light' ? '#F5F1E9' : '#0f172a',
    borderBottomWidth: 1,
    borderColor: colors.glassBorder,
  },
  assignedStateBox: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  assignmentText: {
    fontFamily: 'Inter-Regular',
    fontSize: rem(10),
    color: colors.textMuted,
    flex: 1,
  },
  takeActionBtn: {
    backgroundColor: colors.primary,
    paddingHorizontal: rem(8),
    paddingVertical: rem(3),
    borderRadius: rem(4),
  },
  takeActionBtnText: {
    fontFamily: 'Inter-Bold',
    fontSize: rem(9),
    color: '#FFFFFF',
  },
  reassignActionBtn: {
    backgroundColor: colors.slate[300],
    paddingHorizontal: rem(8),
    paddingVertical: rem(3),
    borderRadius: rem(4),
  },
  reassignActionBtnText: {
    fontFamily: 'Inter-Bold',
    fontSize: rem(9),
    color: colors.text,
  },
  threadLoader: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  threadLoaderText: {
    fontFamily: 'Inter-Medium',
    fontSize: rem(11),
    color: colors.textMuted,
    marginTop: rem(10),
  },
  chatScroll: {
    flex: 1,
  },
  chatScrollContent: {
    paddingHorizontal: rem(14),
    paddingTop: rem(14),
    paddingBottom: rem(40),
  },
  systemMessageContainer: {
    alignItems: 'center',
    marginVertical: rem(10),
  },
  systemMessageBadge: {
    backgroundColor: colors.slate[200],
    paddingHorizontal: rem(10),
    paddingVertical: rem(4),
    borderRadius: rem(6),
  },
  systemMessageText: {
    fontFamily: 'Inter-Bold',
    fontSize: rem(8),
    color: colors.textMuted,
    textAlign: 'center',
  },
  bubbleWrapper: {
    flexDirection: 'row',
    marginBottom: rem(10),
    width: '100%',
  },
  clientBubbleWrapper: {
    justifyContent: 'flex-start',
  },
  agentBubbleWrapper: {
    justifyContent: 'flex-end',
  },
  bubbleBase: {
    maxWidth: SCREEN_WIDTH * 0.76,
    borderRadius: rem(12),
    padding: rem(10),
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: mode === 'light' ? 0.015 : 0.06,
    shadowRadius: 6,
  },
  clientBubble: {
    backgroundColor: mode === 'light' ? '#FFFFFF' : '#1e293b',
    borderWidth: 1,
    borderColor: colors.glassBorder,
    borderTopLeftRadius: rem(2),
  },
  agentBubble: {
    backgroundColor: colors.primary,
    borderTopRightRadius: rem(2),
  },
  whisperBubble: {
    backgroundColor: colors.goldGlow,
    borderWidth: 1,
    borderColor: colors.gold,
    borderStyle: 'dashed',
    borderTopRightRadius: rem(2),
  },
  senderNameLabel: {
    fontFamily: 'Inter-Bold',
    fontSize: rem(8),
    color: 'rgba(255, 255, 255, 0.7)',
    marginBottom: rem(2),
  },
  messageText: {
    fontFamily: 'Inter-Regular',
    fontSize: rem(12),
    lineHeight: rem(16),
  },
  clientText: {
    color: colors.text,
  },
  agentText: {
    color: '#FFFFFF',
  },
  whisperText: {
    color: colors.text,
  },
  bubbleFooter: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    marginTop: rem(4),
  },
  timeLabel: {
    fontFamily: 'Inter-Regular',
    fontSize: rem(8),
  },
  clientTime: {
    color: colors.textMuted,
  },
  agentTime: {
    color: 'rgba(255, 255, 255, 0.6)',
  },
  tickContainer: {
    marginLeft: rem(4),
  },
  aiGlowDashboard: {
    backgroundColor: mode === 'light' ? 'rgba(255, 255, 255, 0.95)' : 'rgba(30, 41, 59, 0.95)',
    borderRadius: rem(14),
    marginHorizontal: rem(14),
    marginBottom: rem(10),
    padding: rem(12),
    borderWidth: 1,
    borderColor: colors.gold,
    shadowColor: colors.gold,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.12,
    shadowRadius: 10,
    elevation: 8,
  },
  aiHeaderBlock: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: rem(6),
    borderBottomWidth: 1,
    borderColor: colors.glassBorder,
  },
  aiHeaderTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  aiTitleText: {
    fontFamily: 'Inter-Bold',
    fontSize: rem(8),
    color: colors.gold,
    letterSpacing: 0.5,
  },
  aiBodyDraftText: {
    fontFamily: 'Inter-Medium',
    fontSize: rem(11),
    color: colors.text,
    marginTop: rem(8),
    lineHeight: rem(15),
  },
  aiActionsPanel: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: rem(10),
  },
  aiDraftBtn: {
    paddingHorizontal: rem(10),
    paddingVertical: rem(5),
    borderRadius: rem(6),
    marginLeft: rem(8),
    flexDirection: 'row',
    alignItems: 'center',
  },
  aiDraftBtnText: {
    fontFamily: 'Inter-Bold',
    fontSize: rem(9),
    color: '#FFFFFF',
  },
  closedTicketBanner: {
    padding: rem(16),
    alignItems: 'center',
    backgroundColor: mode === 'light' ? '#EAE5DA' : '#1e293b',
    borderTopWidth: 1,
    borderColor: colors.glassBorder,
  },
  closedTicketText: {
    fontFamily: 'Inter-Bold',
    fontSize: rem(11),
    color: colors.textMuted,
  },
  reopenButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: rem(16),
    paddingVertical: rem(6),
    borderRadius: rem(8),
    marginTop: rem(8),
  },
  reopenButtonText: {
    fontFamily: 'Inter-Bold',
    fontSize: rem(10),
    color: '#FFFFFF',
  },
  bottomToolbarWrapper: {
    backgroundColor: mode === 'light' ? '#FFFFFF' : '#1e293b',
    borderTopWidth: 1,
    borderColor: colors.glassBorder,
    paddingHorizontal: rem(12),
    paddingTop: rem(6),
    paddingBottom: Platform.OS === 'ios' ? rem(16) : rem(8),
  },
  toolbarSelectorLine: {
    flexDirection: 'row',
    marginBottom: rem(6),
  },
  modeToggleBtn: {
    paddingHorizontal: rem(10),
    paddingVertical: rem(4),
    borderRadius: rem(6),
    borderWidth: 1,
    borderColor: 'transparent',
    marginRight: rem(8),
  },
  modeToggleBtnActive: {
    backgroundColor: colors.slate[200],
  },
  modeToggleText: {
    fontFamily: 'Inter-Bold',
    fontSize: rem(9),
    color: colors.textMuted,
  },
  modeToggleTextActive: {
    color: colors.text,
  },
  inputAreaRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  actionIconCircleBtn: {
    width: rem(30),
    height: rem(30),
    borderRadius: rem(15),
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: rem(6),
    backgroundColor: colors.slate[200],
  },
  inputBox: {
    flex: 1,
    fontFamily: 'Inter-Regular',
    fontSize: rem(11),
    color: colors.text,
    backgroundColor: mode === 'light' ? '#F5F1E9' : '#0f172a',
    borderRadius: rem(10),
    borderWidth: 1,
    borderColor: colors.glassBorder,
    paddingHorizontal: rem(10),
    paddingVertical: rem(6),
    maxHeight: rem(60),
    marginRight: rem(8),
  },
  sendRoundBtn: {
    width: rem(30),
    height: rem(30),
    borderRadius: rem(15),
    alignItems: 'center',
    justifyContent: 'center',
  },
  mediaContainer: {
    borderRadius: rem(8),
    overflow: 'hidden',
  },
  mediaImageWrapper: {
    width: rem(220),
    height: rem(150),
    backgroundColor: mode === 'light' ? '#EAE5DA' : '#0f172a',
    borderRadius: rem(8),
    overflow: 'hidden',
  },
  mediaImage: {
    width: '100%',
    height: '100%',
  },
  mediaVideoWrapper: {
    width: rem(220),
    height: rem(150),
    backgroundColor: '#000000',
    borderRadius: rem(8),
    overflow: 'hidden',
  },
  mediaVideo: {
    width: '100%',
    height: '100%',
  },
  mediaDocumentWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: rem(8),
    borderRadius: rem(8),
    width: rem(220),
  },
  docIconContainer: {
    width: rem(34),
    height: rem(34),
    borderRadius: rem(6),
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: rem(10),
  },
  docMetaCol: {
    flex: 1,
    justifyContent: 'center',
  },
  docNameText: {
    fontSize: rem(11),
    fontFamily: 'Inter-Bold',
  },
  docSizeText: {
    fontSize: rem(8),
    fontFamily: 'Inter-Regular',
    marginTop: rem(2),
  },
  docActionBtn: {
    padding: rem(6),
  },
  lightboxOverlay: {
    flex: 1,
  },
  lightboxContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  lightboxContent: {
    width: SCREEN_WIDTH * 0.9,
    height: SCREEN_WIDTH * 1.2,
    justifyContent: 'center',
    alignItems: 'center',
  },
  lightboxImage: {
    width: '100%',
    height: '100%',
    borderRadius: rem(12),
  },
  closeLightboxBtn: {
    position: 'absolute',
    right: rem(16),
    padding: rem(8),
    borderRadius: rem(20),
    backgroundColor: mode === 'light' ? 'rgba(0,0,0,0.05)' : 'rgba(255,255,255,0.1)',
  },
});
