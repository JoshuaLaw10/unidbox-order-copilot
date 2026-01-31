/**
 * Python Backend API Integration Layer
 * 
 * This module provides functions to integrate with the Python FastAPI backend
 * for AI chatbot, product search, and order creation functionality.
 */

// Configure API base URL - defaults to local development
const API_BASE_URL = import.meta.env.VITE_PYTHON_API_URL || 'http://localhost:8000/api';

/**
 * Chat with the AI assistant
 */
export interface ChatRequest {
  message: string;
  session_id?: string;
  user_id?: string;
}

export interface ChatResponse {
  response: string;
  intent_type: string;
  products: ProductMatch[];
  order_summary: OrderSummary | null;
  needs_confirmation: boolean;
  session_id: string;
}

export interface ProductMatch {
  product_id: string;
  name: string;
  clean_name: string;
  price: number;
  original_price: number;
  brand: string;
  category: string;
  url: string;
  image_path: string;
  match_score?: number;
  match_reason?: string;
}

export interface OrderSummary {
  items: OrderItem[];
  customer_name?: string;
  delivery?: {
    address?: string;
    date?: string;
    notes?: string;
  };
  summary?: {
    subtotal: number;
    tax: number;
    shipping: number;
    total: number;
    currency: string;
  };
}

export interface OrderItem {
  product_id: string;
  name: string;
  quantity: number;
  unit_price: number;
  total_price: number;
}

/**
 * Send a chat message to the AI assistant
 */
export async function sendChatMessage(request: ChatRequest): Promise<ChatResponse> {
  const response = await fetch(`${API_BASE_URL}/chat`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(request),
  });

  if (!response.ok) {
    throw new Error(`Chat API error: ${response.statusText}`);
  }

  return response.json();
}

/**
 * Search for products
 */
export interface ProductSearchRequest {
  query: string;
  brand?: string;
  category?: string;
  max_results?: number;
}

export interface ProductSearchResponse {
  products: ProductMatch[];
  total: number;
  query_info?: {
    original_query: string;
    normalized_query: string;
    search_type: string;
  };
}

export async function searchProducts(request: ProductSearchRequest): Promise<ProductSearchResponse> {
  const response = await fetch(`${API_BASE_URL}/products/search`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      query: request.query,
      brand: request.brand,
      category: request.category,
      max_results: request.max_results || 10,
    }),
  });

  if (!response.ok) {
    throw new Error(`Product search API error: ${response.statusText}`);
  }

  return response.json();
}

/**
 * List products with optional filtering
 */
export async function listProducts(options?: {
  category?: string;
  brand?: string;
  limit?: number;
}): Promise<{ products: ProductMatch[]; total: number }> {
  const params = new URLSearchParams();
  if (options?.category) params.append('category', options.category);
  if (options?.brand) params.append('brand', options.brand);
  if (options?.limit) params.append('limit', options.limit.toString());

  const response = await fetch(`${API_BASE_URL}/products?${params.toString()}`);

  if (!response.ok) {
    throw new Error(`List products API error: ${response.statusText}`);
  }

  return response.json();
}

/**
 * Get a specific product by ID
 */
export async function getProduct(productId: string): Promise<ProductMatch> {
  const response = await fetch(`${API_BASE_URL}/products/${productId}`);

  if (!response.ok) {
    if (response.status === 404) {
      throw new Error('Product not found');
    }
    throw new Error(`Get product API error: ${response.statusText}`);
  }

  return response.json();
}

/**
 * Get available categories
 */
export async function getCategories(): Promise<{ categories: string[] }> {
  const response = await fetch(`${API_BASE_URL}/categories`);

  if (!response.ok) {
    throw new Error(`Get categories API error: ${response.statusText}`);
  }

  return response.json();
}

/**
 * Get available brands
 */
export async function getBrands(): Promise<{ brands: string[] }> {
  const response = await fetch(`${API_BASE_URL}/brands`);

  if (!response.ok) {
    throw new Error(`Get brands API error: ${response.statusText}`);
  }

  return response.json();
}

/**
 * Create an order
 */
export interface CreateOrderRequest {
  items: {
    product_id: string;
    name: string;
    quantity: number;
    unit_price: number;
    total_price: number;
  }[];
  customer_name: string;
  customer_email?: string;
  customer_phone?: string;
  delivery_address: string;
  delivery_date?: string;
  notes?: string;
}

export interface CreateOrderResponse {
  success: boolean;
  order_id: string;
  order_number: string;
  message: string;
  do_pdf_url?: string;
  summary: {
    subtotal: number;
    tax: number;
    shipping: number;
    total: number;
    currency: string;
  };
}

export async function createOrder(request: CreateOrderRequest): Promise<CreateOrderResponse> {
  const response = await fetch(`${API_BASE_URL}/orders`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(request),
  });

  if (!response.ok) {
    throw new Error(`Create order API error: ${response.statusText}`);
  }

  return response.json();
}

/**
 * Get order status
 */
export async function getOrderStatus(orderId: string): Promise<{
  order_id: string;
  status: string;
  created_at: string;
  updated_at: string;
  items: OrderItem[];
  summary: OrderSummary['summary'];
}> {
  const response = await fetch(`${API_BASE_URL}/orders/${orderId}`);

  if (!response.ok) {
    if (response.status === 404) {
      throw new Error('Order not found');
    }
    throw new Error(`Get order status API error: ${response.statusText}`);
  }

  return response.json();
}

/**
 * Download Delivery Order PDF
 */
export async function downloadDeliveryOrderPDF(orderId: string): Promise<Blob> {
  const response = await fetch(`${API_BASE_URL}/orders/${orderId}/do`);

  if (!response.ok) {
    throw new Error(`Download DO API error: ${response.statusText}`);
  }

  return response.blob();
}

/**
 * Health check
 */
export async function healthCheck(): Promise<{ status: string; service: string }> {
  const response = await fetch(`${API_BASE_URL}/health`);

  if (!response.ok) {
    throw new Error(`Health check API error: ${response.statusText}`);
  }

  return response.json();
}
