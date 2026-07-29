import { clearToken, getToken } from "@/lib/auth";

const API_BASE =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:8001/aggregator/admin";

async function fetchApi<T>(endpoint: string, options?: RequestInit): Promise<T> {
  const token = getToken();

  const res = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options?.headers,
    },
  });

  if (res.status === 401 || res.status === 403) {
    clearToken();
    if (typeof window !== "undefined") window.location.href = "/login";
    throw new Error("Oturum süresi doldu, lütfen tekrar giriş yapın.");
  }

  if (!res.ok) {
    const error = await res.text().catch(() => "Bilinmeyen hata");
    throw new Error(error || `HTTP ${res.status}`);
  }

  if (res.status === 204) return undefined as T;

  return res.json();
}

// --- Medya (Catalog.API statik dosya sunumu) ---
const MEDIA_API = process.env.NEXT_PUBLIC_MEDIA_URL || "http://localhost:8001/media";

/** Gorsel URL'i goreli ise (/uploads/...) sunucu adresiyle tamamlar. */
export function resolveImageUrl(url?: string | null): string {
  if (!url) return "";
  if (/^(https?:)?\/\//.test(url) || url.startsWith("data:")) return url;
  return `${MEDIA_API.replace(/\/media$/, "")}${url}`;
}

export async function uploadImage(file: File): Promise<UploadResult> {
  const token = getToken();
  const formData = new FormData();
  formData.append("file", file);

  const res = await fetch(`${MEDIA_API}/upload`, {
    method: "POST",
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
    body: formData,
  });

  if (res.status === 401 || res.status === 403) {
    clearToken();
    if (typeof window !== "undefined") window.location.href = "/login";
    throw new Error("Oturum süresi doldu, lütfen tekrar giriş yapın.");
  }

  if (!res.ok) {
    const error = await res.text().catch(() => "");
    throw new Error(error || "Görsel yüklenemedi.");
  }

  return res.json();
}

export interface UploadResult {
  url: string;
  originalName: string;
  size: number;
}

// Dashboard
export const getDashboardSummary = () => fetchApi<DashboardSummary>("/dashboard");

// Orders
export const getOrders = () => fetchApi<Order[]>("/orders");
export const getOrderDetail = (id: string) => fetchApi<Order>(`/orders/${id}`);
export const updateOrderStatus = (id: string, status: string) =>
  fetchApi(`/orders/${id}/status`, { method: "PUT", body: JSON.stringify({ status }) });

export const cancelOrder = (id: string, reason?: string) =>
  fetchApi<{ id: string; orderStatus: string }>(`/orders/${id}/cancel`, {
    method: "POST",
    body: JSON.stringify({ reason: reason ?? null }),
  });

// Returns
export const getReturns = (status?: ReturnStatus) =>
  fetchApi<ReturnRequest[]>(`/returns${status ? `?status=${status}` : ""}`);

export const getReturn = (id: string) => fetchApi<ReturnRequest>(`/returns/${id}`);

export const approveReturn = (id: string, data: ResolveReturnPayload) =>
  fetchApi<ReturnRequest>(`/returns/${id}/approve`, {
    method: "PUT",
    body: JSON.stringify(data),
  });

export const rejectReturn = (id: string, data: ResolveReturnPayload) =>
  fetchApi<ReturnRequest>(`/returns/${id}/reject`, {
    method: "PUT",
    body: JSON.stringify(data),
  });

export const refundReturn = (id: string, data: ResolveReturnPayload) =>
  fetchApi<ReturnRequest>(`/returns/${id}/refund`, {
    method: "PUT",
    body: JSON.stringify(data),
  });

// Customers
export const getCustomers = (search?: string) =>
  fetchApi<Customer[]>(`/customers${search ? `?search=${encodeURIComponent(search)}` : ""}`);

export const getCustomer = (id: string) => fetchApi<CustomerDetail>(`/customers/${id}`);

export const setCustomerBlocked = (id: string, blocked: boolean) =>
  fetchApi<{ userId: string; blocked: boolean }>(`/customers/${id}/block`, {
    method: "PUT",
    body: JSON.stringify({ blocked }),
  });

// Products
export const getProducts = () => fetchApi<Product[]>("/products");
export const getProduct = (id: string) => fetchApi<Product>(`/products/${id}`);

export const createProduct = (data: CreateProductPayload) =>
  fetchApi<{ id: string }>("/products", {
    method: "POST",
    body: JSON.stringify(data),
  });

export const updateProduct = (id: string, data: UpdateProductPayload) =>
  fetchApi<{ id: string }>(`/products/${id}`, {
    method: "PUT",
    body: JSON.stringify({ ...data, id }),
  });

export const deleteProduct = (id: string) =>
  fetchApi<void>(`/products/${id}`, { method: "DELETE" });

export const setProductStatus = (id: string, isActive: boolean) =>
  fetchApi<{ id: string }>(`/products/${id}/status`, {
    method: "PUT",
    body: JSON.stringify({ isActive }),
  });

export const updateVariant = (
  productId: string,
  variantId: string,
  data: { price?: number; stockQuantity?: number; isActive?: boolean }
) =>
  fetchApi<{ id: string }>(`/products/${productId}/variants/${variantId}`, {
    method: "PUT",
    body: JSON.stringify(data),
  });

// Categories
export const getCategories = () => fetchApi<CategoryTree[]>("/categories");
export const getCategory = (id: string) => fetchApi<CategoryDetail>(`/categories/${id}`);

export const createCategory = (data: CategoryPayload) =>
  fetchApi<{ id: string }>("/categories", {
    method: "POST",
    body: JSON.stringify(data),
  });

export const updateCategory = (id: string, data: CategoryPayload) =>
  fetchApi<{ id: string }>(`/categories/${id}`, {
    method: "PUT",
    body: JSON.stringify(data),
  });

export const deleteCategory = (id: string) =>
  fetchApi<void>(`/categories/${id}`, { method: "DELETE" });

export const assignCategoryAttribute = (
  categoryId: string,
  data: AssignAttributePayload
) =>
  fetchApi<{ id: string }>(`/categories/${categoryId}/attributes`, {
    method: "POST",
    body: JSON.stringify(data),
  });

export const removeCategoryAttribute = (categoryId: string, attributeId: string) =>
  fetchApi<void>(`/categories/${categoryId}/attributes/${attributeId}`, {
    method: "DELETE",
  });

// Attributes
export const getAttributes = () => fetchApi<ProductAttribute[]>("/attributes");

export const createAttribute = (data: AttributePayload) =>
  fetchApi<{ id: string }>("/attributes", {
    method: "POST",
    body: JSON.stringify(data),
  });

export const updateAttribute = (id: string, data: AttributePayload) =>
  fetchApi<{ id: string }>(`/attributes/${id}`, {
    method: "PUT",
    body: JSON.stringify(data),
  });

export const deleteAttribute = (id: string) =>
  fetchApi<void>(`/attributes/${id}`, { method: "DELETE" });

// Brands
export const getBrands = () => fetchApi<Brand[]>("/brands");

export const createBrand = (data: BrandPayload) =>
  fetchApi<{ id: string }>("/brands", {
    method: "POST",
    body: JSON.stringify(data),
  });

export const updateBrand = (id: string, data: BrandPayload) =>
  fetchApi<{ id: string }>(`/brands/${id}`, {
    method: "PUT",
    body: JSON.stringify(data),
  });

export const deleteBrand = (id: string) =>
  fetchApi<void>(`/brands/${id}`, { method: "DELETE" });

// --- Promosyon ve kargo servisleri gateway'de ayri prefix'lerde ---
const GATEWAY_BASE = API_BASE.replace(/\/aggregator\/admin\/?$/, "");
const PROMOTION_API =
  process.env.NEXT_PUBLIC_PROMOTION_URL || `${GATEWAY_BASE}/promotions/admin`;
const SHIPPING_API =
  process.env.NEXT_PUBLIC_SHIPPING_URL || `${GATEWAY_BASE}/shipping/admin`;
const CATALOG_ADMIN_API =
  process.env.NEXT_PUBLIC_CATALOG_ADMIN_URL || `${GATEWAY_BASE}/catalog/admin`;

async function fetchAt<T>(base: string, endpoint: string, options?: RequestInit): Promise<T> {
  const token = getToken();

  const res = await fetch(`${base}${endpoint}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options?.headers,
    },
  });

  if (res.status === 401 || res.status === 403) {
    clearToken();
    if (typeof window !== "undefined") window.location.href = "/login";
    throw new Error("Oturum süresi doldu, lütfen tekrar giriş yapın.");
  }

  if (!res.ok) {
    const error = await res.text().catch(() => "Bilinmeyen hata");
    throw new Error(error || `HTTP ${res.status}`);
  }

  if (res.status === 204) return undefined as T;

  return res.json();
}

// Coupons
export const getCoupons = () => fetchAt<Coupon[]>(PROMOTION_API, "/coupons");

export const createCoupon = (data: CouponPayload) =>
  fetchAt<{ id: string }>(PROMOTION_API, "/coupons", {
    method: "POST",
    body: JSON.stringify(data),
  });

export const updateCoupon = (id: string, data: CouponPayload) =>
  fetchAt<void>(PROMOTION_API, `/coupons/${id}`, {
    method: "PUT",
    body: JSON.stringify(data),
  });

export const deleteCoupon = (id: string) =>
  fetchAt<void>(PROMOTION_API, `/coupons/${id}`, { method: "DELETE" });

// Campaigns
export const getCampaigns = () => fetchAt<Campaign[]>(PROMOTION_API, "/campaigns");

export const createCampaign = (data: CampaignPayload) =>
  fetchAt<{ id: string }>(PROMOTION_API, "/campaigns", {
    method: "POST",
    body: JSON.stringify(data),
  });

export const updateCampaign = (id: string, data: CampaignPayload) =>
  fetchAt<void>(PROMOTION_API, `/campaigns/${id}`, {
    method: "PUT",
    body: JSON.stringify(data),
  });

export const deleteCampaign = (id: string) =>
  fetchAt<void>(PROMOTION_API, `/campaigns/${id}`, { method: "DELETE" });

// Shipping carriers
export const getCarriers = () => fetchAt<Carrier[]>(SHIPPING_API, "/carriers");

export const createCarrier = (data: CarrierPayload) =>
  fetchAt<{ id: string }>(SHIPPING_API, "/carriers", {
    method: "POST",
    body: JSON.stringify(data),
  });

export const updateCarrier = (id: string, data: CarrierPayload) =>
  fetchAt<void>(SHIPPING_API, `/carriers/${id}`, {
    method: "PUT",
    body: JSON.stringify(data),
  });

export const deleteCarrier = (id: string) =>
  fetchAt<void>(SHIPPING_API, `/carriers/${id}`, { method: "DELETE" });

export const createRate = (carrierId: string, data: RatePayload) =>
  fetchAt<{ id: string }>(SHIPPING_API, `/carriers/${carrierId}/rates`, {
    method: "POST",
    body: JSON.stringify(data),
  });

export const updateRate = (id: string, data: RatePayload) =>
  fetchAt<void>(SHIPPING_API, `/rates/${id}`, {
    method: "PUT",
    body: JSON.stringify(data),
  });

export const deleteRate = (id: string) =>
  fetchAt<void>(SHIPPING_API, `/rates/${id}`, { method: "DELETE" });

export const getShippingSettings = () =>
  fetchAt<ShippingSettings>(SHIPPING_API, "/settings");

export const updateShippingSettings = (data: ShippingSettings) =>
  fetchAt<void>(SHIPPING_API, "/settings", {
    method: "PUT",
    body: JSON.stringify(data),
  });

// Shipments
export const getShipments = (status?: string) =>
  fetchAt<Shipment[]>(SHIPPING_API, `/shipments${status ? `?status=${status}` : ""}`);

export const dispatchShipment = (id: string) =>
  fetchAt<Shipment>(SHIPPING_API, `/shipments/${id}/dispatch`, { method: "POST" });

export const updateShipment = (
  id: string,
  data: { status: ShipmentStatus; trackingNumber?: string }
) =>
  fetchAt<Shipment>(SHIPPING_API, `/shipments/${id}`, {
    method: "PUT",
    body: JSON.stringify(data),
  });

// Reviews (Catalog.API moderasyon uclari)
export const getReviews = (approved?: boolean) =>
  fetchAt<AdminReview[]>(
    CATALOG_ADMIN_API,
    `/reviews${approved === undefined ? "" : `?approved=${approved}`}`
  );

export const moderateReview = (
  id: string,
  data: { isApproved: boolean; moderatorNote?: string }
) =>
  fetchAt<void>(CATALOG_ADMIN_API, `/reviews/${id}/moderate`, {
    method: "PUT",
    body: JSON.stringify(data),
  });

export const deleteReview = (id: string) =>
  fetchAt<void>(CATALOG_ADMIN_API, `/reviews/${id}`, { method: "DELETE" });

// --- Stok (Catalog.API) ---
export const getStockSummary = (lowStockOnly = false) =>
  fetchAt<StockSummary>(CATALOG_ADMIN_API, `/stock/summary?lowStockOnly=${lowStockOnly}`);

export const getStockMovements = (params?: {
  productId?: string;
  variantId?: string;
  type?: StockMovementType;
  take?: number;
}) => {
  const query = new URLSearchParams();
  if (params?.productId) query.set("productId", params.productId);
  if (params?.variantId) query.set("variantId", params.variantId);
  if (params?.type) query.set("type", params.type);
  if (params?.take) query.set("take", String(params.take));

  const suffix = query.toString();
  return fetchAt<StockMovement[]>(
    CATALOG_ADMIN_API,
    `/stock/movements${suffix ? `?${suffix}` : ""}`
  );
};

export const adjustStock = (data: StockAdjustPayload) =>
  fetchAt<StockMovement>(CATALOG_ADMIN_API, "/stock/adjust", {
    method: "POST",
    body: JSON.stringify(data),
  });

// --- Ayarlar (Catalog.API) ---
export const getSettings = (group?: string) =>
  fetchAt<SiteSetting[]>(CATALOG_ADMIN_API, `/settings${group ? `?group=${group}` : ""}`);

export const saveSettings = (values: Record<string, string | null>) =>
  fetchAt<SiteSetting[]>(CATALOG_ADMIN_API, "/settings", {
    method: "PUT",
    body: JSON.stringify({ values }),
  });

// --- İçerik yönetimi (Catalog.API) ---
export const getBanners = () => fetchAt<Banner[]>(CATALOG_ADMIN_API, "/cms/banners");

export const createBanner = (data: BannerPayload) =>
  fetchAt<Banner>(CATALOG_ADMIN_API, "/cms/banners", {
    method: "POST",
    body: JSON.stringify(data),
  });

export const updateBanner = (id: string, data: BannerPayload) =>
  fetchAt<Banner>(CATALOG_ADMIN_API, `/cms/banners/${id}`, {
    method: "PUT",
    body: JSON.stringify(data),
  });

export const deleteBanner = (id: string) =>
  fetchAt<void>(CATALOG_ADMIN_API, `/cms/banners/${id}`, { method: "DELETE" });

export const getStaticPages = () => fetchAt<StaticPage[]>(CATALOG_ADMIN_API, "/cms/pages");

export const createStaticPage = (data: StaticPagePayload) =>
  fetchAt<StaticPage>(CATALOG_ADMIN_API, "/cms/pages", {
    method: "POST",
    body: JSON.stringify(data),
  });

export const updateStaticPage = (id: string, data: StaticPagePayload) =>
  fetchAt<StaticPage>(CATALOG_ADMIN_API, `/cms/pages/${id}`, {
    method: "PUT",
    body: JSON.stringify(data),
  });

export const deleteStaticPage = (id: string) =>
  fetchAt<void>(CATALOG_ADMIN_API, `/cms/pages/${id}`, { method: "DELETE" });

// --- Raporlar ve bildirimler (Shopping.Aggregator) ---
export const getSalesReport = (days = 30) =>
  fetchApi<SalesReport>(`/reports/sales?days=${days}`);

export const getProductReport = (days = 30) =>
  fetchApi<ProductReport>(`/reports/products?days=${days}`);

export const getCustomerReport = (days = 30) =>
  fetchApi<CustomerReport>(`/reports/customers?days=${days}`);

export const getStockReport = (lowStockOnly = false) =>
  fetchApi<StockSummary>(`/reports/stock?lowStockOnly=${lowStockOnly}`);

export const getReturnReport = (days = 90) =>
  fetchApi<ReturnReport>(`/reports/returns?days=${days}`);

export const getNotifications = () => fetchApi<NotificationFeed>("/notifications");

export interface AdminReview {
  id: string;
  productId: string;
  productName: string;
  userId: string;
  userName: string;
  rating: number;
  title: string | null;
  comment: string | null;
  isApproved: boolean;
  moderatorNote: string | null;
  createdAt: string;
}

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
  firstName?: string;
  lastName?: string;
  emailAddress?: string;
  addressLine?: string;
  city?: string;
  discountAmount?: number;
  couponCode?: string;
  shippingCost?: number;
  orderItems: OrderItem[];
}

export interface OrderItem {
  id?: string;
  productId: string;
  productName: string;
  pictureUrl?: string;
  unitPrice: number;
  units: number;
  selectedAttributes?: string;
}

// --- İade ---

export type ReturnStatus =
  | "Pending"
  | "Approved"
  | "Rejected"
  | "Refunded"
  | "Cancelled";

export const RETURN_STATUS_LABELS: Record<ReturnStatus, string> = {
  Pending: "Onay bekliyor",
  Approved: "Onaylandı",
  Rejected: "Reddedildi",
  Refunded: "İadesi yapıldı",
  Cancelled: "İptal edildi",
};

export interface ReturnItem {
  id: string;
  orderItemId: string;
  productId: string;
  productName: string;
  unitPrice: number;
  units: number;
}

export interface ReturnRequest {
  id: string;
  orderId: string;
  buyerId: string;
  requestNumber: string;
  reason: string;
  reasonName: string;
  reasonDetail?: string;
  status: ReturnStatus;
  statusName: string;
  refundAmount: number;
  adminNote?: string;
  requestedAt: string;
  resolvedAt?: string;
  refundedAt?: string;
  items: ReturnItem[];
}

export interface ResolveReturnPayload {
  adminNote?: string | null;
  refundAmount?: number | null;
}

// --- Müşteri ---

export interface Customer {
  id: string;
  userName: string;
  email: string;
  firstName?: string;
  lastName?: string;
  phoneNumber?: string;
  createdAt: string;
  isBlocked: boolean;
  roles: string[];
  addressCount: number;
}

export interface CustomerAddress {
  id: number;
  addressTitle: string;
  recipientName: string;
  street: string;
  city: string;
  district: string;
  zipCode: string;
  country: string;
  phoneNumber: string;
  isDefault: boolean;
}

export interface CustomerDetail extends Customer {
  emailConfirmed: boolean;
  lockoutEnd?: string;
  addresses: CustomerAddress[];
}

export interface Product {
  id: string;
  name: string;
  description: string;
  categoryName: string;
  brandName: string;
  categoryId?: string;
  brandId?: string;
  primaryImageUrl?: string;
  isActive: boolean;
  slug?: string;
  metaTitle?: string;
  metaDescription?: string;
  variants: Variant[];
  images?: ProductImage[];
}

export interface ProductImage {
  id: string;
  url: string;
  isPrimary: boolean;
  sortOrder: number;
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

export interface ProductImagePayload {
  url: string;
  isPrimary: boolean;
  sortOrder: number;
}

export interface CreateProductPayload {
  name: string;
  description: string;
  categoryId: string;
  brandId: string;
  primaryImageUrl?: string;
  slug?: string;
  metaTitle?: string;
  metaDescription?: string;
  images?: ProductImagePayload[];
  variants: {
    sku: string;
    price: number;
    stockQuantity: number;
    specifics?: Record<string, string>;
  }[];
}

export interface UpdateProductPayload {
  name: string;
  description: string;
  categoryId: string;
  brandId: string;
  primaryImageUrl?: string;
  isActive: boolean;
  slug?: string;
  metaTitle?: string;
  metaDescription?: string;
  images?: ProductImagePayload[];
  variants: {
    id?: string;
    sku: string;
    price: number;
    stockQuantity: number;
    specifics?: Record<string, string>;
    isActive: boolean;
  }[];
}

export interface CategoryPayload {
  name: string;
  parentId?: string | null;
}

export interface AssignAttributePayload {
  attributeId: string;
  sortOrder: number;
  isFilterable: boolean;
}

export interface AttributePayload {
  name: string;
  code: string;
  dataType: string;
  options?: string | null;
  isRequired: boolean;
  isVariant: boolean;
}

export interface BrandPayload {
  name: string;
  logoUrl?: string | null;
}

// --- Promosyon ---

export type DiscountType = "Percentage" | "FixedAmount" | "FreeShipping";

export const DISCOUNT_TYPE_LABELS: Record<DiscountType, string> = {
  Percentage: "Yüzde indirim",
  FixedAmount: "Tutar indirimi",
  FreeShipping: "Ücretsiz kargo",
};

export interface Coupon {
  id: string;
  code: string;
  description?: string;
  discountType: DiscountType;
  value: number;
  minBasketAmount: number;
  maxDiscountAmount: number;
  usageLimit: number;
  perUserLimit: number;
  usedCount: number;
  validFrom: string;
  validTo: string;
  isActive: boolean;
  categoryIds?: string;
  productIds?: string;
}

export interface CouponPayload {
  code: string;
  description?: string | null;
  discountType: DiscountType;
  value: number;
  minBasketAmount: number;
  maxDiscountAmount: number;
  usageLimit: number;
  perUserLimit: number;
  validFrom: string;
  validTo: string;
  isActive: boolean;
  categoryIds?: string | null;
  productIds?: string | null;
}

export interface Campaign {
  id: string;
  name: string;
  description?: string;
  discountType: DiscountType;
  value: number;
  minBasketAmount: number;
  maxDiscountAmount: number;
  validFrom: string;
  validTo: string;
  isActive: boolean;
  categoryIds?: string;
  productIds?: string;
  priority: number;
}

export interface CampaignPayload {
  name: string;
  description?: string | null;
  discountType: DiscountType;
  value: number;
  minBasketAmount: number;
  maxDiscountAmount: number;
  validFrom: string;
  validTo: string;
  isActive: boolean;
  categoryIds?: string | null;
  productIds?: string | null;
  priority: number;
}

// --- Kargo ---

export interface ShippingRate {
  id: string;
  carrierId: string;
  minDesi: number;
  maxDesi: number;
  minBasketAmount: number;
  maxBasketAmount: number;
  price: number;
  isActive: boolean;
}

export interface Carrier {
  id: string;
  name: string;
  code: string;
  logoUrl?: string;
  trackingUrlTemplate?: string;
  estimatedDays: number;
  isActive: boolean;
  rates: ShippingRate[];
}

export interface CarrierPayload {
  name: string;
  code: string;
  logoUrl?: string | null;
  trackingUrlTemplate?: string | null;
  estimatedDays: number;
  isActive: boolean;
}

export interface RatePayload {
  minDesi: number;
  maxDesi: number;
  minBasketAmount: number;
  maxBasketAmount: number;
  price: number;
  isActive: boolean;
}

export interface ShippingSettings {
  freeShippingThreshold: number;
  defaultPrice: number;
  defaultDesiPerItem: number;
}

export type ShipmentStatus =
  | "Pending"
  | "Preparing"
  | "Shipped"
  | "InTransit"
  | "Delivered"
  | "Returned"
  | "Cancelled";

export const SHIPMENT_STATUS_LABELS: Record<ShipmentStatus, string> = {
  Pending: "Bekliyor",
  Preparing: "Hazırlanıyor",
  Shipped: "Kargoya verildi",
  InTransit: "Yolda",
  Delivered: "Teslim edildi",
  Returned: "İade edildi",
  Cancelled: "İptal edildi",
};

export interface Shipment {
  id: string;
  orderId: string;
  userName?: string;
  carrierId?: string;
  carrierName?: string;
  trackingNumber?: string;
  trackingUrl?: string;
  status: ShipmentStatus;
  statusName: string;
  shippingCost: number;
  recipientName?: string;
  addressLine?: string;
  city?: string;
  createdAt: string;
  shippedAt?: string;
  deliveredAt?: string;
}

// --- Stok ---

export type StockMovementType = "In" | "Out" | "Sale" | "Return" | "Adjustment";

export const STOCK_MOVEMENT_LABELS: Record<StockMovementType, string> = {
  In: "Giriş",
  Out: "Çıkış",
  Sale: "Satış",
  Return: "İade",
  Adjustment: "Düzeltme",
};

export interface StockMovement {
  id: string;
  productId: string;
  productName: string;
  variantId: string;
  sku: string;
  type: StockMovementType;
  typeName: string;
  quantity: number;
  previousStock: number;
  newStock: number;
  reference?: string;
  note?: string;
  createdBy: string;
  createdAt: string;
}

export interface StockLine {
  productId: string;
  productName: string;
  variantId: string;
  sku: string;
  price: number;
  stockQuantity: number;
  isActive: boolean;
}

export interface StockSummary {
  totalVariants: number;
  outOfStockCount: number;
  lowStockCount: number;
  totalUnits: number;
  stockValue: number;
  lines: StockLine[];
}

export interface StockAdjustPayload {
  variantId: string;
  quantity: number;
  type: StockMovementType;
  note?: string | null;
  reference?: string | null;
}

// --- Ayarlar ---

export interface SiteSetting {
  key: string;
  value: string | null;
  group: string;
  description?: string;
}

export const SETTING_GROUP_LABELS: Record<string, string> = {
  general: "Site bilgileri",
  commerce: "Ticaret",
  shipping: "Kargo",
  email: "E-posta",
  social: "Sosyal medya",
};

// --- İçerik yönetimi ---

export interface Banner {
  id: string;
  title: string;
  subtitle?: string;
  imageUrl: string;
  linkUrl?: string;
  placement: string;
  sortOrder: number;
  isActive: boolean;
  startsAt?: string;
  endsAt?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface BannerPayload {
  title: string;
  subtitle?: string | null;
  imageUrl: string;
  linkUrl?: string | null;
  placement?: string | null;
  sortOrder: number;
  isActive: boolean;
  startsAt?: string | null;
  endsAt?: string | null;
}

export interface StaticPage {
  id: string;
  slug: string;
  title: string;
  content?: string;
  metaTitle?: string;
  metaDescription?: string;
  isPublished: boolean;
  showInFooter: boolean;
  sortOrder: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface StaticPagePayload {
  slug: string;
  title: string;
  content?: string | null;
  metaTitle?: string | null;
  metaDescription?: string | null;
  isPublished: boolean;
  showInFooter: boolean;
  sortOrder: number;
}

// --- Raporlar ---

export interface SalesReport {
  days: number;
  totalRevenue: number;
  totalOrders: number;
  paidOrders: number;
  averageOrderValue: number;
  totalDiscount: number;
  totalShipping: number;
  daily: { date: string; revenue: number; orderCount: number }[];
  byStatus: { status: string; count: number; total: number }[];
}

export interface ProductReport {
  days: number;
  totalUnitsSold: number;
  distinctProductsSold: number;
  bestSellers: {
    productId: string;
    productName: string;
    unitsSold: number;
    revenue: number;
    orderCount: number;
  }[];
  neverSold: {
    productId: string;
    productName: string;
    categoryName: string;
    stock: number;
  }[];
}

export interface CustomerReport {
  days: number;
  totalCustomers: number;
  newCustomers: number;
  blockedCustomers: number;
  purchasingCustomers: number;
  topCustomers: {
    buyerId: string;
    userName: string;
    email: string;
    orderCount: number;
    totalSpent: number;
    lastOrderDate: string;
  }[];
  newUsers: {
    id: string;
    userName: string;
    email: string;
    createdAt: string;
    isBlocked: boolean;
  }[];
}

export interface ReturnReport {
  days: number;
  totalRequests: number;
  pendingRequests: number;
  totalRefunded: number;
  byStatus?: { status: string; count: number }[];
  byReason?: { reason: string; count: number }[];
}

// --- Bildirim merkezi ---

export type NotificationSeverity = "info" | "warning" | "danger";

export interface NotificationItem {
  type: string;
  title: string;
  href: string;
  count: number;
  severity: NotificationSeverity;
}

export interface NotificationFeed {
  total: number;
  newOrders: number;
  pendingReturns: number;
  pendingReviews: number;
  lowStock: number;
  outOfStock: number;
  items: NotificationItem[];
}
