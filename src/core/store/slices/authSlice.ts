import { createSlice, PayloadAction } from '@reduxjs/toolkit';

interface AuthState {
  user: any | null;
  tenantId: string | null;
  role: 'waiter' | 'admin' | 'kitchen' | 'owner' | null;
  isAuthenticated: boolean;
  isSocketRegistered: boolean;
}

const initialState: AuthState = {
  user: null,
  tenantId: null,
  role: null,
  isAuthenticated: false,
  isSocketRegistered: false,
};

export const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    /**
     * Set global authentication state.
     * This triggers the WebSocket registration middleware.
     */
    setAuth: (state, action: PayloadAction<{ user: any; tenantId: string }>) => {
      state.user = action.payload.user;
      state.tenantId = action.payload.tenantId;
      state.role = (action.payload.user.role as any) || 'waiter';
      state.isAuthenticated = true;
    },
    
    /**
     * Update active tenant context.
     */
    updateTenantId: (state, action: PayloadAction<string>) => {
      state.tenantId = action.payload;
      if (state.user) {
        state.user.tenant_id = action.payload;
      }
    },
    
    /**
     * Reset auth state and disconnect sockets.
     */
    logout: (state) => {
      state.user = null;
      state.tenantId = null;
      state.role = null;
      state.isAuthenticated = false;
      state.isSocketRegistered = false;
    },
    
    /**
     * Updates registration status from the WebSocket middleware.
     */
    setSocketRegistered: (state, action: PayloadAction<boolean>) => {
      state.isSocketRegistered = action.payload;
    },
    
    /**
     * Update user profile information dynamically (e.g., commerce name from /admin/me).
     */
    updateUserProfile: (state, action: PayloadAction<any>) => {
      if (state.user) {
        state.user = {
          ...state.user,
          ...action.payload,
        };
      } else {
        state.user = action.payload;
      }
    }
  }
});

export const { setAuth, updateTenantId, logout, setSocketRegistered, updateUserProfile } = authSlice.actions;
export default authSlice.reducer;
