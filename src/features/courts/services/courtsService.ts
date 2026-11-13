import apiClient from '@/core/api/client';
import { Env } from '@/core/config/env';
import {
    BookingCreatePayload,
    BookingCreateResult,
    Court,
    CourtAsset,
    CourtAttributeDef,
    CourtAvailability,
    CourtBlock,
    CourtBooking,
    CourtPaymentMethod,
    CourtSeries,
    CourtSettings,
    PriceBreakdown,
    Promotion,
    Rate,
    SeriesCreatePayload,
} from '../types/courts.types';

const COURTS_URL = process.env.EXPO_PUBLIC_COURTS_URL || Env.API_URL;

const unwrap = <T,>(response: unknown): T => {
    let data: unknown = response;
    if (data && typeof data === 'object' && 'data' in data) {
        data = (data as { data: unknown }).data;
    }
    if (data && typeof data === 'object' && 'body' in data) {
        const body = (data as { body: unknown }).body;
        if (typeof body === 'string') {
            try {
                data = JSON.parse(body);
            } catch {
                data = body;
            }
        } else {
            data = body;
        }
    }
    if (data && typeof data === 'object' && 'data' in data) {
        return (data as { data: T }).data;
    }
    return data as T;
};

const asArray = <T,>(value: unknown): T[] => {
    if (Array.isArray(value)) return value as T[];
    if (value && typeof value === 'object') {
        const record = value as { Items?: unknown; items?: unknown; data?: unknown };
        if (Array.isArray(record.Items)) return record.Items as T[];
        if (Array.isArray(record.items)) return record.items as T[];
        if (Array.isArray(record.data)) return record.data as T[];
    }
    return [];
};

export const CourtsService = {
    async listCourts(includeInactive = true): Promise<Court[]> {
        const response = await apiClient.get(`${COURTS_URL}/courts`, {
            params: { include_inactive: String(includeInactive) },
        });
        return asArray<Court>(unwrap<unknown>(response));
    },

    async getCourt(courtId: string): Promise<Court> {
        const response = await apiClient.get(`${COURTS_URL}/courts/${courtId}`);
        return unwrap<Court>(response);
    },

    async createCourt(payload: Partial<Court>): Promise<Court> {
        const response = await apiClient.post(`${COURTS_URL}/courts`, payload);
        return unwrap<Court>(response);
    },

    async updateCourt(courtId: string, payload: Partial<Court>): Promise<Court> {
        const response = await apiClient.put(`${COURTS_URL}/courts/${courtId}`, payload);
        return unwrap<Court>(response);
    },

    async deleteCourt(courtId: string): Promise<void> {
        await apiClient.delete(`${COURTS_URL}/courts/${courtId}`);
    },

    async listAttributes(): Promise<CourtAttributeDef[]> {
        const response = await apiClient.get(`${COURTS_URL}/courts/attributes`);
        return asArray<CourtAttributeDef>(unwrap<unknown>(response));
    },

    async upsertAttribute(payload: CourtAttributeDef): Promise<CourtAttributeDef> {
        const response = await apiClient.post(`${COURTS_URL}/courts/attributes`, payload);
        return unwrap<CourtAttributeDef>(response);
    },

    async deleteAttribute(key: string): Promise<void> {
        await apiClient.delete(`${COURTS_URL}/courts/attributes/${encodeURIComponent(key)}`);
    },

    async listBlocks(courtId: string): Promise<CourtBlock[]> {
        const response = await apiClient.get(`${COURTS_URL}/courts/${courtId}/blocks`);
        return asArray<CourtBlock>(unwrap<unknown>(response));
    },

    async createBlock(courtId: string, payload: Partial<CourtBlock>): Promise<CourtBlock> {
        const response = await apiClient.post(`${COURTS_URL}/courts/${courtId}/blocks`, payload);
        return unwrap<CourtBlock>(response);
    },

    async deleteBlock(blockId: string, courtId: string): Promise<void> {
        await apiClient.delete(`${COURTS_URL}/courts/blocks/${blockId}`, {
            params: { court_id: courtId },
        });
    },

    async listRates(courtId: string): Promise<Rate[]> {
        const response = await apiClient.get(`${COURTS_URL}/courts/${courtId}/rates`);
        return asArray<Rate>(unwrap<unknown>(response));
    },

    async createRate(courtId: string, payload: Partial<Rate>): Promise<Rate> {
        const response = await apiClient.post(`${COURTS_URL}/courts/${courtId}/rates`, payload);
        return unwrap<Rate>(response);
    },

    async updateRate(rateId: string, courtId: string, payload: Partial<Rate>): Promise<Rate> {
        const response = await apiClient.put(`${COURTS_URL}/courts/rates/${rateId}`, payload, {
            params: { court_id: courtId },
        });
        return unwrap<Rate>(response);
    },

    async deleteRate(rateId: string, courtId: string, scope: 'COURT' | 'STORE' = 'COURT'): Promise<void> {
        await apiClient.delete(`${COURTS_URL}/courts/rates/${rateId}`, {
            params: { court_id: courtId, scope },
        });
    },

    async listPromotions(): Promise<Promotion[]> {
        const response = await apiClient.get(`${COURTS_URL}/courts/promotions`);
        return asArray<Promotion>(unwrap<unknown>(response));
    },

    async createPromotion(payload: Partial<Promotion>): Promise<Promotion> {
        const response = await apiClient.post(`${COURTS_URL}/courts/promotions`, payload);
        return unwrap<Promotion>(response);
    },

    async updatePromotion(promoId: string, payload: Partial<Promotion>): Promise<Promotion> {
        const response = await apiClient.put(`${COURTS_URL}/courts/promotions/${promoId}`, payload);
        return unwrap<Promotion>(response);
    },

    async deletePromotion(promoId: string): Promise<void> {
        await apiClient.delete(`${COURTS_URL}/courts/promotions/${promoId}`);
    },

    async addPromotionException(
        promoId: string,
        payload: { dates?: string[]; iso_weeks?: string[]; weekdays?: number[] }
    ): Promise<Promotion> {
        const response = await apiClient.post(`${COURTS_URL}/courts/promotions/${promoId}/exceptions`, payload);
        return unwrap<Promotion>(response);
    },

    async removePromotionException(
        promoId: string,
        payload: { dates?: string[]; iso_weeks?: string[]; weekdays?: number[] }
    ): Promise<Promotion> {
        const response = await apiClient.delete(`${COURTS_URL}/courts/promotions/${promoId}/exceptions`, {
            data: payload,
        });
        return unwrap<Promotion>(response);
    },

    async quote(
        courtId: string,
        date: string,
        startTime: string,
        durationMinutes: number,
        promoCode?: string
    ): Promise<PriceBreakdown> {
        const response = await apiClient.post(`${COURTS_URL}/courts/pricing/quote`, {
            court_id: courtId,
            date,
            start_time: startTime,
            duration_minutes: durationMinutes,
            promo_code: promoCode || undefined,
        });
        return unwrap<PriceBreakdown>(response);
    },

    async getGrid(date: string, durationMinutes = 60): Promise<CourtAvailability> {
        const response = await apiClient.get(`${COURTS_URL}/courts/grid`, {
            params: { date, duration_minutes: durationMinutes },
        });
        return unwrap<CourtAvailability>(response);
    },

    async getAvailability(date: string, durationMinutes = 60, courtId?: string): Promise<CourtAvailability> {
        const response = await apiClient.get(`${COURTS_URL}/courts/availability`, {
            params: {
                date,
                duration_minutes: durationMinutes,
                ...(courtId ? { court_id: courtId } : {}),
            },
        });
        return unwrap<CourtAvailability>(response);
    },

    async listBookings(date?: string, customerPhone?: string): Promise<CourtBooking[]> {
        const response = await apiClient.get(`${COURTS_URL}/courts/bookings`, {
            params: {
                ...(date ? { date } : {}),
                ...(customerPhone ? { customer_phone: customerPhone } : {}),
            },
        });
        return asArray<CourtBooking>(unwrap<unknown>(response));
    },

    async getBooking(bookingId: string): Promise<CourtBooking> {
        const response = await apiClient.get(`${COURTS_URL}/courts/bookings/${bookingId}`);
        return unwrap<CourtBooking>(response);
    },

    async createBooking(payload: BookingCreatePayload): Promise<BookingCreateResult> {
        const response = await apiClient.post(`${COURTS_URL}/courts/bookings`, payload);
        return unwrap<BookingCreateResult>(response);
    },

    async updateBooking(bookingId: string, payload: Partial<CourtBooking>): Promise<CourtBooking> {
        const response = await apiClient.put(`${COURTS_URL}/courts/bookings/${bookingId}`, payload);
        return unwrap<CourtBooking>(response);
    },

    async cancelBooking(bookingId: string, reason?: string, scope: 'SINGLE' | 'FUTURE' = 'SINGLE'): Promise<CourtBooking> {
        const response = await apiClient.post(`${COURTS_URL}/courts/bookings/${bookingId}/cancel`, { reason, scope });
        return unwrap<CourtBooking>(response);
    },

    async checkIn(bookingId: string): Promise<CourtBooking> {
        const response = await apiClient.post(`${COURTS_URL}/courts/bookings/${bookingId}/check-in`, {});
        return unwrap<CourtBooking>(response);
    },

    async noShow(bookingId: string): Promise<CourtBooking> {
        const response = await apiClient.post(`${COURTS_URL}/courts/bookings/${bookingId}/no-show`, {});
        return unwrap<CourtBooking>(response);
    },

    async closeBooking(bookingId: string): Promise<CourtBooking> {
        const response = await apiClient.post(`${COURTS_URL}/courts/bookings/${bookingId}/close`, {});
        return unwrap<CourtBooking>(response);
    },

    async listPaymentMethods(): Promise<CourtPaymentMethod[]> {
        const response = await apiClient.get(`${COURTS_URL}/courts/payment-methods`);
        return asArray<CourtPaymentMethod>(unwrap<unknown>(response));
    },

    async createPayment(
        bookingId: string,
        payload: {
            amount: number;
            payment_method_id: string;
            reference?: string;
            evidence_url?: string;
            cash_register_id?: string;
            idempotency_key?: string;
            notes?: string;
        }
    ): Promise<unknown> {
        const response = await apiClient.post(`${COURTS_URL}/courts/bookings/${bookingId}/payments`, payload);
        return unwrap<unknown>(response);
    },

    async getSettings(): Promise<CourtSettings> {
        const response = await apiClient.get(`${COURTS_URL}/courts/settings`);
        return unwrap<CourtSettings>(response);
    },

    async updateSettings(publicBaseUrl: string | null): Promise<CourtSettings> {
        const response = await apiClient.put(`${COURTS_URL}/courts/settings`, {
            public_base_url: publicBaseUrl,
        });
        return unwrap<CourtSettings>(response);
    },

    async createSeries(payload: SeriesCreatePayload): Promise<{ series_id: string; generated: string[]; conflicts: unknown[] }> {
        const response = await apiClient.post(`${COURTS_URL}/courts/series`, payload);
        return unwrap(response);
    },

    async listSeries(): Promise<CourtSeries[]> {
        const response = await apiClient.get(`${COURTS_URL}/courts/series`);
        return asArray<CourtSeries>(unwrap<unknown>(response));
    },

    async cancelSeries(seriesId: string): Promise<CourtSeries> {
        const response = await apiClient.delete(`${COURTS_URL}/courts/series/${seriesId}`);
        return unwrap<CourtSeries>(response);
    },

    async listCourtAssets(): Promise<CourtAsset[]> {
        const response = await apiClient.get(`${COURTS_URL}/inventory/assets`);
        return asArray<CourtAsset>(unwrap<unknown>(response));
    },
};
