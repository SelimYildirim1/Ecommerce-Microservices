import { clearToken, ensureFreshToken, getToken, refreshToken } from "@/lib/auth";

const API_BASE =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:8001/aggregator/admin";

const AUTH_API =
  process.env.NEXT_PUBLIC_AUTH_URL || "http://localhost:8001/auth";

async function handleUnauthorized(): Promise<string | null> {
  const refreshed = await refreshToken();
  if (refreshed) return refreshed;
  clearToken();
  if (typeof window !== "undefined") window.location.href = "/admin/login";
  return null;
}

async function fetchApi<T>(endpoint: string, options?: RequestInit): Promise<T> {
  let token = await ensureFreshToken();

  const doFetch = (bearer: string | null) =>
    fetch(`${API_BASE}${endpoint}`, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        ...(bearer ? { Authorization: `Bearer ${bearer}` } : {}),
        ...options?.headers,
      },
    });

  let res = await doFetch(token);

  if (res.status === 401) {
    const refreshed = await handleUnauthorized();
    if (!refreshed) {
      throw new Error("Oturum süresi doldu, lütfen tekrar giriş yapın.");
    }
    res = await doFetch(refreshed);
  }

  if (res.status === 403) {
    clearToken();
    if (typeof window !== "undefined") window.location.href = "/admin/login";
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

/** Gorsel URL'i goreli ise (/uploads/..., /img/...) gateway kokune tamamlar. */
export function resolveImageUrl(url?: string | null): string {
  if (!url) return "";
  const trimmed = url.trim();
  if (!trimmed) return "";
  if (/^(https?:)?\/\//.test(trimmed) || trimmed.startsWith("data:")) return trimmed;
  const gatewayOrigin = MEDIA_API.replace(/\/media\/?$/, "");
  return trimmed.startsWith("/")
    ? `${gatewayOrigin}${trimmed}`
    : `${gatewayOrigin}/${trimmed}`;
}

export async function uploadImage(file: File): Promise<UploadResult> {
  const token = await ensureFreshToken();
  const formData = new FormData();
  formData.append("file", file);

  const doUpload = (bearer: string | null) =>
    fetch(`${MEDIA_API}/upload`, {
      method: "POST",
      headers: bearer ? { Authorization: `Bearer ${bearer}` } : undefined,
      body: formData,
    });

  let res = await doUpload(token);

  if (res.status === 401) {
    const refreshed = await handleUnauthorized();
    if (!refreshed) throw new Error("Oturum süresi doldu, lütfen tekrar giriş yapın.");
    res = await doUpload(refreshed);
  }

  if (res.status === 403) {
    clearToken();
    if (typeof window !== "undefined") window.location.href = "/admin/login";
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
export interface OrdersQuery {
  from?: string;
  to?: string;
  status?: string;
  search?: string;
  page?: number;
  pageSize?: number;
}

export interface PagedOrders {
  items: Order[];
  totalCount: number;
  page: number;
  pageSize: number;
}

function buildOrdersQuery(params?: OrdersQuery): string {
  if (!params) return "";
  const qs = new URLSearchParams();
  if (params.from) qs.set("from", params.from);
  if (params.to) qs.set("to", params.to);
  if (params.status) qs.set("status", params.status);
  if (params.search) qs.set("search", params.search);
  if (params.page != null) qs.set("page", String(params.page));
  if (params.pageSize != null) qs.set("pageSize", String(params.pageSize));
  const s = qs.toString();
  return s ? `?${s}` : "";
}

export const getOrders = (params?: OrdersQuery) => {
  const query = buildOrdersQuery(params);
  if (params?.page != null) {
    return fetchApi<PagedOrders>(`/orders${query}`);
  }
  return fetchApi<Order[]>(`/orders${query}`);
};

export const getOrderDetail = (id: string) => fetchApi<Order>(`/orders/${id}`);

export const updateOrderStatus = (
  id: string,
  status: string,
  trackingNumber?: string | null,
) =>
  fetchApi(`/orders/${id}/status`, {
    method: "PUT",
    body: JSON.stringify({
      status,
      ...(trackingNumber ? { trackingNumber } : {}),
    }),
  });

export const updateOrderAdminNote = (id: string, adminNote: string | null) =>
  fetchApi<{ id: string; adminNote?: string | null }>(`/orders/${id}/note`, {
    method: "PUT",
    body: JSON.stringify({ adminNote }),
  });

export const createManualOrder = (data: CreateManualOrderPayload) =>
  fetchApi<Order>("/orders/manual", {
    method: "POST",
    body: JSON.stringify(data),
  });

export async function exportOrdersCsv(params?: OrdersQuery): Promise<Blob> {
  const token = getToken();
  const res = await fetch(`${API_BASE}/orders/export${buildOrdersQuery(params)}`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  if (res.status === 401 || res.status === 403) {
    clearToken();
    if (typeof window !== "undefined") window.location.href = "/admin/login";
    throw new Error("Oturum süresi doldu, lütfen tekrar giriş yapın.");
  }
  if (!res.ok) throw new Error(await res.text().catch(() => "CSV indirilemedi"));
  return res.blob();
}

export async function downloadOrderInvoice(id: string): Promise<Blob> {
  const token = getToken();
  const res = await fetch(`${API_BASE}/orders/${id}/invoice.pdf`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  if (res.status === 401 || res.status === 403) {
    clearToken();
    if (typeof window !== "undefined") window.location.href = "/admin/login";
    throw new Error("Oturum süresi doldu, lütfen tekrar giriş yapın.");
  }
  if (!res.ok) throw new Error(await res.text().catch(() => "Fatura indirilemedi"));
  return res.blob();
}

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
export const getCustomers = (search?: string, page = 1, pageSize = 50) => {
  const params = new URLSearchParams();
  if (search) params.set("search", search);
  params.set("page", String(page));
  params.set("pageSize", String(pageSize));
  return fetchApi<CustomerPage>(`/customers?${params.toString()}`);
};

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

export const reorderCategories = (
  items: { id: string; sortOrder: number; parentId?: string | null; clearParent?: boolean }[],
) =>
  fetchApi<{ updated: number }>("/categories/reorder", {
    method: "POST",
    body: JSON.stringify({ items }),
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
  let token = await ensureFreshToken();

  const doFetch = (bearer: string | null) =>
    fetch(`${base}${endpoint}`, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        ...(bearer ? { Authorization: `Bearer ${bearer}` } : {}),
        ...options?.headers,
      },
    });

  let res = await doFetch(token);

  if (res.status === 401) {
    const refreshed = await handleUnauthorized();
    if (!refreshed) {
      throw new Error("Oturum süresi doldu, lütfen tekrar giriş yapın.");
    }
    res = await doFetch(refreshed);
  }

  if (res.status === 403) {
    clearToken();
    if (typeof window !== "undefined") window.location.href = "/admin/login";
    throw new Error("Oturum süresi doldu, lütfen tekrar giriş yapın.");
  }

  if (!res.ok) {
    const error = await res.text().catch(() => "Bilinmeyen hata");
    throw new Error(error || `HTTP ${res.status}`);
  }

  if (res.status === 204) return undefined as T;

  return res.json();
}

// --- Kullanıcı / rol yönetimi (Identity.API) ---
export const getAuthRoles = () => fetchAt<string[]>(AUTH_API, "/roles");

export const getUserRoles = (userId: string) =>
  fetchAt<string[]>(AUTH_API, `/users/${userId}/roles`);

export const assignUserRole = (userId: string, role: string) =>
  fetchAt<{ userId: string; role: string }>(AUTH_API, `/users/${userId}/roles`, {
    method: "POST",
    body: JSON.stringify({ role }),
  });

export const removeUserRole = (userId: string, role: string) =>
  fetchAt<void>(AUTH_API, `/users/${userId}/roles/${encodeURIComponent(role)}`, {
    method: "DELETE",
  });

// --- Denetim kayıtları (Catalog.API) ---
export const getAuditLogs = (params?: {
  page?: number;
  pageSize?: number;
  userId?: string;
  entityType?: string;
  action?: string;
}) => {
  const query = new URLSearchParams();
  if (params?.page) query.set("page", String(params.page));
  if (params?.pageSize) query.set("pageSize", String(params.pageSize));
  if (params?.userId) query.set("userId", params.userId);
  if (params?.entityType) query.set("entityType", params.entityType);
  if (params?.action) query.set("action", params.action);
  const suffix = query.toString();
  return fetchAt<AuditLogPage>(
    CATALOG_ADMIN_API,
    `/audit-logs${suffix ? `?${suffix}` : ""}`,
  );
};

export interface AuditLogEntry {
  id: string;
  userId: string;
  userName?: string | null;
  action: string;
  entityType?: string | null;
  entityId?: string | null;
  oldValues?: string | null;
  newValues?: string | null;
  ipAddress?: string | null;
  createdAt: string;
}

export interface AuditLogPage {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
  items: AuditLogEntry[];
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

// Product Q&A
export const getProductQuestions = (params?: {
  approved?: boolean;
  unanswered?: boolean;
}) => {
  const query = new URLSearchParams();
  if (params?.approved !== undefined) query.set("approved", String(params.approved));
  if (params?.unanswered) query.set("unanswered", "true");
  const suffix = query.toString();
  return fetchAt<AdminProductQuestion[]>(
    CATALOG_ADMIN_API,
    `/questions${suffix ? `?${suffix}` : ""}`,
  );
};

export const answerProductQuestion = (id: string, answer: string) =>
  fetchAt<void>(CATALOG_ADMIN_API, `/questions/${id}/answer`, {
    method: "PUT",
    body: JSON.stringify({ answer }),
  });

export const moderateProductQuestion = (id: string, isApproved: boolean) =>
  fetchAt<void>(CATALOG_ADMIN_API, `/questions/${id}/moderate`, {
    method: "PUT",
    body: JSON.stringify({ isApproved }),
  });

export const deleteProductQuestion = (id: string) =>
  fetchAt<void>(CATALOG_ADMIN_API, `/questions/${id}`, { method: "DELETE" });

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
export const getBanners = (placement?: string) =>
  fetchAt<Banner[]>(
    CATALOG_ADMIN_API,
    `/cms/banners${placement ? `?placement=${encodeURIComponent(placement)}` : ""}`,
  );

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

// --- Blog ---
export const getBlogPosts = (params?: { q?: string; status?: string }) => {
  const qs = new URLSearchParams();
  if (params?.q) qs.set("q", params.q);
  if (params?.status) qs.set("status", params.status);
  const suffix = qs.toString() ? `?${qs}` : "";
  return fetchAt<AdminBlogPost[]>(CATALOG_ADMIN_API, `/blog/posts${suffix}`);
};

export const getBlogPost = (id: string) =>
  fetchAt<AdminBlogPostDetail>(CATALOG_ADMIN_API, `/blog/posts/${id}`);

export const createBlogPost = (data: BlogPostPayload) =>
  fetchAt<{ id: string; slug: string }>(CATALOG_ADMIN_API, "/blog/posts", {
    method: "POST",
    body: JSON.stringify(data),
  });

export const updateBlogPost = (id: string, data: BlogPostPayload) =>
  fetchAt<{ id: string; slug: string }>(CATALOG_ADMIN_API, `/blog/posts/${id}`, {
    method: "PUT",
    body: JSON.stringify(data),
  });

export const deleteBlogPost = (id: string) =>
  fetchAt<void>(CATALOG_ADMIN_API, `/blog/posts/${id}`, { method: "DELETE" });

export const bulkPublishBlogPosts = (ids: string[]) =>
  fetchAt<{ count: number }>(CATALOG_ADMIN_API, "/blog/posts/publish", {
    method: "POST",
    body: JSON.stringify(ids),
  });

export const getBlogCategories = () =>
  fetchAt<AdminBlogCategory[]>(CATALOG_ADMIN_API, "/blog/categories");

export const createBlogCategory = (data: { name: string; slug?: string; description?: string; sortOrder?: number }) =>
  fetchAt<AdminBlogCategory>(CATALOG_ADMIN_API, "/blog/categories", {
    method: "POST",
    body: JSON.stringify(data),
  });

export const updateBlogCategory = (
  id: string,
  data: { name: string; slug?: string; description?: string; sortOrder?: number },
) =>
  fetchAt<AdminBlogCategory>(CATALOG_ADMIN_API, `/blog/categories/${id}`, {
    method: "PUT",
    body: JSON.stringify(data),
  });

export const deleteBlogCategory = (id: string) =>
  fetchAt<void>(CATALOG_ADMIN_API, `/blog/categories/${id}`, { method: "DELETE" });

export const getBlogTags = () =>
  fetchAt<AdminBlogTag[]>(CATALOG_ADMIN_API, "/blog/tags");

export const createBlogTag = (data: { name: string; slug?: string }) =>
  fetchAt<AdminBlogTag>(CATALOG_ADMIN_API, "/blog/tags", {
    method: "POST",
    body: JSON.stringify(data),
  });

export const deleteBlogTag = (id: string) =>
  fetchAt<void>(CATALOG_ADMIN_API, `/blog/tags/${id}`, { method: "DELETE" });

// --- Menüler ---

export interface NavMenuItem {
  id: string;
  navMenuId: string;
  parentId?: string | null;
  label: string;
  url?: string | null;
  linkType: string;
  referenceId?: string | null;
  sortOrder: number;
  isActive: boolean;
  openInNewTab: boolean;
  children?: NavMenuItem[];
}

export interface NavMenu {
  id: string;
  name: string;
  location: string;
  isActive: boolean;
  items: NavMenuItem[];
  itemTree?: NavMenuItem[];
}

export const getNavMenus = () =>
  fetchAt<NavMenu[]>(CATALOG_ADMIN_API, "/cms/menus");

export const createNavMenu = (data: { name: string; location: string; isActive?: boolean }) =>
  fetchAt<NavMenu>(CATALOG_ADMIN_API, "/cms/menus", {
    method: "POST",
    body: JSON.stringify(data),
  });

export const updateNavMenu = (
  id: string,
  data: { name: string; location: string; isActive?: boolean },
) =>
  fetchAt<NavMenu>(CATALOG_ADMIN_API, `/cms/menus/${id}`, {
    method: "PUT",
    body: JSON.stringify(data),
  });

export const deleteNavMenu = (id: string) =>
  fetchAt<void>(CATALOG_ADMIN_API, `/cms/menus/${id}`, { method: "DELETE" });

export const createNavMenuItem = (
  menuId: string,
  data: {
    label: string;
    url?: string | null;
    linkType?: string;
    parentId?: string | null;
    referenceId?: string | null;
    sortOrder: number;
    isActive?: boolean;
    openInNewTab?: boolean;
  },
) =>
  fetchAt<NavMenuItem>(CATALOG_ADMIN_API, `/cms/menus/${menuId}/items`, {
    method: "POST",
    body: JSON.stringify(data),
  });

export const updateNavMenuItem = (
  itemId: string,
  data: {
    label: string;
    url?: string | null;
    linkType?: string;
    parentId?: string | null;
    referenceId?: string | null;
    sortOrder: number;
    isActive?: boolean;
    openInNewTab?: boolean;
  },
) =>
  fetchAt<NavMenuItem>(CATALOG_ADMIN_API, `/cms/menus/items/${itemId}`, {
    method: "PUT",
    body: JSON.stringify(data),
  });

export const deleteNavMenuItem = (itemId: string) =>
  fetchAt<void>(CATALOG_ADMIN_API, `/cms/menus/items/${itemId}`, { method: "DELETE" });

export const reorderNavMenuItems = (
  menuId: string,
  items: { id: string; sortOrder: number; parentId?: string | null; clearParent?: boolean }[],
) =>
  fetchAt<{ updated: number }>(CATALOG_ADMIN_API, `/cms/menus/${menuId}/items/reorder`, {
    method: "POST",
    body: JSON.stringify({ items }),
  });

// --- E-posta şablonları (Notification.API) ---

const NOTIFICATION_ADMIN_API =
  process.env.NEXT_PUBLIC_NOTIFICATION_ADMIN_URL || `${GATEWAY_BASE}/notification/admin`;

export interface EmailTemplate {
  id: string;
  code: string;
  name: string;
  subject: string;
  bodyHtml: string;
  variables: string[];
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export const getEmailTemplates = () =>
  fetchAt<EmailTemplate[]>(NOTIFICATION_ADMIN_API, "/email-templates");

export const updateEmailTemplate = (
  id: string,
  data: {
    name: string;
    subject: string;
    bodyHtml: string;
    variables?: string[];
    isActive?: boolean;
  },
) =>
  fetchAt<EmailTemplate>(NOTIFICATION_ADMIN_API, `/email-templates/${id}`, {
    method: "PUT",
    body: JSON.stringify(data),
  });

export const previewEmailTemplate = (
  id: string,
  variables: Record<string, string>,
) =>
  fetchAt<{ subject: string; bodyHtml: string }>(
    NOTIFICATION_ADMIN_API,
    `/email-templates/${id}/preview`,
    { method: "POST", body: JSON.stringify({ variables }) },
  );

// --- Müşteri CRM ---

export interface CustomerSegment {
  id: string;
  name: string;
  description?: string | null;
  color?: string | null;
  memberCount?: number;
}

export interface CustomerNote {
  id: string;
  userId: string;
  note: string;
  createdByUserId?: string | null;
  createdByName?: string | null;
  createdAt: string;
}

export const getCustomerSegments = () =>
  fetchAt<CustomerSegment[]>(CATALOG_ADMIN_API, "/customers/segments");

export const createCustomerSegment = (data: {
  name: string;
  description?: string;
  color?: string;
}) =>
  fetchAt<CustomerSegment>(CATALOG_ADMIN_API, "/customers/segments", {
    method: "POST",
    body: JSON.stringify(data),
  });

export const deleteCustomerSegment = (id: string) =>
  fetchAt<void>(CATALOG_ADMIN_API, `/customers/segments/${id}`, { method: "DELETE" });

export const assignCustomerSegment = (segmentId: string, userId: string) =>
  fetchAt<{ assigned: boolean }>(CATALOG_ADMIN_API, `/customers/segments/${segmentId}/members`, {
    method: "POST",
    body: JSON.stringify({ userId }),
  });

export const getCustomerNotes = (userId: string) =>
  fetchAt<CustomerNote[]>(CATALOG_ADMIN_API, `/customers/${userId}/notes`);

export const createCustomerNote = (data: {
  userId: string;
  note: string;
  createdByUserId?: string;
  createdByName?: string;
}) =>
  fetchAt<CustomerNote>(CATALOG_ADMIN_API, "/customers/notes", {
    method: "POST",
    body: JSON.stringify(data),
  });

export const deleteCustomerNote = (id: string) =>
  fetchAt<void>(CATALOG_ADMIN_API, `/customers/notes/${id}`, { method: "DELETE" });

export const getBlogComments = (approved?: boolean) => {
  const qs =
    approved === undefined ? "" : `?approved=${approved ? "true" : "false"}`;
  return fetchAt<AdminBlogComment[]>(CATALOG_ADMIN_API, `/blog/comments${qs}`);
};

export const moderateBlogComment = (id: string, isApproved: boolean) =>
  fetchAt<void>(CATALOG_ADMIN_API, `/blog/comments/${id}/moderate`, {
    method: "PUT",
    body: JSON.stringify({ isApproved }),
  });

export const deleteBlogComment = (id: string) =>
  fetchAt<void>(CATALOG_ADMIN_API, `/blog/comments/${id}`, { method: "DELETE" });

// --- İçerik modülleri (iletişim, bülten, SSS, stok uyarısı) ---
export const getContactMessages = (unreadOnly?: boolean) => {
  const qs = unreadOnly ? "?unreadOnly=true" : "";
  return fetchAt<AdminContactMessage[]>(CATALOG_ADMIN_API, `/contact${qs}`);
};

export const markContactMessageRead = (id: string, isRead = true) =>
  fetchAt<AdminContactMessage>(CATALOG_ADMIN_API, `/contact/${id}/read`, {
    method: "PUT",
    body: JSON.stringify({ isRead }),
  });

export const deleteContactMessage = (id: string) =>
  fetchAt<void>(CATALOG_ADMIN_API, `/contact/${id}`, { method: "DELETE" });

export const getNewsletterSubscribers = (activeOnly?: boolean) => {
  const qs = activeOnly ? "?activeOnly=true" : "";
  return fetchAt<AdminNewsletterSubscriber[]>(CATALOG_ADMIN_API, `/newsletter${qs}`);
};

export const deleteNewsletterSubscriber = (id: string) =>
  fetchAt<void>(CATALOG_ADMIN_API, `/newsletter/${id}`, { method: "DELETE" });

export async function exportNewsletterCsv(): Promise<Blob> {
  const token = getToken();
  const res = await fetch(`${CATALOG_ADMIN_API}/newsletter/export`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  if (res.status === 401 || res.status === 403) {
    clearToken();
    if (typeof window !== "undefined") window.location.href = "/admin/login";
    throw new Error("Oturum süresi doldu, lütfen tekrar giriş yapın.");
  }
  if (!res.ok) throw new Error(await res.text().catch(() => "CSV indirilemedi"));
  return res.blob();
}

export const getFaqs = () => fetchAt<AdminFaqItem[]>(CATALOG_ADMIN_API, "/faqs");

export const createFaq = (data: FaqPayload) =>
  fetchAt<AdminFaqItem>(CATALOG_ADMIN_API, "/faqs", {
    method: "POST",
    body: JSON.stringify(data),
  });

export const updateFaq = (id: string, data: FaqPayload) =>
  fetchAt<AdminFaqItem>(CATALOG_ADMIN_API, `/faqs/${id}`, {
    method: "PUT",
    body: JSON.stringify(data),
  });

export const deleteFaq = (id: string) =>
  fetchAt<void>(CATALOG_ADMIN_API, `/faqs/${id}`, { method: "DELETE" });

export const getCurrencies = () =>
  fetchAt<AdminCurrency[]>(CATALOG_ADMIN_API, "/currencies");

export const createCurrency = (data: CurrencyPayload) =>
  fetchAt<AdminCurrency>(CATALOG_ADMIN_API, "/currencies", {
    method: "POST",
    body: JSON.stringify(data),
  });

export const updateCurrency = (id: string, data: CurrencyPayload) =>
  fetchAt<AdminCurrency>(CATALOG_ADMIN_API, `/currencies/${id}`, {
    method: "PUT",
    body: JSON.stringify(data),
  });

export const deleteCurrency = (id: string) =>
  fetchAt<void>(CATALOG_ADMIN_API, `/currencies/${id}`, { method: "DELETE" });

export interface AdminCurrency {
  id: string;
  code: string;
  symbol: string;
  name: string;
  rateToBase: number;
  isDefault: boolean;
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string | null;
}

export interface CurrencyPayload {
  code: string;
  symbol: string;
  name: string;
  rateToBase: number;
  isDefault?: boolean;
  isActive?: boolean;
}

export const getStockAlerts = (pendingOnly = true) =>
  fetchAt<AdminStockAlert[]>(
    CATALOG_ADMIN_API,
    `/stock-alerts?pendingOnly=${pendingOnly}`,
  );

export const notifyStockAlert = (id: string) =>
  fetchAt<{
    id: string;
    email: string;
    productId: string;
    productName: string;
    isNotified: boolean;
    notifiedAt: string;
  }>(CATALOG_ADMIN_API, `/stock-alerts/${id}/notify`, { method: "POST" });

// --- Ürün toplu işlem / CSV / çoğaltma ---
export type BulkProductAction =
  | "activate"
  | "deactivate"
  | "delete"
  | "changeCategory";

export const bulkProducts = (
  action: BulkProductAction,
  productIds: string[],
  categoryId?: string,
) =>
  fetchAt<{ count: number; action: string }>(CATALOG_ADMIN_API, "/products/bulk", {
    method: "POST",
    body: JSON.stringify({
      action,
      productIds,
      categoryId: categoryId ?? null,
    }),
  });

export const duplicateProduct = (id: string) =>
  fetchAt<{ id: string; name: string; slug: string }>(
    CATALOG_ADMIN_API,
    `/products/${id}/duplicate`,
    { method: "POST" },
  );

export async function exportProductsCsv(): Promise<Blob> {
  const token = getToken();
  const res = await fetch(`${CATALOG_ADMIN_API}/products/export`, {
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
  });
  if (res.status === 401 || res.status === 403) {
    clearToken();
    if (typeof window !== "undefined") window.location.href = "/admin/login";
    throw new Error("Oturum süresi doldu, lütfen tekrar giriş yapın.");
  }
  if (!res.ok) {
    const error = await res.text().catch(() => "");
    throw new Error(error || `HTTP ${res.status}`);
  }
  return res.blob();
}

export async function importProductsCsv(file: File): Promise<ProductImportReport> {
  const token = getToken();
  const formData = new FormData();
  formData.append("file", file);

  const res = await fetch(`${CATALOG_ADMIN_API}/products/import`, {
    method: "POST",
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
    body: formData,
  });

  if (res.status === 401 || res.status === 403) {
    clearToken();
    if (typeof window !== "undefined") window.location.href = "/admin/login";
    throw new Error("Oturum süresi doldu, lütfen tekrar giriş yapın.");
  }
  if (!res.ok) {
    const error = await res.text().catch(() => "");
    throw new Error(error || `HTTP ${res.status}`);
  }
  return res.json();
}

export interface ProductImportReport {
  created: number;
  updated: number;
  skipped: number;
  errorCount: number;
  errors: { row: number; message: string }[];
}

// --- Depolar ---
export const getWarehouses = () =>
  fetchAt<AdminWarehouse[]>(CATALOG_ADMIN_API, "/warehouses");

export const createWarehouse = (data: WarehousePayload) =>
  fetchAt<AdminWarehouse>(CATALOG_ADMIN_API, "/warehouses", {
    method: "POST",
    body: JSON.stringify(data),
  });

export const updateWarehouse = (id: string, data: WarehousePayload) =>
  fetchAt<AdminWarehouse>(CATALOG_ADMIN_API, `/warehouses/${id}`, {
    method: "PUT",
    body: JSON.stringify(data),
  });

export const deleteWarehouse = (id: string) =>
  fetchAt<void>(CATALOG_ADMIN_API, `/warehouses/${id}`, { method: "DELETE" });

export const getWarehouseStock = (id: string) =>
  fetchAt<WarehouseStockLine[]>(CATALOG_ADMIN_API, `/warehouses/${id}/stock`);

export const adjustWarehouseStock = (
  warehouseId: string,
  data: {
    variantId: string;
    quantity: number;
    type: StockMovementType;
    note?: string | null;
    reference?: string | null;
  },
) =>
  fetchAt<{
    warehouseId: string;
    variantId: string;
    sku: string;
    warehouseQuantity: number;
    totalStock: number;
  }>(CATALOG_ADMIN_API, `/warehouses/${warehouseId}/stock/adjust`, {
    method: "POST",
    body: JSON.stringify(data),
  });

export interface AdminWarehouse {
  id: string;
  name: string;
  code?: string | null;
  address?: string | null;
  isActive: boolean;
  isDefault: boolean;
  createdAt?: string;
  updatedAt?: string | null;
  stockLines?: number;
  totalUnits?: number;
}

export interface WarehousePayload {
  name: string;
  code?: string | null;
  address?: string | null;
  isActive?: boolean;
  isDefault?: boolean;
}

export interface WarehouseStockLine {
  id: string;
  productVariantId: string;
  sku: string;
  productId: string;
  productName: string;
  quantity: number;
  updatedAt?: string | null;
}

export interface AdminContactMessage {
  id: string;
  name: string;
  email: string;
  phone?: string | null;
  subject: string;
  message: string;
  isRead: boolean;
  createdAt: string;
}

export interface AdminNewsletterSubscriber {
  id: string;
  email: string;
  isConfirmed: boolean;
  confirmedAt?: string | null;
  createdAt: string;
  unsubscribedAt?: string | null;
}

export interface AdminFaqItem {
  id: string;
  category: string;
  question: string;
  answer: string;
  sortOrder: number;
  isPublished: boolean;
  createdAt: string;
  updatedAt?: string | null;
}

export interface FaqPayload {
  category: string;
  question: string;
  answer: string;
  sortOrder?: number;
  isPublished?: boolean;
}

export interface AdminStockAlert {
  id: string;
  productId: string;
  productName?: string | null;
  email: string;
  userId?: string | null;
  isNotified: boolean;
  createdAt: string;
  notifiedAt?: string | null;
}

export interface AdminBlogPost {
  id: string;
  title: string;
  slug: string;
  excerpt?: string | null;
  coverImageUrl?: string | null;
  authorName?: string | null;
  isPublished: boolean;
  isFeatured: boolean;
  publishedAt?: string | null;
  viewCount: number;
  readingTimeMinutes: number;
  category?: { id: string; name: string } | null;
  tags: { id: string; name: string }[];
}

export interface AdminBlogPostDetail {
  id: string;
  title: string;
  slug: string;
  excerpt?: string | null;
  content: string;
  coverImageUrl?: string | null;
  authorName?: string | null;
  readingTimeMinutes: number;
  isPublished: boolean;
  isFeatured: boolean;
  publishedAt?: string | null;
  metaTitle?: string | null;
  metaDescription?: string | null;
  viewCount: number;
  blogCategoryId?: string | null;
  tagIds: string[];
}

export interface BlogPostPayload {
  title: string;
  slug?: string | null;
  excerpt?: string | null;
  content?: string | null;
  coverImageUrl?: string | null;
  authorName?: string | null;
  readingTimeMinutes?: number | null;
  isPublished: boolean;
  isFeatured: boolean;
  publishedAt?: string | null;
  metaTitle?: string | null;
  metaDescription?: string | null;
  blogCategoryId?: string | null;
  tagIds?: string[];
}

export interface AdminBlogCategory {
  id: string;
  name: string;
  slug: string;
  description?: string | null;
  sortOrder: number;
  postCount?: number;
}

export interface AdminBlogTag {
  id: string;
  name: string;
  slug: string;
}

export interface AdminBlogComment {
  id: string;
  authorName: string;
  authorEmail?: string | null;
  content: string;
  isApproved: boolean;
  createdAt: string;
  post: { id: string; title: string; slug: string };
}

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

export const getConversionReport = (days = 30) =>
  fetchApi<ConversionReport>(`/reports/conversion?days=${days}`);

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
  isVerifiedPurchase?: boolean;
  helpfulCount?: number;
  notHelpfulCount?: number;
  imageUrls?: string[];
  createdAt: string;
}

export interface AdminProductQuestion {
  id: string;
  productId: string;
  productName: string;
  userId: string | null;
  userName: string;
  email: string | null;
  question: string;
  answer: string | null;
  answeredBy: string | null;
  answeredAt: string | null;
  isApproved: boolean;
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
  orderNumber?: string;
  trackingNumber?: string;
  description?: string;
  adminNote?: string | null;
  firstName?: string;
  lastName?: string;
  emailAddress?: string;
  addressLine?: string;
  city?: string;
  state?: string;
  country?: string;
  zipCode?: string;
  discountAmount?: number;
  couponCode?: string;
  shippingCost?: number;
  paymentMethod?: string;
  giftWrap?: boolean;
  giftMessage?: string;
  statusHistory?: { status: string; note?: string; createdAt: string }[];
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

export interface CreateManualOrderItemPayload {
  productId: string;
  productName: string;
  unitPrice: number;
  units: number;
  pictureUrl?: string | null;
  selectedAttributes?: string | null;
}

export interface CreateManualOrderPayload {
  buyerId?: string | null;
  firstName: string;
  lastName: string;
  emailAddress: string;
  addressLine: string;
  city: string;
  state?: string | null;
  country?: string | null;
  zipCode?: string | null;
  paymentMethod?: string | null;
  description?: string | null;
  adminNote?: string | null;
  shippingCost?: number | null;
  discountAmount?: number | null;
  initialStatus?: string | null;
  items: CreateManualOrderItemPayload[];
}

// --- İade ---

export type ReturnStatus =
  | "Pending"
  | "Approved"
  | "Rejected"
  | "Refunded"
  | "Cancelled";

export type ReturnRequestType = "Refund" | "Exchange";

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
  exchangeProductId?: string | null;
  exchangeProductName?: string | null;
  exchangeSelectedAttributes?: string | null;
}

export interface ReturnRequest {
  id: string;
  orderId: string;
  buyerId: string;
  requestNumber: string;
  requestType?: ReturnRequestType;
  requestTypeName?: string;
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
  /** Onay anında stoğun geri eklendiği zaman. Doluysa stok tekrar artırılmaz. */
  stockRestoredAt?: string | null;
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

export interface CustomerPage {
  items: Customer[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
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
  slug?: string | null;
  imageUrl?: string | null;
  sortOrder?: number;
  isFeatured?: boolean;
  showInMenu?: boolean;
  metaTitle?: string | null;
  metaDescription?: string | null;
  attributeCount: number;
  children: CategoryTree[];
}

export interface CategoryDetail {
  id: string;
  name: string;
  parentId?: string;
  slug?: string | null;
  imageUrl?: string | null;
  sortOrder?: number;
  isFeatured?: boolean;
  showInMenu?: boolean;
  metaTitle?: string | null;
  metaDescription?: string | null;
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
  slug?: string | null;
  description?: string | null;
  metaTitle?: string | null;
  metaDescription?: string | null;
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
  slug?: string | null;
  imageUrl?: string | null;
  sortOrder?: number;
  isFeatured?: boolean;
  showInMenu?: boolean;
  metaTitle?: string | null;
  metaDescription?: string | null;
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
  slug?: string | null;
  description?: string | null;
  metaTitle?: string | null;
  metaDescription?: string | null;
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
  seo: "SEO",
  commerce: "Ticaret",
  payment: "Ödeme",
  tax: "Vergi / KDV",
  shipping: "Kargo",
  email: "E-posta",
  social: "Sosyal medya",
};

// --- İçerik yönetimi ---

/** Web bannerlarının yerleşim adı. */
export const BANNER_PLACEMENT_DESKTOP = "home-slider";

/** Mobil bannerların yerleşim adı — web bannerlarından bağımsız yönetilir. */
export const BANNER_PLACEMENT_MOBILE = "home-slider-mobile";

export interface Banner {
  id: string;
  title: string;
  subtitle?: string;
  imageUrl: string;
  linkUrl?: string;
  /** CTA butonunda yazacak metin. Boşsa buton gösterilmez. */
  ctaText?: string | null;
  placement: string;
  sortOrder: number;
  isActive: boolean;
  startsAt?: string;
  endsAt?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface BannerPayload {
  title?: string | null;
  subtitle?: string | null;
  imageUrl: string;
  linkUrl?: string | null;
  ctaText?: string | null;
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

export interface ConversionReport {
  days: number;
  newUsers: number;
  totalOrders: number;
  paidOrders: number;
  shippedOrders: number;
  deliveredOrders: number;
  cancelledOrders: number;
  registrationToOrderRate: number;
  orderToPaidRate: number;
  paidToDeliveredRate: number;
  stages: { key: string; label: string; count: number; rate: number }[];
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
