import { combineReducers } from '@reduxjs/toolkit';
import authReducer from './slices/authSlice';
import posReducer from './slices/posSlice';
import catalogReducer from './slices/catalogSlice';
import cartReducer from './slices/cartSlice';
import chatReducer from './slices/chatSlice';

import tenantReducer from './slices/tenantSlice';

const appReducer = combineReducers({
  auth: authReducer,
  pos: posReducer,
  catalog: catalogReducer,
  cart: cartReducer,
  chat: chatReducer,
  tenant: tenantReducer,
});

const rootReducer = (state: any, action: any) => {
  if (action.type === 'RESET_STORE_DATA') {
    state = {
      auth: state?.auth,
      pos: undefined,
      catalog: undefined,
      cart: undefined,
      chat: undefined,
      tenant: undefined,
    };
  }
  return appReducer(state, action);
};

export default rootReducer;
export type RootState = ReturnType<typeof appReducer>;
