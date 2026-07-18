import { Dimensions, PixelRatio, Platform } from 'react-native';

// Use 'screen' instead of 'window' to avoid scale changes when the keyboard opens on Android
const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('screen');

// Guideline sizes are based on standard ~5" screen mobile device (iPhone 11/12/13)
const GUIDELINE_BASE_WIDTH = 375;
const GUIDELINE_BASE_HEIGHT = 812;

/**
 * Scaling utility to mimic 'rem' behavior.
 * Scales the size based on physical screen width.
 */
export const rem = (size: number) => {
  const scale = SCREEN_WIDTH / GUIDELINE_BASE_WIDTH;
  const newSize = size * scale;
  
  // For tablets, we apply a small dampening factor to avoid overly large elements
  if (SCREEN_WIDTH > 600) {
    return Math.round(PixelRatio.roundToNearestPixel(newSize * 0.7));
  }
  
  return Math.round(PixelRatio.roundToNearestPixel(newSize));
};

/**
 * Vertical scaling utility for heights and vertical margins.
 */
export const vh = (size: number) => {
  const scale = SCREEN_HEIGHT / GUIDELINE_BASE_HEIGHT;
  return Math.round(PixelRatio.roundToNearestPixel(size * scale));
};

export const IS_TABLET = SCREEN_WIDTH > 600;
export const IS_IOS = Platform.OS === 'ios';
export const WINDOW_WIDTH = SCREEN_WIDTH;
export const WINDOW_HEIGHT = SCREEN_HEIGHT;
