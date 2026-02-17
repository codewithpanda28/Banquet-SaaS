
export type OrderStatus = 'pending' | 'confirmed' | 'preparing' | 'ready' | 'served' | 'completed' | 'cancelled';
export type ItemStatus = 'pending' | 'preparing' | 'ready';
export type OrderType = 'dine_in' | 'take_away' | 'home_delivery';

export interface MenuItem {
    id: string;
    name: string;
    is_veg: boolean;
    preparation_time?: number;
    is_available: boolean;
    category_id?: string;
}

export interface OrderItem {
    id: string;
    order_id?: string;
    menu_item_id: string;
    item_name: string;
    quantity: number;
    price: number;
    total: number;
    special_instructions?: string;
    status: ItemStatus;
    created_at?: string; // For NEW badge detection
    menu_item?: {
        is_veg: boolean;
    };
}

export interface Order {
    id: string;
    bill_id: string;
    restaurant_id: string;
    customer_id?: string;
    table_id?: string;
    order_type: OrderType;
    status: OrderStatus;
    payment_status: 'pending' | 'paid';
    payment_method?: 'cash' | 'upi';
    subtotal: number;
    tax: number;
    discount: number;
    delivery_charge?: number;
    total: number;
    special_instructions?: string;
    delivery_address?: string;
    estimated_time?: number;
    created_at: string;
    updated_at: string;
    items: OrderItem[];
    table_number?: string | number;
    table_name?: string;
    customer_name?: string;
    customer_phone?: string;
}

export interface RestaurantTable {
    id: string;
    table_number: number;
    table_name: string;
    capacity: number;
    status: 'available' | 'occupied';
}
