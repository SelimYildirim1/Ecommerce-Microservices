const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/aggregator/admin";

async function fetchApi<T>(endpoint: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${endpoint}`, {
    headers: { "Content-Type": "application/json", ...options?.headers },
    ...options,
  });
  if (!res.ok) {
    const error = await res.text().catch(() => "Bilinmeyen hata");
    throw new Error(error || `HTTP ${res.status}`);
  }
  return res.json();
}

// Dashboard
export const getDashboardSummary = () => fetchApi<DashboardSummary>("/dashboard");

// Orders
export const getOrders = () => fetchApi<Order[]>("/orders");
export const getOrderDetail = (id: string) => fetchApi<Order>(`/orders/${id}`);
export const updateOrderStatus = (id: string, status: string) =>
  fetchApi(`/orders/${id}/status`, { method: "PUT", body: JSON.stringify({ status }) });

// Products
export const getProducts = () => fetchApi<Product[]>("/products");
export const getProduct = (id: string) => fetchApi<Product>(`/products/${id}`);

// Categories
export const getCategories = () => fetchApi<CategoryTree[]>("/categories");
export const getCategory = (id: string) => fetchApi<CategoryDetail>(`/categories/${id}`);

// Attributes
export const getAttributes = () => fetchApi<ProductAttribute[]>("/attributes");

// Brands
export const getBrands = () => fetchApi<Brand[]>("/brands");

// Catalog API direct (for mutations)
const CATALOG_API = process.env.NEXT_PUBLIC_CATALOG_URL || "http://localhost:8000/catalog";

export const createProduct = (data: CreateProductPayload) =>
  fetchApi<{ id: string }>("/products", {
    method: "POST",
    body: JSON.stringify(data),
  });

// Types
export interface DashboardSummary {
  totalSales: number;
  activeOrders: number;
  totalProducts: number;
  newUsers: number;
  dailySales: DailySales[];
  recentOrders: DashboardOrder[];
  lowStockProducts: LowStockProduct[];
}

export interface DailySales {
  date: string;
  totalSales: number;
  orderCount: number;
}

export interface DashboardOrder {
  id: string;
  buyerId: string;
  userEmail: string;
  totalAmount: number;
  orderStatus: string;
  orderDate: string;
}

export interface LowStockProduct {
  productId: string;
  productName: string;
  variants: { variantId: string; sku: string; stockQuantity: number }[];
}

export interface Order {
  id: string;
  buyerId: string;
  totalAmount: number;
  orderStatus: string;
  orderDate: string;
  description?: string;
  orderItems: OrderItem[];
}

export interface OrderItem {
  productId: number;
  productName: string;
  pictureUrl?: string;
  unitPrice: number;
  units: number;
  selectedAttributes?: string;
}

export interface Product {
  id: string;
  name: string;
  description: string;
  categoryName: string;
  brandName: string;
  primaryImageUrl?: string;
  isActive: boolean;
  variants: Variant[];
}

export interface Variant {
  id: string;
  sku: string;
  price: number;
  stockQuantity: number;
  specifics?: Record<string, string>;
  isActive: boolean;
}

export interface CategoryTree {
  id: string;
  name: string;
  parentId?: string;
  attributeCount: number;
  children: CategoryTree[];
}

export interface CategoryDetail {
  id: string;
  name: string;
  parentId?: string;
  attributes: CategoryAttribute[];
}

export interface CategoryAttribute {
  id: string;
  attributeId: string;
  attributeName: string;
  attributeCode: string;
  dataType: string;
  options?: string;
  isRequired: boolean;
  isVariant: boolean;
  isFilterable: boolean;
  sortOrder: number;
}

export interface ProductAttribute {
  id: string;
  name: string;
  code: string;
  dataType: string;
  options?: string;
  isRequired: boolean;
  isVariant: boolean;
}

export interface Brand {
  id: string;
  name: string;
  logoUrl?: string;
}

export interface CreateProductPayload {
  name: string;
  description: string;
  categoryId: string;
  brandId: string;
  primaryImageUrl?: string;
  variants: {
    sku: string;
    price: number;
    stockQuantity: number;
    specifics?: Record<string, string>;
  }[];
}
