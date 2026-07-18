import apiClient from '../../core/api/client';
import { Env } from '../../core/config/env';
import { Product, Ingredient, Addition } from '../../domain/entities/Product';

// ─────────────────────────────────────────────────────────
// Interfaces adicionales para el módulo de Inventario
// ─────────────────────────────────────────────────────────

export interface Supplier {
  id: string;
  nombre: string;
  contacto: string;
  nit: string;
  telefono: string;
  email: string;
  direccion?: string;
  saldoPendiente?: number;
  estado: 'ACTIVO' | 'INACTIVO';
}

export interface InvoiceItem {
  nombre: string;
  cantidad: number;
  costoUnitario: number;
  unidadMedida?: string;
}

export interface SupplierInvoice {
  id: string;
  numeroFactura: string;
  proveedorId: string;
  proveedorNombre: string;
  fechaEmision: string;
  fechaVencimiento: string;
  total: number;
  pagado: number;
  estado: 'PAGADO' | 'PENDIENTE' | 'PARCIAL';
  items: InvoiceItem[];
}

export interface Asset {
  id: string;
  nombre: string;
  cantidad: number;
  valorAdquisicion: number;
  estadoConservacion: 'EXCELENTE' | 'REGULAR' | 'MANTENIMIENTO';
  ubicacion: string;
  serial?: string;
  fechaAdquisicion?: string;
}

export interface IaImportResult {
  id: string;
  nombre: string;
  cantidad: number;
  costoUnitario: number;
  unidadMedida: string;
  confianza: number; // Porcentaje entre 0.1 y 1.0
}

// ─────────────────────────────────────────────────────────
// Banco de Datos Locales Simulados (Mock Cache Store)
// ─────────────────────────────────────────────────────────

let mockSuppliers: Supplier[] = [];

let mockInvoices: SupplierInvoice[] = [];

let mockAssets: Asset[] = [];

// ─────────────────────────────────────────────────────────
// Servicio Unificado de Inventario
// ─────────────────────────────────────────────────────────

export const InventoryService = {
  
  // ─────────────────────────────────────────────────────
  // 1. PRODUCTOS, ADICIONES E INGREDIENTES (CRUD MOCKS/API)
  // ─────────────────────────────────────────────────────

  async createProduct(product: Partial<Product>): Promise<any> {
    try {
      console.log('📦 [InventoryService] Guardando nuevo producto:', product);
      // En producción:
      // const response = await apiClient.post(`${Env.API_URL}/products`, product);
      // return response.data;
      
      // Simulación exitosa:
      return { success: true, item: { ...product, id: `PROD-${Math.floor(Math.random() * 9000) + 1000}` } };
    } catch (e) {
      console.error('Error creating product', e);
      throw e;
    }
  },

  async updateProduct(id: string, updates: Partial<Product>): Promise<any> {
    try {
      console.log(`📦 [InventoryService] Actualizando producto ${id}:`, updates);
      // En producción:
      // const response = await apiClient.put(`${Env.API_URL}/products/${id}`, updates);
      // return response.data;
      return { success: true, id, updates };
    } catch (e) {
      console.error('Error updating product', e);
      throw e;
    }
  },

  async deleteProduct(id: string): Promise<any> {
    try {
      console.log(`📦 [InventoryService] Eliminando producto ${id}`);
      // En producción:
      // const response = await apiClient.delete(`${Env.API_URL}/products/${id}`);
      // return response.data;
      return { success: true, id };
    } catch (e) {
      console.error('Error deleting product', e);
      throw e;
    }
  },

  async updateAddition(id: string, updates: Partial<Addition>): Promise<any> {
    try {
      console.log(`📦 [InventoryService] Actualizando adición ${id}:`, updates);
      return { success: true, id, updates };
    } catch (e) {
      console.error('Error updating addition', e);
      throw e;
    }
  },

  async updateIngredient(id: string, updates: Partial<Ingredient>): Promise<any> {
    try {
      console.log(`📦 [InventoryService] Actualizando ingrediente ${id}:`, updates);
      return { success: true, id, updates };
    } catch (e) {
      console.error('Error updating ingredient', e);
      throw e;
    }
  },

  // ─────────────────────────────────────────────────────
  // 2. PROVEEDORES (CRUD)
  // ─────────────────────────────────────────────────────

  async getSuppliers(): Promise<Supplier[]> {
    try {
      const response = await apiClient.get(`${Env.API_URL}/providers`);
      let list: any[] = [];
      const data = response.data !== undefined ? response.data : response;
      if (data) {
        if (typeof data.body === 'string') {
          try {
            const parsed = JSON.parse(data.body);
            list = parsed.Items || parsed.items || parsed;
          } catch (e) {
            console.error('Error parsing Lambda body', e);
          }
        } else if (data.body && typeof data.body === 'object') {
          list = data.body.Items || data.body.items || data.body;
        } else if (data.Items && Array.isArray(data.Items)) {
          list = data.Items;
        } else if (data.items && Array.isArray(data.items)) {
          list = data.items;
        } else if (Array.isArray(data)) {
          list = data;
        }
      }
      
      const activeList = Array.isArray(list) ? list.filter((s: any) => s.estado !== 'ELIMINADO') : [];
      if (activeList.length > 0) {
        return activeList.map((s: any) => ({
          id: s.id || s.PK?.replace('PROVIDER#', '') || '',
          nombre: s.nombre || '',
          contacto: s.contacto || '',
          nit: s.nit || '',
          telefono: s.telefono || '',
          email: s.email || '',
          direccion: s.direccion || '',
          saldoPendiente: s.saldoPendiente || 0,
          estado: s.estado || 'ACTIVO'
        }));
      }
      return [...mockSuppliers];
    } catch (e) {
      console.warn('⚠️ [InventoryService] Failed to fetch suppliers from backend, falling back to mock:', e);
      return [...mockSuppliers];
    }
  },

  async createSupplier(supplier: Omit<Supplier, 'id'>): Promise<Supplier> {
    const newId = `PROV-${Math.floor(Math.random() * 900) + 100}`;
    const newSupplier: Supplier = {
      ...supplier,
      id: newId,
      saldoPendiente: supplier.saldoPendiente || 0
    };
    mockSuppliers.push(newSupplier);
    return newSupplier;
  },

  async updateSupplier(id: string, updates: Partial<Supplier>): Promise<Supplier> {
    const idx = mockSuppliers.findIndex(s => s.id === id);
    if (idx !== -1) {
      mockSuppliers[idx] = { ...mockSuppliers[idx], ...updates };
      return mockSuppliers[idx];
    }
    throw new Error('Supplier not found');
  },

  async deleteSupplier(id: string): Promise<boolean> {
    const initialLen = mockSuppliers.length;
    mockSuppliers = mockSuppliers.filter(s => s.id !== id);
    return mockSuppliers.length < initialLen;
  },

  // ─────────────────────────────────────────────────────
  // 3. FACTURAS PROVEEDORES (CRUD)
  // ─────────────────────────────────────────────────────

  async getInvoices(): Promise<SupplierInvoice[]> {
    try {
      const response = await apiClient.get(`${Env.API_URL}/procurement/invoices`);
      let list: any[] = [];
      const data = response.data !== undefined ? response.data : response;
      if (data) {
        if (typeof data.body === 'string') {
          try {
            const parsed = JSON.parse(data.body);
            list = parsed.Items || parsed.items || parsed;
          } catch (e) {
            console.error('Error parsing Lambda body', e);
          }
        } else if (data.body && typeof data.body === 'object') {
          list = data.body.Items || data.body.items || data.body;
        } else if (data.Items && Array.isArray(data.Items)) {
          list = data.Items;
        } else if (data.items && Array.isArray(data.items)) {
          list = data.items;
        } else if (Array.isArray(data)) {
          list = data;
        }
      }
      
      const activeList = Array.isArray(list) ? list : [];
      if (activeList.length > 0) {
        return activeList.map((i: any) => ({
          id: i.id || i.PK?.replace('INVOICE#', '') || '',
          numeroFactura: i.numeroFactura || i.invoice_number || i.id || '',
          proveedorId: i.proveedorId || i.provider_id || '',
          proveedorNombre: i.proveedorNombre || i.provider_name || 'Proveedor',
          fechaEmision: i.fechaEmision || i.fecha_emision || i.fecha_creacion || '',
          fechaVencimiento: i.fechaVencimiento || i.fecha_vencimiento || '',
          total: Number(i.total) || Number(i.total_neto) || 0,
          pagado: Number(i.pagado) || 0,
          estado: i.estado || i.status || 'PENDIENTE',
          items: Array.isArray(i.items) ? i.items.map((item: any) => ({
            nombre: item.nombre || item.name || '',
            cantidad: Number(item.cantidad) || Number(item.quantity) || 0,
            costoUnitario: Number(item.costoUnitario) || Number(item.unit_cost) || 0,
            unidadMedida: item.unidadMedida || item.unit || ''
          })) : []
        }));
      }
      return [...mockInvoices];
    } catch (e) {
      console.warn('⚠️ [InventoryService] Failed to fetch invoices from backend, falling back to mock:', e);
      return [...mockInvoices];
    }
  },

  async createInvoice(invoice: Omit<SupplierInvoice, 'id' | 'proveedorNombre'>): Promise<SupplierInvoice> {
    try {
      const payload = {
        numeroFactura: invoice.numeroFactura,
        proveedorId: invoice.proveedorId,
        fechaEmision: invoice.fechaEmision,
        fechaVencimiento: invoice.fechaVencimiento,
        total: invoice.total,
        pagado: invoice.pagado,
        estado: invoice.estado,
        items: invoice.items
      };
      const response = await apiClient.post(`${Env.API_URL}/procurement/invoices`, payload);
      const data = response.data !== undefined ? response.data : response;
      return data;
    } catch (e) {
      console.warn('⚠️ [InventoryService] Failed to create invoice in backend, using mock:', e);
      const newId = `FAC-${Math.floor(Math.random() * 9000) + 1000}`;
      const prov = mockSuppliers.find(s => s.id === invoice.proveedorId);
      const newInvoice: SupplierInvoice = {
        ...invoice,
        id: newId,
        proveedorNombre: prov ? prov.nombre : 'Proveedor Desconocido'
      };
      mockInvoices.push(newInvoice);
      if (prov && invoice.total > invoice.pagado) {
        prov.saldoPendiente = (prov.saldoPendiente || 0) + (invoice.total - invoice.pagado);
      }
      return newInvoice;
    }
  },

  async recordPayment(invoiceId: string, amount: number): Promise<SupplierInvoice> {
    try {
      const response = await apiClient.put(`${Env.API_URL}/procurement/invoices/${invoiceId}/payment`, { amount });
      const data = response.data !== undefined ? response.data : response;
      return data;
    } catch (e) {
      console.warn('⚠️ [InventoryService] Failed to record payment in backend, using mock:', e);
      const idx = mockInvoices.findIndex(f => f.id === invoiceId);
      if (idx !== -1) {
        const invoice = mockInvoices[idx];
        const newPagado = Math.min(invoice.total, invoice.pagado + amount);
        const diff = newPagado - invoice.pagado;
        invoice.pagado = newPagado;
        invoice.estado = invoice.pagado === invoice.total ? 'PAGADO' : 'PARCIAL';
        const prov = mockSuppliers.find(s => s.id === invoice.proveedorId);
        if (prov && prov.saldoPendiente) {
          prov.saldoPendiente = Math.max(0, prov.saldoPendiente - diff);
        }
        return invoice;
      }
      throw new Error('Invoice not found');
    }
  },

  // ─────────────────────────────────────────────────────
  // 4. INMOBILIARIA Y ACTIVOS (CRUD)
  // ─────────────────────────────────────────────────────

  async getAssets(): Promise<Asset[]> {
    try {
      const response = await apiClient.get(`${Env.API_URL}/inventory/assets`);
      let list: any[] = [];
      const data = response.data !== undefined ? response.data : response;
      if (data) {
        if (typeof data.body === 'string') {
          try {
            const parsed = JSON.parse(data.body);
            list = parsed.Items || parsed.items || parsed;
          } catch (e) {
            console.error('Error parsing Lambda body', e);
          }
        } else if (data.body && typeof data.body === 'object') {
          list = data.body.Items || data.body.items || data.body;
        } else if (data.Items && Array.isArray(data.Items)) {
          list = data.Items;
        } else if (data.items && Array.isArray(data.items)) {
          list = data.items;
        } else if (Array.isArray(data)) {
          list = data;
        }
      }
      
      const activeList = Array.isArray(list) ? list : [];
      if (activeList.length > 0) {
        return activeList.map((a: any) => ({
          id: a.id || a.PK?.replace('ASSET#', '') || '',
          nombre: a.nombre || a.name || '',
          cantidad: Number(a.cantidad) || Number(a.quantity) || 1,
          valorAdquisicion: Number(a.valorAdquisicion) || Number(a.acquisition_value) || 0,
          estadoConservacion: a.estadoConservacion || a.status || 'EXCELENTE',
          ubicacion: a.ubicacion || a.location || '',
          serial: a.serial || '',
          fechaAdquisicion: a.fechaAdquisicion || a.acquisition_date || ''
        }));
      }
      return [...mockAssets];
    } catch (e) {
      console.warn('⚠️ [InventoryService] Failed to fetch assets from backend, falling back to mock:', e);
      return [...mockAssets];
    }
  },

  async createAsset(asset: Omit<Asset, 'id'>): Promise<Asset> {
    try {
      const response = await apiClient.post(`${Env.API_URL}/inventory/assets`, asset);
      const data = response.data !== undefined ? response.data : response;
      return data;
    } catch (e) {
      console.warn('⚠️ [InventoryService] Failed to create asset in backend, using mock:', e);
      const newId = `ACT-${Math.floor(Math.random() * 900) + 100}`;
      const newAsset: Asset = { ...asset, id: newId };
      mockAssets.push(newAsset);
      return newAsset;
    }
  },

  async updateAsset(id: string, updates: Partial<Asset>): Promise<Asset> {
    try {
      const response = await apiClient.put(`${Env.API_URL}/inventory/assets/${id}`, updates);
      const data = response.data !== undefined ? response.data : response;
      return data;
    } catch (e) {
      console.warn('⚠️ [InventoryService] Failed to update asset in backend, using mock:', e);
      const idx = mockAssets.findIndex(a => a.id === id);
      if (idx !== -1) {
        mockAssets[idx] = { ...mockAssets[idx], ...updates };
        return mockAssets[idx];
      }
      throw new Error('Asset not found');
    }
  },

  async deleteAsset(id: string): Promise<boolean> {
    try {
      await apiClient.delete(`${Env.API_URL}/inventory/assets/${id}`);
      return true;
    } catch (e) {
      console.warn('⚠️ [InventoryService] Failed to delete asset in backend, using mock:', e);
      const initialLen = mockAssets.length;
      mockAssets = mockAssets.filter(a => a.id !== id);
      return mockAssets.length < initialLen;
    }
  },

  // ─────────────────────────────────────────────────────
  // 5. IMPORTADOR INTELIGENTE CON IA (MOCK SIMULATION)
  // ─────────────────────────────────────────────────────

  async processInvoiceWithAi(textOrImageUri: string): Promise<IaImportResult[]> {
    console.log('⚡ [AI Engine] Procesando factura con IA, entrada:', textOrImageUri);
    
    // Simulamos un delay de red/procesamiento de red neuronal (2.5 segundos)
    await new Promise(resolve => setTimeout(resolve, 2500));
    
    // Resultados de importación realistas detectados de la factura
    return [
      { id: 'AI-1', nombre: 'Pechuga de Pollo Fileteada Premium', cantidad: 25, costoUnitario: 14500, unidadMedida: 'kg', confianza: 0.98 },
      { id: 'AI-2', nombre: 'Queso Doble Crema Bloque 2.5kg', cantidad: 6, costoUnitario: 32000, unidadMedida: 'unidades', confianza: 0.94 },
      { id: 'AI-3', nombre: 'Cerveza Club Colombia Dorada 330ml', cantidad: 120, costoUnitario: 2400, unidadMedida: 'unidades', confianza: 0.91 },
      { id: 'AI-4', nombre: 'Aceite de Soya de Cocina 5L', cantidad: 4, costoUnitario: 42000, unidadMedida: 'unidades', confianza: 0.88 },
      { id: 'AI-5', nombre: 'Cebolla Cabezona Blanca Limpia kg', cantidad: 15, costoUnitario: 3500, unidadMedida: 'kg', confianza: 0.82 },
    ];
  },

  clearLocalMocks() {
    mockSuppliers = [];
    mockInvoices = [];
    mockAssets = [];
    console.log('🔄 [InventoryService] Bancos de datos locales de proveedores, facturas y activos limpiados.');
  }
};
