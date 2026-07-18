import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { TenantService, TenantConfig } from '../../../infrastructure/services/tenantService';

interface TenantState {
  data: TenantConfig | null;
  loading: boolean;
  saving: boolean;
  error: string | null;
}

const initialState: TenantState = {
  data: null,
  loading: false,
  saving: false,
  error: null,
};

// Async Thunks
export const fetchTenantConfig = createAsyncThunk(
  'tenant/fetchConfig',
  async (tenantId: string, { rejectWithValue }) => {
    try {
      return await TenantService.getTenantConfig(tenantId);
    } catch (error: any) {
      return rejectWithValue(error.message || 'Error fetching tenant config');
    }
  }
);

export const saveTenantTab = createAsyncThunk(
  'tenant/saveTab',
  async ({ tenantId, tabId, payload }: { tenantId: string, tabId: string, payload: any }, { rejectWithValue }) => {
    try {
      let response;
      switch (tabId) {
        case 'localizacion':
        case 'ubicacion':
          response = await TenantService.updateRegional(tenantId, payload);
          break;
        case 'operaciones':
          response = await TenantService.updateOperations(tenantId, payload);
          break;
        case 'facturacion':
          response = await TenantService.updateBilling(tenantId, payload);
          break;
        case 'integraciones':
          response = await TenantService.updateConnectors(tenantId, payload);
          break;
        case 'factus_api':
          response = await TenantService.updateFactusConfig(tenantId, payload);
          break;
        case 'cash_control':
          response = await TenantService.updateCashControl(tenantId, payload);
          break;
        case 'bots_entitlements':
          response = await TenantService.updateBotEntitlements(tenantId, payload.allowed_bots);
          break;
        default:
          throw new Error('Tab type not supported for save');
      }
      return response; // Can be used to optimistically update or just return success
    } catch (error: any) {
      return rejectWithValue(error.message || 'Error saving tenant tab');
    }
  }
);

const tenantSlice = createSlice({
  name: 'tenant',
  initialState,
  reducers: {
    clearTenantError: (state) => {
      state.error = null;
    }
  },
  extraReducers: (builder) => {
    builder
      // Fetch Config
      .addCase(fetchTenantConfig.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchTenantConfig.fulfilled, (state, action) => {
        state.loading = false;
        state.data = action.payload;
      })
      .addCase(fetchTenantConfig.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      
      // Save Tab
      .addCase(saveTenantTab.pending, (state) => {
        state.saving = true;
        state.error = null;
      })
      .addCase(saveTenantTab.fulfilled, (state, action) => {
        state.saving = false;
        // Optionally update the local state data with the returned payload if the API returns it
      })
      .addCase(saveTenantTab.rejected, (state, action) => {
        state.saving = false;
        state.error = action.payload as string;
      });
  },
});

export const { clearTenantError } = tenantSlice.actions;
export default tenantSlice.reducer;
