import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { PosService } from '@/infrastructure/services/posService';

interface PosState {
  zones: any[];
  floors: any[];
  selectedRegisterId: string | null;
  selectedRegisterName: string | null;
  sessionStatus: 'OPEN' | 'CLOSED' | null;
  loading: {
    zones: boolean;
    floors: boolean;
  };
  lastFetched: {
    zones: number;
    floors: number;
  };
}

const initialState: PosState = {
  zones: [],
  floors: [],
  selectedRegisterId: null,
  selectedRegisterName: null,
  sessionStatus: null,
  loading: {
    zones: false,
    floors: false,
  },
  lastFetched: {
    zones: 0,
    floors: 0,
  }
};

// 5 minutes cache
const CACHE_TIMEOUT = 5 * 60 * 1000;

/**
 * THUNKS: With Smart Caching
 * -------------------------
 * These only hit the API if the data is stale or empty.
 */
export const fetchFloors = createAsyncThunk(
  'pos/fetchFloors',
  async (options: { force?: boolean } | undefined, { getState }) => {
    const { pos } = getState() as { pos: PosState };
    if (!options?.force && Date.now() - pos.lastFetched.floors < CACHE_TIMEOUT && pos.floors.length > 0) {
      return null; // Skip fetch
    }
    return await PosService.getFloors();
  }
);

export const fetchZones = createAsyncThunk(
  'pos/fetchZones',
  async (options: { force?: boolean } | undefined, { getState }) => {
    const { pos } = getState() as { pos: PosState };
    if (!options?.force && Date.now() - pos.lastFetched.zones < CACHE_TIMEOUT && pos.zones.length > 0) {
      return null;
    }
    return await PosService.getZones();
  }
);

export const posSlice = createSlice({
  name: 'pos',
  initialState,
  reducers: {
    /**
     * REAL-TIME: Update tables from WebSocket (No longer used for global tables state)
     */
    updateTablesFromSocket: () => {
      // Tables are now handled locally in MesasScreen
    },
    setSelectedRegister: (state, action: PayloadAction<{ id: string | null; name: string | null }>) => {
      state.selectedRegisterId = action.payload.id;
      state.selectedRegisterName = action.payload.name;
    },
    setSessionStatus: (state, action: PayloadAction<'OPEN' | 'CLOSED' | null>) => {
      state.sessionStatus = action.payload;
    },
    /**
     * RESET: Clear cached zones/floors when switching store
     */
    clearPosState: (state) => {
      state.zones = [];
      state.floors = [];
      state.lastFetched = {
        zones: 0,
        floors: 0
      };
    }
  },
  extraReducers: (builder) => {
    builder
      // Floors
      .addCase(fetchFloors.pending, (state) => { state.loading.floors = true; })
      .addCase(fetchFloors.fulfilled, (state, action) => {
        state.loading.floors = false;
        if (action.payload !== null) {
          state.floors = action.payload;
          state.lastFetched.floors = Date.now();
        }
      })
      // Zones
      .addCase(fetchZones.pending, (state) => { state.loading.zones = true; })
      .addCase(fetchZones.fulfilled, (state, action) => {
        state.loading.zones = false;
        if (action.payload !== null) {
          state.zones = action.payload;
          state.lastFetched.zones = Date.now();
        }
      });
  }
});

export const { updateTablesFromSocket, setSelectedRegister, setSessionStatus, clearPosState } = posSlice.actions;
export default posSlice.reducer;
