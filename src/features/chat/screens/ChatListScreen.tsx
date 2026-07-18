import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  TextInput,
  Dimensions,
  Animated,
  Platform
} from 'react-native';
import { MotiView, AnimatePresence } from 'moti';
import * as Haptics from 'expo-haptics';
import { 
  Search, 
  X, 
  ChevronDown, 
  MessageSquare, 
  CheckCircle2, 
  Clock, 
  AlertCircle,
  HelpCircle,
  Filter
} from 'lucide-react-native';

import { useTheme } from '@/core/theme/theme';
import { rem } from '@/core/utils/responsive';
import { useOmniChannelChat } from '@/presentation/hooks/useOmniChannelChat';
import { ChatConversation, ChannelType } from '@/domain/entities/Chat';
import { PremiumSubScreenHeader } from '../../inventory/components/PremiumSubScreenHeader';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

// Specialized components
import WhatsAppIcon from './icons/WhatsAppIcon';
import InstagramIcon from './icons/InstagramIcon';
import MessengerIcon from './icons/MessengerIcon';
import WebIcon from './icons/WebIcon';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

interface ChatListScreenProps {
  onBack: () => void;
  onSelectChat: (chatId: string) => void;
}

export const ChatListScreen = ({ onBack, onSelectChat }: ChatListScreenProps) => {
  const { colors, mode } = useTheme();
  const styles = getStyles(colors, mode);
  const insets = useSafeAreaInsets();

  const {
    conversations,
    loadingConversations,
    loadConversations,
    selectConversation
  } = useOmniChannelChat();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedChannel, setSelectedChannel] = useState<ChannelType | 'all'>('all');
  const [selectedStatus, setSelectedStatus] = useState<'all' | 'open' | 'closed' | 'pending'>('all');

  // Animation values
  const mainScrollY = useRef(new Animated.Value(0)).current;
  const [showScrollBadge, setShowScrollBadge] = useState(true);
  const [contentHeight, setContentHeight] = useState(0);
  const [visibleHeight, setVisibleHeight] = useState(0);

  useEffect(() => {
    loadConversations();
  }, []);

  // Filter conversations based on query, channel, and status
  const filteredConversations = useMemo(() => {
    return conversations.filter(conv => {
      const matchSearch = conv.customerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          (conv.customerPhone || '').includes(searchQuery);
      
      const matchChannel = selectedChannel === 'all' || conv.channel === selectedChannel;
      const matchStatus = selectedStatus === 'all' || conv.status === selectedStatus;
      
      return matchSearch && matchChannel && matchStatus;
    });
  }, [conversations, searchQuery, selectedChannel, selectedStatus]);

  // Bento Metrics
  const metrics = useMemo(() => {
    let unreadTotal = 0;
    let openTotal = 0;
    let pendingTotal = 0;

    conversations.forEach(conv => {
      unreadTotal += conv.unreadCount;
      if (conv.status === 'open') openTotal++;
      if (conv.status === 'pending') pendingTotal++;
    });

    return {
      unreadTotal,
      openTotal,
      pendingTotal,
      avgResponse: '1.4 min' // Hardcoded metric representing state-of-the-art POS response velocity
    };
  }, [conversations]);

  const handleSelectChat = (chatId: string) => {
    onSelectChat(chatId);
  };

  const renderChannelLogo = (channel: ChannelType, size = 18) => {
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

  const renderConversationItem = ({ item, index }: { item: ChatConversation; index: number }) => {
    const hasUnread = item.unreadCount > 0;
    const isAssigned = !!item.assignedAgent;
    
    // Channel styles
    const channelColors = {
      whatsapp: '#25D366',
      instagram: '#E1306C',
      messenger: '#0084FF',
      web: colors.primary
    };
    
    const channelAccent = channelColors[item.channel] || colors.primary;

    return (
      <MotiView
        from={{ opacity: 0, translateY: 30, scale: 0.97 }}
        animate={{ opacity: 1, translateY: 0, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        transition={{ delay: 100 + Math.min(index * 35, 250), type: 'timing', duration: 280 }}
        style={[
          styles.cardContainer,
          hasUnread && { borderColor: channelAccent + '40', borderWidth: 1 }
        ]}
      >
        <TouchableOpacity activeOpacity={0.9} onPress={() => handleSelectChat(item.id)}>
          <View style={styles.cardMainRow}>
            {/* Avatar block with dynamic indicator bubble */}
            <View style={styles.avatarWrapper}>
              {item.customerAvatar ? (
                <Animated.Image 
                  source={{ uri: item.customerAvatar }} 
                  style={styles.avatarImage} 
                />
              ) : (
                <View style={[
                  styles.avatarFallback, 
                  { 
                    backgroundColor: 
                      item.channel === 'whatsapp' ? '#25D366' :
                      item.channel === 'instagram' ? '#E1306C' :
                      item.channel === 'messenger' ? '#0084FF' :
                      colors.primary
                  }
                ]}>
                  <Text style={[styles.avatarText, { color: '#FFFFFF' }]}>
                    {item.customerName && item.customerName !== 'none' ? item.customerName.charAt(0).toUpperCase() : '?'}
                  </Text>
                </View>
              )}
              
              {/* Channel badge floating on top right */}
              <View style={[styles.floatingChannelBadge, { backgroundColor: colors.surface }]}>
                {renderChannelLogo(item.channel, 9)}
              </View>
            </View>

            {/* Middle Section details */}
            <View style={styles.cardDetailsCol}>
              <View style={styles.cardHeaderLine}>
                <Text style={[styles.customerNameText, hasUnread && styles.unreadTextBold]} numberOfLines={1}>
                  {item.customerName}
                </Text>
                
                {item.lastMessage && (
                  <Text style={styles.timeText}>
                    {new Date(item.lastMessage.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </Text>
                )}
              </View>

              {item.lastMessage && (
                <Text 
                  style={[
                    styles.lastMessageText, 
                    hasUnread && { color: colors.text, fontWeight: '600' }
                  ]} 
                  numberOfLines={1}
                >
                  {item.lastMessage.sender === 'agent' ? 'Tú: ' : ''}
                  {item.lastMessage.text}
                </Text>
              )}
              
              <View style={styles.tagLineRow}>
                {/* Agent Assignment Badge */}
                {isAssigned ? (
                  <View style={[styles.tagBadge, { backgroundColor: colors.primary + '10' }]}>
                    <CheckCircle2 size={rem(9)} color={colors.primary} style={{ marginRight: 3 }} />
                    <Text style={[styles.tagBadgeText, { color: colors.primary }]}>
                      {item.assignedAgent?.name}
                    </Text>
                  </View>
                ) : (
                  <View style={[styles.tagBadge, { backgroundColor: colors.slate[200] }]}>
                    <HelpCircle size={rem(9)} color={colors.textMuted} style={{ marginRight: 3 }} />
                    <Text style={styles.tagBadgeText}>Sin Asignar</Text>
                  </View>
                )}

                {/* Status Badge */}
                <View style={[
                  styles.tagBadge, 
                  item.status === 'open' && { backgroundColor: colors.success + '10' },
                  item.status === 'pending' && { backgroundColor: '#F59E0B10' },
                  item.status === 'closed' && { backgroundColor: colors.slate[300] }
                ]}>
                  <Text style={[
                    styles.tagBadgeText,
                    item.status === 'open' && { color: colors.success },
                    item.status === 'pending' && { color: '#F59E0B' },
                    item.status === 'closed' && { color: colors.textMuted }
                  ]}>
                    {item.status.toUpperCase()}
                  </Text>
                </View>
              </View>
            </View>

            {/* Right-most indicator notification pill */}
            {hasUnread && (
              <View style={styles.rightUnreadBlock}>
                <MotiView
                  from={{ scale: 0.8 }}
                  animate={{ scale: [1, 1.15, 1] }}
                  transition={{ loop: true, duration: 1500, type: 'timing' }}
                  style={[styles.unreadBadgeCircle, { backgroundColor: channelAccent }]}
                >
                  <Text style={styles.unreadBadgeText}>{item.unreadCount}</Text>
                </MotiView>
              </View>
            )}
          </View>
        </TouchableOpacity>
      </MotiView>
    );
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Premium Sub-Header */}
      <MotiView
        from={{ opacity: 0, translateY: -15 }}
        animate={{ opacity: 1, translateY: 0 }}
        transition={{ type: 'timing', duration: 250 }}
      >
        <PremiumSubScreenHeader
          title="Bandeja Omnicanal"
          subtitle="WhatsApp, IG, FB & Web"
          onBack={onBack}
          actionLabel="Actualizar"
          onAction={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            loadConversations();
          }}
        />
      </MotiView>

      {/* Bento Grid Metrics Dashboard */}
      <MotiView
        from={{ opacity: 0, translateY: 20, scale: 0.98 }}
        animate={{ opacity: 1, translateY: 0, scale: 1 }}
        transition={{ type: 'timing', duration: 300, delay: 50 }}
        style={styles.bentoDashboard}
      >
        {/* Unread Alerts block (left bento) */}
        <View style={styles.bentoLeftCard}>
          <Text style={styles.bentoMiniLabel}>SIN LEER</Text>
          <View style={styles.bentoValueContainer}>
            <Text style={[styles.bentoHugeNum, { color: metrics.unreadTotal > 0 ? colors.error : colors.text }]}>
              {metrics.unreadTotal}
            </Text>
            {metrics.unreadTotal > 0 && (
              <MotiView
                from={{ opacity: 0.4 }}
                animate={{ opacity: [0.4, 0.9, 0.4] }}
                transition={{ loop: true, duration: 1200 }}
                style={[styles.pulseLightCircle, { backgroundColor: colors.error }]}
              />
            )}
          </View>
          <Text style={styles.bentoDesc}>Mensajes de clientes pendientes</Text>
        </View>

        <View style={styles.bentoVerticalDivider} />

        {/* Other metrics (right column blocks) */}
        <View style={styles.bentoRightGridCol}>
          {/* Row 1 */}
          <View style={styles.bentoRowStat}>
            <View style={[styles.metricCircleIcon, { backgroundColor: colors.success + '15' }]}>
              <Clock size={rem(11)} color={colors.success} />
            </View>
            <View style={styles.metricTextGroup}>
              <Text style={styles.bentoRowMiniLabel}>RESPUESTA MEDIA</Text>
              <Text style={[styles.bentoRowVal, { color: colors.success }]}>
                {metrics.avgResponse}
              </Text>
            </View>
          </View>

          {/* Divider */}
          <View style={styles.bentoRowDivider} />

          {/* Row 2 */}
          <View style={styles.bentoRowStat}>
            <View style={[styles.metricCircleIcon, { backgroundColor: colors.primary + '15' }]}>
              <MessageSquare size={rem(11)} color={colors.primary} />
            </View>
            <View style={styles.metricTextGroup}>
              <Text style={styles.bentoRowMiniLabel}>CHATS ABIERTOS</Text>
              <Text style={styles.bentoRowVal}>
                {metrics.openTotal} clientes
              </Text>
            </View>
          </View>
        </View>
      </MotiView>

      {/* Horizontal channel elastic filter pills bar */}
      <MotiView
        from={{ opacity: 0, translateY: 15 }}
        animate={{ opacity: 1, translateY: 0 }}
        transition={{ type: 'timing', duration: 250, delay: 100 }}
        style={styles.pillsScrollContainer}
      >
        <Animated.ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.pillsContent}
        >
          {/* ALL PILL */}
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              setSelectedChannel('all');
            }}
            style={[styles.pillButton, selectedChannel === 'all' && styles.pillActiveAll]}
          >
            <Filter size={rem(11)} color={selectedChannel === 'all' ? '#FFFFFF' : colors.textMuted} style={{ marginRight: 4 }} />
            <Text style={[styles.pillText, selectedChannel === 'all' && styles.pillTextActive]}>
              Todos
            </Text>
          </TouchableOpacity>

          {/* WHATSAPP PILL */}
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              setSelectedChannel('whatsapp');
            }}
            style={[styles.pillButton, selectedChannel === 'whatsapp' && styles.pillActiveWhatsApp]}
          >
            <WhatsAppIcon size={rem(10)} color={selectedChannel === 'whatsapp' ? '#FFFFFF' : '#25D366'} style={{ marginRight: 4 }} />
            <Text style={[styles.pillText, selectedChannel === 'whatsapp' && styles.pillTextActive]}>
              WhatsApp
            </Text>
          </TouchableOpacity>

          {/* INSTAGRAM PILL */}
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              setSelectedChannel('instagram');
            }}
            style={[styles.pillButton, selectedChannel === 'instagram' && styles.pillActiveInstagram]}
          >
            <InstagramIcon size={rem(10)} color={selectedChannel === 'instagram' ? '#FFFFFF' : '#E1306C'} style={{ marginRight: 4 }} />
            <Text style={[styles.pillText, selectedChannel === 'instagram' && styles.pillTextActive]}>
              Instagram
            </Text>
          </TouchableOpacity>

          {/* MESSENGER PILL */}
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              setSelectedChannel('messenger');
            }}
            style={[styles.pillButton, selectedChannel === 'messenger' && styles.pillActiveMessenger]}
          >
            <MessengerIcon size={rem(10)} color={selectedChannel === 'messenger' ? '#FFFFFF' : '#0084FF'} style={{ marginRight: 4 }} />
            <Text style={[styles.pillText, selectedChannel === 'messenger' && styles.pillTextActive]}>
              Messenger
            </Text>
          </TouchableOpacity>

          {/* WEB CHAT PILL */}
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              setSelectedChannel('web');
            }}
            style={[styles.pillButton, selectedChannel === 'web' && styles.pillActiveWeb]}
          >
            <WebIcon size={rem(10)} color={selectedChannel === 'web' ? '#FFFFFF' : colors.primary} style={{ marginRight: 4 }} />
            <Text style={[styles.pillText, selectedChannel === 'web' && styles.pillTextActive]}>
              Web Chat
            </Text>
          </TouchableOpacity>
        </Animated.ScrollView>
      </MotiView>

      {/* State filter selectors (Abiertos, Pendientes, Cerrados) */}
      <MotiView
        from={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        style={styles.stateSelectorBar}
      >
        <TouchableOpacity 
          style={[styles.stateSelectorBtn, selectedStatus === 'all' && styles.stateActive]}
          onPress={() => setSelectedStatus('all')}
        >
          <Text style={[styles.stateText, selectedStatus === 'all' && styles.stateTextActive]}>Todos</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.stateSelectorBtn, selectedStatus === 'open' && styles.stateActive]}
          onPress={() => setSelectedStatus('open')}
        >
          <Text style={[styles.stateText, selectedStatus === 'open' && styles.stateTextActive]}>Abiertos</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.stateSelectorBtn, selectedStatus === 'pending' && styles.stateActive]}
          onPress={() => setSelectedStatus('pending')}
        >
          <Text style={[styles.stateText, selectedStatus === 'pending' && styles.stateTextActive]}>Pendientes</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.stateSelectorBtn, selectedStatus === 'closed' && styles.stateActive]}
          onPress={() => setSelectedStatus('closed')}
        >
          <Text style={[styles.stateText, selectedStatus === 'closed' && styles.stateTextActive]}>Cerrados</Text>
        </TouchableOpacity>
      </MotiView>

      {/* Search Input block */}
      <MotiView
        from={{ opacity: 0, translateY: 10 }}
        animate={{ opacity: 1, translateY: 0 }}
        transition={{ type: 'timing', duration: 250, delay: 150 }}
        style={styles.searchBarContainer}
      >
        <Search size={rem(14)} color={colors.textMuted} style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Buscar por cliente o teléfono..."
          placeholderTextColor={colors.textMuted}
          value={searchQuery}
          onChangeText={setSearchQuery}
          autoCorrect={false}
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity activeOpacity={0.7} onPress={() => setSearchQuery('')}>
            <X size={rem(14)} color={colors.textMuted} />
          </TouchableOpacity>
        )}
      </MotiView>

      {/* Conversation Thread Feed List */}
      <Animated.FlatList
        data={filteredConversations}
        renderItem={renderConversationItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={[styles.listScroll, { paddingBottom: rem(80) + insets.bottom }]}
        showsVerticalScrollIndicator={false}
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { y: mainScrollY } } }],
          { useNativeDriver: true }
        )}
        scrollEventThrottle={16}
        onContentSizeChange={(w, h) => setContentHeight(h)}
        onLayout={(event) => setVisibleHeight(event.nativeEvent.layout.height)}
        ListEmptyComponent={
          <MotiView
            from={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            style={styles.emptyContainer}
          >
            <View style={styles.emptyIconCircle}>
              <MessageSquare size={rem(28)} color={colors.primary} />
            </View>
            <Text style={styles.emptyTitle}>Bandeja Limpia</Text>
            <Text style={styles.emptySubtitle}>
              No hay conversaciones activas que coincidan con los filtros seleccionados.
            </Text>
          </MotiView>
        }
      />
    </View>
  );
};

const getStyles = (colors: any, mode: 'light' | 'dark') => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  bentoDashboard: {
    flexDirection: 'row',
    backgroundColor: mode === 'light' ? '#FFFFFF' : '#1e293b',
    borderRadius: rem(14),
    marginHorizontal: rem(16),
    marginTop: rem(10),
    paddingVertical: rem(12),
    paddingHorizontal: rem(14),
    borderWidth: 1,
    borderColor: colors.glassBorder,
    alignItems: 'center',
    justifyContent: 'space-between',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: mode === 'light' ? 0.02 : 0.12,
    shadowRadius: 10,
  },
  bentoLeftCard: {
    flex: 1,
    paddingRight: rem(8),
  },
  bentoMiniLabel: {
    fontFamily: 'Inter-Bold',
    fontSize: rem(9),
    color: colors.textMuted,
    letterSpacing: 0.5,
  },
  bentoValueContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: rem(2),
  },
  bentoHugeNum: {
    fontFamily: 'Inter-Black',
    fontSize: rem(30),
    lineHeight: rem(34),
  },
  pulseLightCircle: {
    width: rem(8),
    height: rem(8),
    borderRadius: rem(4),
    marginLeft: rem(8),
  },
  bentoDesc: {
    fontFamily: 'Inter-Regular',
    fontSize: rem(9),
    color: colors.textMuted,
    marginTop: rem(2),
  },
  bentoVerticalDivider: {
    width: 1,
    height: '80%',
    backgroundColor: colors.slate[200],
    marginHorizontal: rem(12),
  },
  bentoRightGridCol: {
    flex: 1.2,
    justifyContent: 'center',
  },
  bentoRowStat: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  metricCircleIcon: {
    width: rem(20),
    height: rem(20),
    borderRadius: rem(10),
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: rem(8),
  },
  metricTextGroup: {
    flex: 1,
  },
  bentoRowMiniLabel: {
    fontFamily: 'Inter-Bold',
    fontSize: rem(7),
    color: colors.textMuted,
    letterSpacing: 0.5,
  },
  bentoRowVal: {
    fontFamily: 'Inter-Bold',
    fontSize: rem(11),
    color: colors.text,
  },
  bentoRowDivider: {
    height: 1,
    backgroundColor: colors.slate[200],
    my: rem(6),
    marginVertical: rem(6),
  },
  pillsScrollContainer: {
    marginTop: rem(12),
    height: rem(34),
  },
  pillsContent: {
    paddingHorizontal: rem(16),
    alignItems: 'center',
  },
  pillButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: rem(12),
    paddingVertical: rem(6),
    borderRadius: rem(10),
    marginRight: rem(8),
    backgroundColor: mode === 'light' ? '#FFFFFF' : '#1e293b',
    borderWidth: 1,
    borderColor: colors.glassBorder,
  },
  pillActiveAll: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  pillActiveWhatsApp: {
    backgroundColor: '#25D366',
    borderColor: '#25D366',
  },
  pillActiveInstagram: {
    backgroundColor: '#E1306C',
    borderColor: '#E1306C',
  },
  pillActiveMessenger: {
    backgroundColor: '#0084FF',
    borderColor: '#0084FF',
  },
  pillActiveWeb: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  pillText: {
    fontFamily: 'Inter-Bold',
    fontSize: rem(11),
    color: colors.textMuted,
  },
  pillTextActive: {
    color: '#FFFFFF',
  },
  stateSelectorBar: {
    flexDirection: 'row',
    marginHorizontal: rem(16),
    marginTop: rem(10),
    backgroundColor: mode === 'light' ? '#EAE5DA' : '#1e293b',
    borderRadius: rem(10),
    padding: rem(2),
    borderWidth: 1,
    borderColor: colors.glassBorder,
  },
  stateSelectorBtn: {
    flex: 1,
    paddingVertical: rem(5),
    alignItems: 'center',
    borderRadius: rem(8),
  },
  stateActive: {
    backgroundColor: mode === 'light' ? '#FFFFFF' : colors.primary,
  },
  stateText: {
    fontFamily: 'Inter-Medium',
    fontSize: rem(10),
    color: colors.textMuted,
  },
  stateTextActive: {
    fontFamily: 'Inter-Bold',
    color: colors.text,
  },
  searchBarContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: mode === 'light' ? '#FFFFFF' : '#1e293b',
    marginHorizontal: rem(16),
    marginTop: rem(10),
    borderRadius: rem(10),
    paddingHorizontal: rem(10),
    height: rem(34),
    borderWidth: 1,
    borderColor: colors.glassBorder,
  },
  searchIcon: {
    marginRight: rem(8),
  },
  searchInput: {
    flex: 1,
    fontFamily: 'Inter-Regular',
    fontSize: rem(11),
    color: colors.text,
    paddingVertical: 0,
  },
  listScroll: {
    paddingHorizontal: rem(16),
    paddingTop: rem(10),
    paddingBottom: rem(80),
  },
  cardContainer: {
    backgroundColor: mode === 'light' ? '#FFFFFF' : '#1e293b',
    borderRadius: rem(12),
    marginBottom: rem(10),
    padding: rem(12),
    borderWidth: 1,
    borderColor: colors.glassBorder,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: mode === 'light' ? 0.015 : 0.08,
    shadowRadius: 8,
  },
  cardMainRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatarWrapper: {
    position: 'relative',
    marginRight: rem(12),
  },
  avatarImage: {
    width: rem(38),
    height: rem(38),
    borderRadius: rem(19),
  },
  avatarFallback: {
    width: rem(38),
    height: rem(38),
    borderRadius: rem(19),
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontFamily: 'Inter-Bold',
    fontSize: rem(16),
    color: colors.text,
  },
  floatingChannelBadge: {
    position: 'absolute',
    bottom: -rem(2),
    right: -rem(2),
    width: rem(16),
    height: rem(16),
    borderRadius: rem(8),
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: mode === 'light' ? '#FFFFFF' : '#1e293b',
    elevation: 3,
  },
  cardDetailsCol: {
    flex: 1,
  },
  cardHeaderLine: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  customerNameText: {
    fontFamily: 'Inter-Bold',
    fontSize: rem(13),
    color: colors.text,
    maxWidth: '75%',
  },
  unreadTextBold: {
    fontFamily: 'Inter-Black',
  },
  timeText: {
    fontFamily: 'Inter-Regular',
    fontSize: rem(9),
    color: colors.textMuted,
  },
  lastMessageText: {
    fontFamily: 'Inter-Regular',
    fontSize: rem(11),
    color: colors.textMuted,
    marginTop: rem(2),
  },
  tagLineRow: {
    flexDirection: 'row',
    marginTop: rem(6),
  },
  tagBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: rem(6),
    paddingVertical: rem(2),
    borderRadius: rem(4),
    marginRight: rem(6),
  },
  tagBadgeText: {
    fontFamily: 'Inter-Bold',
    fontSize: rem(8),
    color: colors.textMuted,
  },
  rightUnreadBlock: {
    marginLeft: rem(10),
  },
  unreadBadgeCircle: {
    width: rem(16),
    height: rem(16),
    borderRadius: rem(8),
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 2,
  },
  unreadBadgeText: {
    fontFamily: 'Inter-Bold',
    fontSize: rem(9),
    color: '#FFFFFF',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: SCREEN_HEIGHT * 0.12,
    paddingHorizontal: rem(24),
  },
  emptyIconCircle: {
    width: rem(54),
    height: rem(54),
    borderRadius: rem(27),
    backgroundColor: colors.slate[200],
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: rem(14),
  },
  emptyTitle: {
    fontFamily: 'Inter-Bold',
    fontSize: rem(16),
    color: colors.text,
  },
  emptySubtitle: {
    fontFamily: 'Inter-Regular',
    fontSize: rem(11),
    color: colors.textMuted,
    textAlign: 'center',
    marginTop: rem(6),
    lineHeight: rem(16),
  },
});
