import { createAudioPlayer } from 'expo-audio';
import * as Haptics from 'expo-haptics';

// Local assets are now embedded in the app
const SOUND_ASSETS = {
  SUCCESS: require('../../../assets/sounds/success.mp3'),
  ERROR: require('../../../assets/sounds/error.mp3'),
  CLICK: require('../../../assets/sounds/click.mp3'),
};

export const SoundService = {
  playSuccess: () => {
    try {
      // Audio
      const player = createAudioPlayer(SOUND_ASSETS.SUCCESS);
      player.play();
      
      // Physical haptic feedback
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    } catch (e) {
      console.log('Error playing local success sound', e);
    }
  },

  playError: () => {
    try {
      // Audio
      const player = createAudioPlayer(SOUND_ASSETS.ERROR);
      player.play();
      
      // Physical haptic feedback
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => {});
    } catch (e) {
      console.log('Error playing local error sound', e);
    }
  },

  playClick: () => {
    try {
      // Audio
      const player = createAudioPlayer(SOUND_ASSETS.CLICK);
      player.play();
      
      // Physical haptic feedback
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    } catch (e) {
      console.log('Error playing local click sound', e);
    }
  }
};
