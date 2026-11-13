import { CurrencyService } from '@/core/services/currencyService';
import { Promotion, Rate } from '../types/courts.types';

export const COURTS_DAYS = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];
export const COURTS_DAYS_LONG = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];

export const roundAmount = (value: unknown): number => {
    const number = Number(value);
    if (!Number.isFinite(number)) return 0;
    return Math.max(0, Math.round(number));
};

export const formatMoney = (value: unknown): string => CurrencyService.format(roundAmount(value));

export const formatMoneyNoDecimals = (value: unknown): string => {
    const amount = roundAmount(value);
    try {
        const config = CurrencyService.getConfig();
        return new Intl.NumberFormat(config.locale, {
            style: 'currency',
            currency: config.code,
            minimumFractionDigits: 0,
            maximumFractionDigits: 0,
        }).format(amount);
    } catch {
        return `$${amount.toLocaleString('es-CO')}`;
    }
};

export const isoDate = (date: Date = new Date()): string => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
};

export const addDays = (base: Date, days: number): Date => {
    const copy = new Date(base);
    copy.setDate(copy.getDate() + days);
    return copy;
};

export const parseDate = (iso: string): Date => new Date(`${iso}T12:00:00`);

export const formatDateLong = (iso: string): string => {
    if (!iso) return '';
    try {
        return parseDate(iso).toLocaleDateString('es-CO', {
            weekday: 'long',
            day: 'numeric',
            month: 'long',
        });
    } catch {
        return iso;
    }
};

export const formatDateShort = (iso: string): string => {
    if (!iso) return '';
    try {
        return parseDate(iso).toLocaleDateString('es-CO', { day: '2-digit', month: 'short' });
    } catch {
        return iso;
    }
};

export const timeToMinutes = (value: string): number => {
    const match = /^(\d{1,2}):(\d{2})$/.exec(value || '');
    if (!match) return 0;
    return Number(match[1]) * 60 + Number(match[2]);
};

export const minutesToTime = (minutes: number): string => {
    const safe = Math.max(0, Math.min(24 * 60, minutes));
    const hours = Math.floor(safe / 60);
    const rest = safe % 60;
    return `${String(hours).padStart(2, '0')}:${String(rest).padStart(2, '0')}`;
};

export const formatHour = (minutes: number): string => {
    const safe = Math.max(0, Math.min(24 * 60, minutes));
    const hours = Math.floor(safe / 60);
    const rest = safe % 60;
    const suffix = hours >= 12 ? 'p' : 'a';
    const displayHour = hours % 12 === 0 ? 12 : hours % 12;
    return rest === 0 ? `${displayHour}${suffix}` : `${displayHour}:${String(rest).padStart(2, '0')}${suffix}`;
};

export const dayLabel = (day: number): string => COURTS_DAYS[day] || '';

export const rateKey = (rate: Rate): string => `${rate.rate_id}|${rate.scope}|${rate.court_id || 'STORE'}`;

export const promotionValueLabel = (promotion: Promotion): string => {
    if (promotion.type === 'PERCENT') return `${roundAmount(promotion.value)}%`;
    if (promotion.type === 'FIXED') return formatMoneyNoDecimals(promotion.value);
    if (promotion.type === 'TWO_FOR_ONE') return '2x1';
    return 'Combo';
};

export const promotionTimeLabel = (promotion: Promotion): string => {
    const range = promotion.time_ranges?.[0];
    return `${range?.start || '00:00'} – ${range?.end || '24:00'}`;
};

export const statusLabel = (status: string): string => {
    if (status === 'MAINTENANCE') return 'Mantenimiento';
    if (status === 'INACTIVE') return 'Inactiva';
    return 'Activa';
};

export const surfaceLabel = (surface: string): string => {
    if (surface === 'CONCRETE') return 'Cemento';
    if (surface === 'NATURAL_GRASS') return 'Grama natural';
    if (surface === 'OTHER') return 'Otra';
    return 'Sintética';
};

export const attributeTypeLabel = (type: string): string => {
    if (type === 'TEXT') return 'Texto';
    if (type === 'NUMBER') return 'Número';
    if (type === 'SELECT') return 'Lista';
    return 'Sí / No';
};

export const stripAccents = (value: string): string =>
    (value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '');

export const sanitizeAttributeKey = (value: string): string =>
    stripAccents(value)
        .toLowerCase()
        .replace(/[^a-z0-9_]+/g, '_')
        .replace(/_+/g, '_')
        .replace(/^_+|_+$/g, '');

export const slugifyAttributeKey = (label: string): string => {
    const base = sanitizeAttributeKey(label);
    if (!base) return '';
    if (base.length >= 2) return base.slice(0, 40);
    return `${base}_1`;
};

export const isValidAttributeKey = (value: string): boolean => /^[a-z0-9_]{2,40}$/.test(value || '');

export const courtErrorMessage = (error: unknown, fallback: string): string => {
    const typed = error as {
        response?: { data?: { error?: string; message?: string; details?: unknown[] } };
        message?: string;
    };
    const details = typed?.response?.data?.details;
    if (Array.isArray(details) && details.length) {
        const first = details[0] as { loc?: unknown[]; msg?: string; type?: string; ctx?: Record<string, unknown> };
        const field = Array.isArray(first.loc) ? String(first.loc[first.loc.length - 1]) : 'campo';
        if (first.type === 'string_pattern_mismatch') {
            return 'La clave solo permite minúsculas, números y guion bajo.';
        }
        if (first.msg) return `${field}: ${first.msg}`;
    }
    return typed?.response?.data?.error
        || typed?.response?.data?.message
        || typed?.message
        || fallback;
};
