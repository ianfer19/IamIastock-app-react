import { configureStore } from '@reduxjs/toolkit';
import { TypedUseSelectorHook, useDispatch, useSelector } from 'react-redux';
import rootReducer, { RootState } from './rootReducer';
import { socketMiddleware } from './middleware/socketMiddleware';
import { soundMiddleware } from './middleware/soundMiddleware';

/**
 * ARCHITECTURE: Senior Lead Redux Store
 * -------------------------------------
 * Centralized store with real-time middleware integration.
 * We disable serializableCheck for performance in high-frequency socket updates.
 */

export const store = configureStore({
  reducer: rootReducer,
  middleware: (getDefaultMiddleware) => 
    getDefaultMiddleware({
      serializableCheck: false, 
    }).concat(socketMiddleware, soundMiddleware),
});

// Custom hooks for type-safe interaction
export type AppDispatch = typeof store.dispatch;
export const useAppDispatch = () => useDispatch<AppDispatch>();
export const useAppSelector: TypedUseSelectorHook<RootState> = useSelector;
