export type CourtStatus = 'ACTIVE' | 'INACTIVE' | 'MAINTENANCE';
export type BookingStatus =
    | 'CONFIRMED'
    | 'PENDING_PAYMENT'
    | 'CHECKED_IN'
    | 'COMPLETED'
    | 'CANCELLED'
    | 'NO_SHOW';
export type PaymentStatus = 'UNPAID' | 'PARTIAL' | 'PAID' | 'REFUNDED' | 'PARTIALLY_REFUNDED';
export type SlotStatus = 'AVAILABLE' | 'TAKEN' | 'BLOCKED' | 'PAST' | 'CLOSED';

export interface OperatingInterval {
    start: string;
    end: string;
}

export interface Court {
    court_id: string;
    tenant_id?: string;
    store_id?: string;
    name: string;
    football_type: 'F5' | 'F6' | 'F7' | 'F8' | 'F11';
    surface: 'SYNTHETIC' | 'CONCRETE' | 'NATURAL_GRASS' | 'OTHER';
    capacity: number;
    base_price: number;
    currency: string;
    min_slot_minutes: number;
    slot_granularity_minutes: number;
    operating_hours: Record<string, OperatingInterval[]>;
    attributes: Record<string, unknown>;
    images: string[];
    status: CourtStatus;
    created_at?: string;
    updated_at?: string;
    version?: number;
}

export interface CourtAttributeDef {
    key: string;
    label: string;
    type: 'BOOLEAN' | 'TEXT' | 'NUMBER' | 'SELECT';
    required: boolean;
    options: string[];
    active?: boolean;
    deleted_at?: string;
}

export interface CourtBlock {
    block_id: string;
    court_id: string;
    court_name?: string;
    date: string;
    start_time: string;
    end_time: string;
    type: 'MAINTENANCE' | 'WEATHER' | 'PRIVATE' | 'OTHER';
    reason?: string;
    status?: string;
    deleted_at?: string;
}

export interface Rate {
    rate_id: string;
    name: string;
    scope: 'COURT' | 'STORE';
    court_id?: string | null;
    days_of_week: number[];
    start_time: string;
    end_time: string;
    price_per_hour: number;
    priority: number;
    valid_from?: string | null;
    valid_to?: string | null;
    include_holidays: boolean;
    active: boolean;
    deleted_at?: string;
}

export interface PromotionTimeRange {
    start: string;
    end: string;
}

export interface PromotionExceptions {
    dates: string[];
    iso_weeks: string[];
    weekdays: number[];
}

export interface Promotion {
    promo_id: string;
    name: string;
    code?: string | null;
    type: 'PERCENT' | 'FIXED' | 'TWO_FOR_ONE' | 'COMBO';
    value: number;
    applies_to: 'COURT_TIME' | 'CONSUMPTION' | 'BOOKING_TOTAL';
    days_of_week: number[];
    time_ranges: PromotionTimeRange[];
    valid_from?: string | null;
    valid_to?: string | null;
    exceptions: PromotionExceptions;
    stackable: boolean;
    priority: number;
    max_uses?: number | null;
    include_holidays: boolean;
    combo?: Record<string, unknown> | null;
    images?: string[];
    active: boolean;
    deleted_at?: string;
    used_count?: number;
}

export interface Slot {
    start: string;
    end: string;
    status: SlotStatus;
    price?: number | null;
}

export interface CourtGridRow {
    court_id: string;
    name: string;
    football_type: string;
    surface: string;
    status: CourtStatus;
    slots: Slot[];
}

export interface CourtAvailability {
    date: string;
    duration_minutes: number;
    courts: CourtGridRow[];
}

export interface PriceSegment {
    rate_id?: string | null;
    rate_name?: string;
    from: string;
    to: string;
    minutes: number;
    price_per_hour: number;
    amount: number;
}

export interface PriceDiscount {
    promo_id?: string;
    name?: string;
    type?: string;
    amount: number;
}

export interface PriceBreakdown {
    segments: PriceSegment[];
    court_subtotal: number;
    discounts: PriceDiscount[];
    total: number;
    included_items: unknown[];
    promotion_ids: (string | null)[];
    currency: string;
}

export interface CourtCustomer {
    id?: string | null;
    name: string;
    phone: string;
}

export interface CourtBooking {
    booking_id: string;
    court_id: string;
    court_name?: string;
    court_image?: string | null;
    store_id?: string;
    date: string;
    start_time: string;
    end_time: string;
    duration_minutes: number;
    status: BookingStatus;
    channel: 'ADMIN' | 'PUBLIC' | 'WHATSAPP';
    customer_id?: string | null;
    customer_name: string;
    customer_phone: string;
    notes?: string;
    price_breakdown?: PriceBreakdown;
    total: number;
    amount_paid: number;
    amount_refunded: number;
    balance_due: number;
    payment_status: PaymentStatus;
    assets: CourtAssetAssignment[];
    series_id?: string | null;
    occurrence_date?: string | null;
    raffle?: unknown | null;
    raffle_done_at?: string | null;
    checked_in_at?: string | null;
    closed_at?: string | null;
    cancelled_at?: string | null;
    cancel_reason?: string | null;
    created_at?: string;
    updated_at?: string;
    version?: number;
}

export interface CourtAssetAssignment {
    asset_id: string;
    name?: string;
    quantity: number;
    returned_quantity: number;
    damaged_quantity: number;
    lost_quantity: number;
    status: 'OUT' | 'PARTIAL' | 'RETURNED';
    checked_out_at?: string;
    returned_at?: string;
}

export interface CourtPaymentMethod {
    id: string;
    name: string;
    type: 'CASH' | 'CARD' | 'TRANSFER' | 'WALLET' | 'CREDIT' | 'OTHER';
    requires_verification?: boolean;
    instructions?: string;
    number?: string;
    image_url?: string;
}

export interface CourtPayment {
    payment_id: string;
    booking_id: string;
    amount: number;
    type: 'PAYMENT' | 'REFUND';
    payment_method_id: string;
    payment_method_name: string;
    payment_method_type: string;
    reference?: string | null;
    evidence_url?: string | null;
    cash_register_id?: string | null;
    cash_registered?: boolean;
    notes?: string | null;
    created_at: string;
    created_by?: string | null;
}

export interface CourtSettings {
    public_base_url: string | null;
    effective_public_base_url: string;
    source: 'COURT_SETTINGS' | 'TENANT_BRANDING' | 'PLATFORM_DEFAULT';
    tenant_primary_domain?: string | null;
}

export interface BookingCreatePayload {
    court_id: string;
    date: string;
    start_time: string;
    duration_minutes: number;
    customer: CourtCustomer;
    channel?: 'ADMIN' | 'PUBLIC' | 'WHATSAPP';
    notes?: string;
    promo_code?: string;
    assets?: unknown[];
    idempotency_key?: string;
}

export interface BookingCreateResult {
    booking: CourtBooking;
    view_url: string;
    manage_url: string;
    portal_url?: string | null;
    idempotent?: boolean;
}

export interface SeriesCreatePayload {
    court_id: string;
    weekday: number;
    start_time: string;
    duration_minutes: number;
    customer: CourtCustomer;
    valid_from: string;
    valid_to?: string;
    exceptions?: string[];
    horizon_weeks?: number;
}

export interface CourtSeries {
    series_id: string;
    court_id: string;
    court_name?: string;
    weekday: number;
    start_time: string;
    duration_minutes: number;
    customer: CourtCustomer;
    valid_from: string;
    valid_to: string;
    exceptions: string[];
    status: string;
    generated_count?: number;
    conflict_count?: number;
}

export interface CourtAsset {
    id: string;
    nombre: string;
    precio: number;
    categoria: string;
    descripcion?: string;
    valor_reposicion?: number;
    ubicacion?: string;
    unidad_medida?: string;
    resumen_stock?: {
        operativo: number;
        danado: number;
        mantenimiento: number;
        alquilado: number;
        perdido?: number;
    };
    estado?: 'ACTIVO' | 'INACTIVO' | 'ELIMINADO';
}

export interface DayStats {
    occupancy: number;
    upcoming: number;
    inPlay: number;
    pendingPayments: number;
    freeHours: number;
}
