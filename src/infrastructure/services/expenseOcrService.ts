import apiClient from '../../core/api/client';
import { Env } from '../../core/config/env';

export interface ExpenseOcrDraft {
  id: string;
  vendor_name?: string;
  proveedor_id?: string;
  numero_factura?: string;
  fecha_emision?: string;
  description?: string;
  status: 'PROCESSING' | 'READY' | 'CONFIRMED' | 'ERROR';
  subtotal: number;
  total_iva: number;
  total_neto: number;
  evidence_url?: string;
  lineas: OcrLineaFactura[];
  moneda?: string;
}

export interface OcrLineaFactura {
  item_id: string | null;
  tipo: 'PRODUCT' | 'INGREDIENT';
  nombre: string;
  nombre_ocr: string;
  cantidad: number;
  costo_unitario: number;
  total_linea: number;
  iva_porcentaje: number;
  subtotal: number;
  match_status: 'MATCHED' | 'NO_MATCH';
  match_confidence: number;
}

export interface OcrUploadUrlResponse {
  upload_url: string;
  key: string;
  file_id: string;
}

const parseLambdaResponse = (response: any) => {
  if (!response) return null;
  const data = response.data !== undefined ? response.data : response;
  if (!data) return null;

  if (typeof data.body === 'string') {
    try {
      const parsedBody = JSON.parse(data.body);
      return parsedBody.Items || parsedBody.items || parsedBody;
    } catch (e) {
      console.error('Error parsing Lambda body string:', e);
      return data.body;
    }
  }

  if (data.body && typeof data.body === 'object') {
    const b = data.body;
    return b.Items || b.items || b;
  }

  if (data.Items && Array.isArray(data.Items)) {
    return data.Items;
  }

  if (data.items && Array.isArray(data.items)) {
    return data.items;
  }

  return data;
};

export const ExpenseOcrService = {
  /**
   * Step 1: Get presigned S3 URL for upload
   */
  async getUploadUrl(fileName: string, contentType: string): Promise<OcrUploadUrlResponse> {
    try {
      const response = await apiClient.get(`${Env.ADMIN_URL}/expenses/upload-url`, {
        params: { fileName, contentType }
      });
      // Handle standard Lambda wrapping if it exists
      const data = response.data?.body ? JSON.parse(response.data.body) : response.data;
      return data;
    } catch (error) {
      console.error('❌ [ExpenseOcrService] Error getting upload URL:', error);
      throw error;
    }
  },

  /**
   * Step 2: Upload binary file directly to S3 via PUT
   * Uses native fetch to avoid adding axios headers
   */
  async uploadFile(url: string, fileUri: string, mimeType: string): Promise<any> {
    try {
      console.log('📡 [ExpenseOcrService] Iniciando PUT a S3 con local URI:', fileUri);
      
      const fileResponse = await fetch(fileUri);
      const blob = await fileResponse.blob();

      const uploadResponse = await fetch(url, {
        method: 'PUT',
        headers: {
          'Content-Type': mimeType || 'image/jpeg',
        },
        body: blob,
      });

      if (!uploadResponse.ok) {
        const errorText = await uploadResponse.text();
        throw new Error(errorText || `S3 Upload Error: ${uploadResponse.status}`);
      }

      console.log('✅ [ExpenseOcrService] Carga a S3 exitosa');
      return { status: uploadResponse.status, ok: uploadResponse.ok };
    } catch (error) {
      console.error('❌ [ExpenseOcrService] Error uploading file to S3:', error);
      throw error;
    }
  },

  /**
   * Step 3: Fetch active OCR drafts
   */
  async getDrafts(): Promise<ExpenseOcrDraft[]> {
    try {
      const response = await apiClient.get(`${Env.ADMIN_URL}/expenses/drafts`);
      const items = parseLambdaResponse(response);
      const list = Array.isArray(items) ? items : [];

      return list.map((draft: any) => ({
        ...draft,
        status: draft.status || (draft.lineas?.length > 0 ? 'READY' : 'PROCESSING'),
        lineas: draft.lineas || [],
        subtotal: draft.subtotal || 0,
        total_iva: draft.total_iva || 0,
        total_neto: draft.total_neto || 0,
      })) as ExpenseOcrDraft[];
    } catch (error) {
      console.error('❌ [ExpenseOcrService] Error fetching drafts:', error);
      throw error;
    }
  },

  /**
   * Step 4: Confirm general expense draft
   */
  async confirmDraft(id: string, payload: any): Promise<any> {
    try {
      const response = await apiClient.post(`${Env.ADMIN_URL}/expenses/drafts/${id}/confirm`, payload);
      return parseLambdaResponse(response);
    } catch (error) {
      console.error(`❌ [ExpenseOcrService] Error confirming draft ${id}:`, error);
      throw error;
    }
  },

  /**
   * Step 5: Discard/Delete OCR draft
   */
  async deleteDraft(id: string): Promise<any> {
    try {
      const response = await apiClient.delete(`${Env.ADMIN_URL}/expenses/drafts/${id}`);
      return parseLambdaResponse(response);
    } catch (error) {
      console.error(`❌ [ExpenseOcrService] Error deleting draft ${id}:`, error);
      throw error;
    }
  },

  /**
   * Step 6: Save a procurement stock purchase invoice
   */
  async saveProcurementInvoice(payload: any): Promise<any> {
    try {
      const response = await apiClient.post(`${Env.API_URL}/procurement/invoices`, payload);
      return parseLambdaResponse(response);
    } catch (error) {
      console.error('❌ [ExpenseOcrService] Error saving procurement invoice:', error);
      throw error;
    }
  }
};
