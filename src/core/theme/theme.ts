import { StyleSheet } from 'react-native';
import { useThemeStore } from '@/presentation/store/themeStore';

const slateScale = {
  50: '#f8fafc',
  100: '#f1f5f9',
  200: '#e2e8f0',
  300: '#cbd5e1',
  400: '#94a3b8',
  500: '#64748b',
  600: '#475569',
  700: '#334155',
  800: '#1e293b',
  900: '#0f172a',
  950: '#020617',
};

export const lightColors = {
  primary: '#6366f1', // Indigo
  primaryDark: '#4f46e5',
  primaryGlow: 'rgba(99, 102, 241, 0.4)',
  
  gold: '#D4AF37', // Gold Premium
  goldLight: '#F3D47A',
  goldGlow: 'rgba(212, 175, 55, 0.3)',
  
  background: '#F5F1E9', // Beige from SyncScreen (Day Mode)
  surface: '#ffffff', // White
  glass: 'rgba(255, 255, 255, 0.8)', // More opaque for light mode
  glassBorder: 'rgba(0, 0, 0, 0.1)',
  
  text: '#0f172a', // Slate 900
  textMuted: '#64748b', // Slate 500
  
  success: '#10b981',
  error: '#ef4444',
  
  slate: slateScale,
};

export const darkColors = {
  primary: '#6366f1', // Indigo
  primaryDark: '#4f46e5',
  primaryGlow: 'rgba(99, 102, 241, 0.4)',
  
  gold: '#D4AF37',
  goldLight: '#F3D47A',
  goldGlow: 'rgba(212, 175, 55, 0.3)',
  
  background: '#0f172a', // Deep Space Slate
  surface: '#1e293b', // Card surface
  glass: 'rgba(255, 255, 255, 0.05)',
  glassBorder: 'rgba(255, 255, 255, 0.1)',
  
  text: '#f8fafc', // Primary text
  textMuted: '#94a3b8', // Muted text
  
  success: '#10b981',
  error: '#ef4444',
  
  slate: slateScale,
};

// Hook to use theme in components
export const useTheme = () => {
  const mode = useThemeStore((state) => state.mode);
  const colors = mode === 'light' ? lightColors : darkColors;
  return { colors, mode };
};

// Fallback for static usage (defaults to light)
export const COLORS = lightColors;

export const TYPOGRAPHY = {
  h1: {
    fontFamily: 'Inter-Black',
    fontSize: 32,
    color: COLORS.text,
  },
  h2: {
    fontFamily: 'Inter-Bold',
    fontSize: 24,
    color: COLORS.text,
  },
  body: {
    fontFamily: 'Inter-Regular',
    fontSize: 16,
    color: COLORS.text,
  },
  accent: {
    fontFamily: 'Jost-Medium',
    fontSize: 18,
    color: COLORS.gold,
  },
};

export const GLOBS = {
  borderRadius: 16,
  glassBlur: 20,
};

export const globalStyles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  glassCard: {
    backgroundColor: COLORS.glass,
    borderRadius: GLOBS.borderRadius,
    borderWidth: 1,
    borderColor: COLORS.glassBorder,
    padding: 16,
  },
});
