export type OrderType = 'dine_in' | 'take_away' | 'home_delivery';
export type OrderStatus = 'pending_confirmation' | 'pending' | 'confirmed' | 'preparing' | 'ready' | 'served' | 'completed' | 'cancelled';
export type PaymentStatus = 'pending' | 'paid';
export type PaymentMethod = 'cash' | 'upi' | 'mixed';
export type TableStatus = 'available' | 'occupied' | 'reserved';

export interface Restaurant {
    id: string;
    name: string;
    tagline: string | null;
    phone: string;
    whatsapp_number: string | null;
    email: string | null;
    address: string;
    city: string;
    logo_url: string | null;
    banner_url: string | null;
    upi_id: string | null;
    qr_code_url: string | null;
    is_open: boolean;
    tax_percentage: number;
    sgst_percentage: number;
    cgst_percentage: number;
    delivery_charge: number;
    min_order_amount: number;
    avg_preparation_time: number;
    opening_time: string;
    closing_time: string;
    dietary_type?: 'veg_only' | 'non_veg_only' | 'both';
    primary_color?: string;
    secondary_color?: string;
    slug?: string;
    custom_domain?: string | null;
    whatsapp_api_url?: string | null;
    whatsapp_api_id?: string | null;
    whatsapp_token?: string | null;
    loyalty_milestone_threshold?: number;
    loyalty_milestone_reward?: string;
    loyalty_milestone_image?: string;
}

export interface MenuCategory {
    id: string;
    restaurant_id: string;
    name: string;
    description: string | null;
    image_url: string | null;
    sort_order: number;
    is_active: boolean;
}

export interface MenuItem {
    id: string;
    restaurant_id: string;
    category_id: string;
    name: string;
    description: string | null;
    price: number;
    discounted_price: number | null;
    image_url: string | null;
    is_veg: boolean;
    is_bestseller: boolean;
    is_new: boolean;
    is_spicy: boolean;
    spicy_level: number;
    is_available: boolean;
    preparation_time: number;
    serves: string | null;
    stock?: number;
    is_infinite_stock?: boolean;
    ar_model_url?: string;
    menu_categories?: {
        name: string;
    };
}

export interface CartItem extends MenuItem {
    cartId: string;
    quantity: number;
    instructions: string;
    lineTotal: number;
}

export interface RestaurantTable {
    id: string;
    restaurant_id: string;
    table_number: number;
    table_name: string;
    capacity: number;
    status: TableStatus;
    is_active: boolean;
}

export interface Customer {
    id: string;
    restaurant_id: string;
    phone: string;
    name: string;
    email: string | null;
    address: string | null;
    total_orders: number;
    total_spent: number;
    last_order_at?: string;
    created_at: string;
    wallet_balance?: number;
    loyalty_points?: number;
}

export interface Order {
    id: string;
    bill_id: string;
    restaurant_id: string;
    customer_id: string | null;
    table_id: string | null;
    order_type: OrderType;
    status: OrderStatus;
    payment_status: PaymentStatus;
    payment_method: PaymentMethod | null;
    total_amount: number;
    discount_amount: number;
    tax_amount: number;
    sgst_amount: number;
    cgst_amount: number;
    sgst_percentage?: number;
    cgst_percentage?: number;
    final_amount: number;
    subtotal: number;
    tax: number;
    total: number;
    discount: number;
    estimated_time?: number;
    notes: string | null;
    created_at: string;
    updated_at: string;
    customers?: Customer;
    order_items?: (OrderItem & { item_name?: string })[];
    restaurant_tables?: { table_number: number };
}

export interface OrderItem {
    id: string;
    order_id: string;
    menu_item_id: string;
    quantity: number;
    price: number;
    subtotal: number;
    notes: string | null;
    item_name?: string;
    total?: number;
    special_instructions?: string;
    menu_items?: MenuItem;
}

export interface Coupon {
    id: string;
    restaurant_id: string;
    code: string;
    description: string | null;
    discount_type: 'percentage' | 'fixed';
    discount_value: number;
    min_order_amount: number;
    max_discount_amount: number | null;
    valid_from: string;
    valid_until: string;
    is_active: boolean;
    created_at: string;
}
