export function getOrderStatusInfo(status: string) {
  switch (status) {
    case "Paid":
      return {
        label: "Ödeme Onaylandı",
        color: "bg-emerald-50 text-emerald-700 border-emerald-200",
      };
    case "Submitted":
      return {
        label: "Sipariş Alındı",
        color: "bg-blue-50 text-blue-700 border-blue-200",
      };
    case "Shipped":
      return {
        label: "Kargoda",
        color: "bg-indigo-50 text-indigo-700 border-indigo-200",
      };
    case "Delivered":
      return {
        label: "Teslim Edildi",
        color: "bg-emerald-50 text-emerald-800 border-emerald-200",
      };
    case "Cancelled":
      return {
        label: "İptal Edildi",
        color: "bg-red-50 text-red-700 border-red-200",
      };
    case "Returned":
      return {
        label: "İade Edildi",
        color: "bg-amber-50 text-amber-800 border-amber-200",
      };
    case "StockFailed":
      return {
        label: "Stok Yetersiz",
        color: "bg-red-50 text-red-700 border-red-200",
      };
    case "Failed":
      return {
        label: "Başarısız",
        color: "bg-red-50 text-red-700 border-red-200",
      };
    default:
      return {
        label: status,
        color: "bg-gray-50 text-gray-700 border-gray-200",
      };
  }
}

export function getPaymentMethodLabel(method?: string | null) {
  switch (method) {
    case "card":
      return "Kredi / Banka Kartı";
    case "bank_transfer":
      return "Havale / EFT";
    case "cash_on_delivery":
      return "Kapıda Ödeme";
    default:
      return method || null;
  }
}

export function getInvoiceTypeLabel(type?: string | null) {
  switch (type) {
    case "individual":
      return "Bireysel";
    case "corporate":
      return "Kurumsal";
    default:
      return type || null;
  }
}

export interface OrderItem {
  id?: string;
  productId: string;
  productName: string;
  pictureUrl: string | null;
  price: number;
  unitPrice?: number;
  units: number;
  selectedAttributes?: string | null;
}

export interface OrderStatusHistoryEntry {
  status: string;
  note?: string | null;
  createdAt: string;
}

export interface Order {
  id: string;
  orderNumber?: string | null;
  trackingNumber?: string | null;
  orderDate: string;
  orderStatus: string;
  totalPrice: number;
  totalAmount?: number;
  discountAmount?: number;
  couponCode?: string | null;
  shippingCost?: number;
  description?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  emailAddress?: string | null;
  addressLine?: string | null;
  city?: string | null;
  state?: string | null;
  country?: string | null;
  zipCode?: string | null;
  invoiceType?: string | null;
  taxId?: string | null;
  taxOffice?: string | null;
  companyName?: string | null;
  billingSameAsShipping?: boolean;
  billingAddressLine?: string | null;
  billingCity?: string | null;
  billingState?: string | null;
  billingCountry?: string | null;
  billingZipCode?: string | null;
  paymentMethod?: string | null;
  statusHistory?: OrderStatusHistoryEntry[];
  history?: OrderStatusHistoryEntry[];
  orderItems: OrderItem[];
}

export interface ShipmentTracking {
  trackingNumber?: string | null;
  trackingUrl?: string | null;
  carrierName?: string | null;
  status?: string | number;
  statusName?: string | null;
}

export type ReturnStatus =
  | "Pending"
  | "Approved"
  | "Rejected"
  | "Refunded"
  | "Cancelled";

export interface ReturnRequest {
  id: string;
  orderId: string;
  buyerId: string;
  requestNumber: string;
  reason: string;
  reasonName: string;
  reasonDetail?: string | null;
  status: ReturnStatus;
  statusName: string;
  refundAmount: number;
  adminNote?: string | null;
  requestedAt: string;
  resolvedAt?: string | null;
  refundedAt?: string | null;
}
