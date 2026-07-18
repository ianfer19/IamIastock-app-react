import { Middleware } from '@reduxjs/toolkit';
import { SoundService } from '../../services/soundService';

/**
 * ARCHITECTURE: Senior Lead Sound and Haptic Feedback Middleware
 * -------------------------------------------------------------
 * Intercepts Redux cart actions to automatically trigger rich physical 
 * and acoustic sensory feedback. No component-level boilerplates required!
 */
export const soundMiddleware: Middleware = () => (next) => (action: any) => {
  const result = next(action);

  if (action && action.type) {
    switch (action.type) {
      case 'cart/addToCart':
      case 'cart/updateQuantity':
      case 'cart/removeFromCart':
        SoundService.playClick();
        break;

      case 'cart/updateCartItemCustomization':
        SoundService.playSuccess();
        break;

      default:
        // Handle thunk outcomes for parkOrder and finalizeOrder
        if (action.type.endsWith('/fulfilled')) {
          if (action.type.includes('parkOrder') || action.type.includes('finalizeOrder')) {
            SoundService.playSuccess();
          }
        } else if (action.type.endsWith('/rejected')) {
          if (action.type.includes('parkOrder') || action.type.includes('finalizeOrder')) {
            SoundService.playError();
          }
        }
        break;
    }
  }

  return result;
};
