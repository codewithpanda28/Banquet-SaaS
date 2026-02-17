export type OrderType = 'dine_in' | 'take_away' | 'home_delivery';
export type OrderStatus = 'pending' | 'confirmed' | 'preparing' | 'ready' | 'served' | 'completed' | 'cancelled';
export type PaymentStatus = 'pending' | 'paid';
export type PaymentMethod = 'cash' | 'upi';
export type TableStatus = 'available' | 'occupied';

export interface Restaurant {
    id: string;
    name: string;
    tagline: string | null;
    phone: string;
    whatsapp_number: string | null;
    address: string;
    city: string;
    logo_url: string | null;
    banner_url: string | null;
    upi_id: string | null;
    upi_qr_url: string | null;
    is_open: boolean;
    tax_percentage: number;
    delivery_charge: number;
    min_order_amount: number;
    avg_preparation_time: number;
    opening_time: string;
    closing_time: string;
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
    ar_model_url?: string | null; // Optional AR GLB/GLTF model URL
    ar_enabled?: boolean; // Toggle for AR button
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
    menu_categories?: {
        name: string;
    };
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
    payment_method: PaymentMethod;
    subtotal: number;
    tax: number;
    discount: number;
    delivery_charge: number;
    total: number;
    special_instructions: string | null;
    delivery_address: string | null;
    estimated_time: number;
    created_at: string;
    updated_at: string;
    order_items?: OrderItem[];
    restaurant_tables?: {
        table_number: number;
    };
}

export interface OrderItem {
    id: string;
    order_id: string;
    menu_item_id: string;
    item_name: string;
    quantity: number;
    price: number;
    total: number;
    special_instructions: string | null;
    status: 'pending' | 'preparing' | 'ready';
}

export interface CartItem extends MenuItem {
    cartId: string; // Unique ID for cart item (to handle separate instructions/options)
    quantity: number;
    instructions: string;
    lineTotal: number;
}
