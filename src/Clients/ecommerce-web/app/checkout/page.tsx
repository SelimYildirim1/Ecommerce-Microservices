"use client";

import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Header from "@/components/Header";
import LegalDocumentModal from "@/components/LegalDocumentModal";
import { Check, ChevronRight, Gift, ShieldCheck } from "lucide-react";
import { API_URL, authHeaders } from "@/lib/api";
import { ensureGuestSession } from "@/lib/guest-session";
import { notify, parseApiError } from "@/lib/feedback";
import * as api from "@/lib/client-api";
import type { Address } from "@/lib/client-api";

interface BasketItem {
  productId: string;
  productName: string;
  price: number;
  quantity: number;
}

interface BasketSummary {
  subtotal: number;
  discountAmount: number;
  appliedCouponCode?: string | null;
  appliedCampaignName?: string | null;
  shippingCost: number;
  freeShipping: boolean;
  total: number;
  message?: string | null;
}

interface ShippingOption {
  carrierId: string;
  carrierName: string;
  carrierCode?: string;
  logoUrl?: string | null;
  price: number;
  isFree: boolean;
  estimatedDays: number;
  note?: string | null;
}

interface ShippingSettings {
  freeShippingThreshold: number;
  defaultPrice?: number;
  defaultDesiPerItem?: number;
}

type PaymentMethod = "card" | "bank_transfer" | "cash_on_delivery";
type InvoiceType = "individual" | "corporate";
type Step = 1 | 2 | 3;

const STEP_LABELS = ["Teslimat", "Ödeme", "Onay"] as const;

const formatPrice = (value: number) =>
  new Intl.NumberFormat("tr-TR", { style: "currency", currency: "TRY" }).format(value);

const emptySummary: BasketSummary = {
  subtotal: 0,
  discountAmount: 0,
  shippingCost: 0,
  freeShipping: false,
  total: 0,
};

function splitRecipientName(name: string): { first: string; last: string } {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return { first: "", last: "" };
  if (parts.length === 1) return { first: parts[0], last: "" };
  return { first: parts[0], last: parts.slice(1).join(" ") };
}

function applyAddressToForm(address: Address) {
  const { first, last } = splitRecipientName(address.recipientName);
  return {
    FirstName: first,
    LastName: last,
    Country: address.country || "Türkiye",
    State: address.district || "",
    City: address.city || "",
    AddressLine: address.street || "",
    ZipCode: address.zipCode || "",
  };
}

export default function CheckoutPage() {
  const { user, isLoading: authLoading } = useAuth();
  const router = useRouter();
  const [step, setStep] = useState<Step>(1);
  const [basketUserName, setBasketUserName] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [summaryLoading, setSummaryLoading] = useState(false);
  const [items, setItems] = useState<BasketItem[]>([]);
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [selectedAddressId, setSelectedAddressId] = useState<number | "manual" | null>(null);
  const [acceptKvkk, setAcceptKvkk] = useState(false);
  const [acceptMesafeli, setAcceptMesafeli] = useState(false);
  const [legalModal, setLegalModal] = useState<"kvkk" | "mesafeli" | null>(null);

  const [email, setEmail] = useState("");
  const [couponInput, setCouponInput] = useState("");
  const [appliedCoupon, setAppliedCoupon] = useState<string | null>(null);
  const [couponMessage, setCouponMessage] = useState<string | null>(null);

  const [shippingOptions, setShippingOptions] = useState<ShippingOption[]>([]);
  const [selectedCarrierId, setSelectedCarrierId] = useState<string | null>(null);
  const [shippingSettings, setShippingSettings] = useState<ShippingSettings | null>(null);
  const [summary, setSummary] = useState<BasketSummary>(emptySummary);

  const [invoiceType, setInvoiceType] = useState<InvoiceType>("individual");
  const [taxId, setTaxId] = useState("");
  const [taxOffice, setTaxOffice] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [billingSameAsShipping, setBillingSameAsShipping] = useState(true);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("card");

  const [orderNote, setOrderNote] = useState("");
  const [giftWrap, setGiftWrap] = useState(false);
  const [giftMessage, setGiftMessage] = useState("");

  const [formData, setFormData] = useState({
    FirstName: "",
    LastName: "",
    Country: "Türkiye",
    State: "",
    City: "",
    AddressLine: "",
    ZipCode: "",
  });

  const [billingForm, setBillingForm] = useState({
    BillingAddressLine: "",
    BillingCity: "",
    BillingState: "",
    BillingCountry: "Türkiye",
    BillingZipCode: "",
  });

  const isGuest = !user;

  useEffect(() => {
    if (user?.email) setEmail(user.email);
  }, [user?.email]);

  useEffect(() => {
    if (authLoading) return;

    let cancelled = false;

    (async () => {
      try {
        let userName: string | null = user?.id ?? null;

        if (!userName) {
          const guest = await ensureGuestSession();
          userName = guest?.guestId ?? null;
        }

        if (cancelled || !userName) return;
        setBasketUserName(userName);

        const basketRes = await fetch(`${API_URL}/basket/${userName}`, {
          headers: authHeaders(),
        });
        if (!cancelled && basketRes.ok) {
          const basket = await basketRes.json();
          if (Array.isArray(basket?.items)) setItems(basket.items);
        }

        const [optionsRes, settingsRes] = await Promise.all([
          fetch(`${API_URL}/basket/${userName}/shipping-options`, {
            headers: authHeaders(),
          }),
          fetch(`${API_URL}/shipping/settings`),
        ]);

        if (!cancelled && optionsRes.ok) {
          const options = (await optionsRes.json()) as ShippingOption[];
          const list = Array.isArray(options) ? options : [];
          setShippingOptions(list);
          if (list.length > 0) {
            setSelectedCarrierId((prev) => prev ?? list[0].carrierId);
          }
        }

        if (!cancelled && settingsRes.ok) {
          const settings = (await settingsRes.json()) as ShippingSettings;
          setShippingSettings(settings);
        }

        if (user) {
          try {
            const list = await api.getAddresses();
            if (cancelled) return;
            setAddresses(list);
            const preferred = list.find((a) => a.isDefault) ?? list[0];
            if (preferred) {
              setSelectedAddressId(preferred.id);
              setFormData(applyAddressToForm(preferred));
            } else {
              setSelectedAddressId("manual");
            }
          } catch {
            if (!cancelled) setSelectedAddressId("manual");
          }
        } else if (!cancelled) {
          setSelectedAddressId("manual");
        }
      } catch {
        if (!cancelled) {
          notify.error("Sepet yüklenemedi. Lütfen sayfayı yenileyin.");
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [authLoading, user]);

  const fetchSummary = useCallback(
    async (couponCode: string | null, carrierId: string | null) => {
      if (!basketUserName) return;
      setSummaryLoading(true);
      try {
        const res = await fetch(`${API_URL}/basket/summary`, {
          method: "POST",
          headers: authHeaders({ "Content-Type": "application/json" }),
          body: JSON.stringify({
            userName: basketUserName,
            couponCode: couponCode || null,
            shippingCarrierId: carrierId || null,
          }),
        });

        if (!res.ok) {
          const raw = await res.text().catch(() => "");
          notify.error(parseApiError(raw, "Sipariş özeti alınamadı."));
          return;
        }

        const data = (await res.json()) as BasketSummary;
        setSummary({
          subtotal: Number(data.subtotal) || 0,
          discountAmount: Number(data.discountAmount) || 0,
          appliedCouponCode: data.appliedCouponCode ?? null,
          appliedCampaignName: data.appliedCampaignName ?? null,
          shippingCost: Number(data.shippingCost) || 0,
          freeShipping: Boolean(data.freeShipping),
          total: Number(data.total) || 0,
          message: data.message ?? null,
        });

        if (couponCode) {
          if (data.appliedCouponCode) {
            setAppliedCoupon(data.appliedCouponCode);
            setCouponMessage(data.message ?? "Kupon uygulandı.");
          } else {
            setAppliedCoupon(null);
            setCouponMessage(data.message ?? "Kupon uygulanamadı.");
          }
        } else if (!couponCode) {
          setCouponMessage(data.message ?? null);
        }
      } catch {
        notify.error("Sipariş özeti alınamadı.");
      } finally {
        setSummaryLoading(false);
      }
    },
    [basketUserName],
  );

  useEffect(() => {
    if (!basketUserName) return;
    void fetchSummary(appliedCoupon, selectedCarrierId);
  }, [basketUserName, selectedCarrierId, appliedCoupon, fetchSummary]);

  const selectAddress = (id: number | "manual") => {
    setSelectedAddressId(id);
    if (id === "manual") return;
    const address = addresses.find((a) => a.id === id);
    if (address) setFormData(applyAddressToForm(address));
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setSelectedAddressId("manual");
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleBillingChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setBillingForm({ ...billingForm, [e.target.name]: e.target.value });
  };

  const applyCoupon = async () => {
    const code = couponInput.trim();
    if (!code) {
      notify.error("Kupon kodu girin.");
      return;
    }
    await fetchSummary(code, selectedCarrierId);
  };

  const clearCoupon = async () => {
    setCouponInput("");
    setAppliedCoupon(null);
    setCouponMessage(null);
    await fetchSummary(null, selectedCarrierId);
  };

  const validateStep1 = (): boolean => {
    const trimmedEmail = email.trim();
    if (!trimmedEmail) { notify.error("E-posta adresi zorunludur."); return false; }
    if (!formData.FirstName.trim()) { notify.error("Ad alanı zorunludur."); return false; }
    if (!formData.LastName.trim()) { notify.error("Soyad alanı zorunludur."); return false; }
    if (!formData.City.trim()) { notify.error("Şehir alanı zorunludur."); return false; }
    if (!formData.State.trim()) { notify.error("İlçe alanı zorunludur."); return false; }
    if (!formData.AddressLine.trim()) { notify.error("Adres alanı zorunludur."); return false; }
    if (!formData.ZipCode.trim()) { notify.error("Posta kodu zorunludur."); return false; }
    if (invoiceType === "corporate") {
      if (!companyName.trim() || !taxId.trim() || !taxOffice.trim()) {
        notify.error("Kurumsal fatura için firma adı, VKN ve vergi dairesi zorunludur.");
        return false;
      }
    }
    if (!billingSameAsShipping) {
      if (!billingForm.BillingAddressLine.trim() || !billingForm.BillingCity.trim() || !billingForm.BillingState.trim() || !billingForm.BillingZipCode.trim()) {
        notify.error("Fatura adresi alanlarını doldurun.");
        return false;
      }
    }
    return true;
  };

  const validateStep2 = (): boolean => {
    return true;
  };

  const validateStep3 = (): boolean => {
    if (!acceptKvkk || !acceptMesafeli) {
      notify.error("Devam etmek için KVKK ve mesafeli satış onaylarını işaretleyin.");
      return false;
    }
    return true;
  };

  const goNext = () => {
    if (step === 1 && validateStep1()) setStep(2);
    else if (step === 2 && validateStep2()) setStep(3);
  };

  const goBack = () => {
    if (step === 2) setStep(1);
    else if (step === 3) setStep(2);
  };

  const handleCheckout = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateStep3()) return;

    setLoading(true);

    try {
      let userName = basketUserName;
      if (!userName) {
        if (user?.id) {
          userName = user.id;
        } else {
          const guest = await ensureGuestSession();
          userName = guest?.guestId ?? null;
        }
      }

      if (!userName) {
        notify.error("Oturum açılamadı. Lütfen tekrar deneyin.");
        setLoading(false);
        return;
      }

      const checkoutData = {
        UserName: userName,
        EmailAddress: email.trim(),
        TotalPrice: 0,
        FirstName: formData.FirstName,
        LastName: formData.LastName,
        Country: formData.Country,
        State: formData.State,
        City: formData.City,
        AddressLine: formData.AddressLine,
        ZipCode: formData.ZipCode,
        CouponCode: appliedCoupon || null,
        ShippingCarrierId: selectedCarrierId || null,
        InvoiceType: invoiceType,
        TaxId: taxId.trim() || null,
        TaxOffice: invoiceType === "corporate" ? taxOffice.trim() : null,
        CompanyName: invoiceType === "corporate" ? companyName.trim() : null,
        BillingSameAsShipping: billingSameAsShipping,
        BillingAddressLine: billingSameAsShipping ? null : billingForm.BillingAddressLine,
        BillingCity: billingSameAsShipping ? null : billingForm.BillingCity,
        BillingState: billingSameAsShipping ? null : billingForm.BillingState,
        BillingCountry: billingSameAsShipping ? null : billingForm.BillingCountry,
        BillingZipCode: billingSameAsShipping ? null : billingForm.BillingZipCode,
        PaymentMethod: paymentMethod,
        OrderNote: orderNote.trim() || null,
        GiftWrap: giftWrap,
        GiftMessage: giftWrap ? giftMessage.trim() || null : null,
        CardName: "",
        CardNumber: "",
        Expiration: "",
        CVV: "",
      };

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15000);

      const res = await fetch(`${API_URL}/basket/checkout`, {
        method: "POST",
        headers: authHeaders({ "Content-Type": "application/json" }),
        body: JSON.stringify(checkoutData),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (res.ok || res.status === 202 || res.status === 204) {
        let orderNumber = "";
        try {
          const data = await res.json();
          orderNumber = data?.orderNumber ?? data?.OrderNumber ?? "";
        } catch {
          /* 204 veya boş gövde */
        }

        const params = new URLSearchParams();
        if (orderNumber) params.set("orderNumber", orderNumber);
        params.set("email", email.trim());
        params.set("payment", paymentMethod);
        router.push(`/checkout/basarili?${params.toString()}`);
        return;
      }

      const raw = await res.text().catch(() => "");
      notify.error(
        parseApiError(raw, "Sipariş tamamlanamadı. Bilgileri kontrol edip tekrar deneyin."),
      );
    } catch (error: unknown) {
      if (error instanceof Error && error.name === "AbortError") {
        notify.error("İstek zaman aşımına uğradı. Lütfen tekrar deneyin.");
      } else {
        notify.error("Sunucuya bağlanılamadı. İnternet bağlantınızı kontrol edin.");
      }
    } finally {
      setLoading(false);
    }
  };

  const inputClass =
    "w-full h-11 px-4 rounded-lg border border-border bg-white text-sm placeholder:text-muted-foreground focus:outline-none focus:border-foreground focus:ring-1 focus:ring-foreground transition";
  const labelClass =
    "block text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1.5";

  const threshold = shippingSettings?.freeShippingThreshold ?? 0;
  const freeShippingProgress =
    threshold > 0 ? Math.min(100, (summary.subtotal / threshold) * 100) : 0;
  const remainingForFree =
    threshold > 0 ? Math.max(0, threshold - summary.subtotal) : 0;

  const renderStepIndicator = () => (
    <div className="flex items-center justify-center gap-0 mb-8">
      {STEP_LABELS.map((label, i) => {
        const num = (i + 1) as Step;
        const isActive = step === num;
        const isDone = step > num;
        return (
          <div key={label} className="flex items-center">
            {i > 0 && (
              <div className={`w-12 h-0.5 ${isDone ? "bg-foreground" : "bg-border"} transition-colors`} />
            )}
            <button
              type="button"
              onClick={() => {
                if (isDone) setStep(num);
              }}
              disabled={!isDone}
              className="flex items-center gap-2 disabled:cursor-default"
            >
              <span
                className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-medium transition-colors ${
                  isActive
                    ? "bg-foreground text-white"
                    : isDone
                      ? "bg-foreground text-white"
                      : "bg-muted text-muted-foreground"
                }`}
              >
                {isDone ? <Check className="h-4 w-4" /> : num}
              </span>
              <span
                className={`text-sm font-medium hidden sm:inline ${
                  isActive ? "text-foreground" : isDone ? "text-foreground" : "text-muted-foreground"
                }`}
              >
                {label}
              </span>
            </button>
          </div>
        );
      })}
    </div>
  );

  const renderStep1 = () => (
    <div className="space-y-6">
      {user && addresses.length > 0 && (
        <div className="overflow-hidden rounded-2xl border border-border">
          <div className="border-b border-border bg-muted/30 px-5 py-3">
            <h2 className="text-sm font-semibold uppercase tracking-wider">Kayıtlı Adresler</h2>
          </div>
          <div className="space-y-3 p-5">
            {addresses.map((address) => (
              <label
                key={address.id}
                className={`flex cursor-pointer gap-3 rounded-xl border p-4 transition ${
                  selectedAddressId === address.id ? "border-foreground bg-muted/40" : "border-border hover:border-gray-300"
                }`}
              >
                <input type="radio" name="savedAddress" className="mt-1" checked={selectedAddressId === address.id} onChange={() => selectAddress(address.id)} />
                <span className="text-sm">
                  <span className="font-medium">{address.addressTitle}{address.isDefault ? " · Varsayılan" : ""}</span>
                  <span className="mt-1 block text-gray-600">{address.recipientName} — {address.street}, {address.district} / {address.city}</span>
                </span>
              </label>
            ))}
            <label className={`flex cursor-pointer gap-3 rounded-xl border p-4 transition ${selectedAddressId === "manual" ? "border-foreground bg-muted/40" : "border-border hover:border-gray-300"}`}>
              <input type="radio" name="savedAddress" className="mt-1" checked={selectedAddressId === "manual"} onChange={() => selectAddress("manual")} />
              <span className="text-sm font-medium">Farklı adres gir</span>
            </label>
            <p className="text-xs text-muted-foreground">
              Adresleri{" "}
              <Link href="/account/addresses" className="underline">Hesabım → Adreslerim</Link>{" "}
              sayfasından yönetebilirsiniz.
            </p>
          </div>
        </div>
      )}

      <div className="border border-border rounded-2xl overflow-hidden">
        <div className="bg-muted/30 px-5 py-3 border-b border-border">
          <h2 className="text-sm font-semibold uppercase tracking-wider">Kişisel Bilgiler</h2>
        </div>
        <div className="p-5 grid grid-cols-2 gap-4">
          <div className="col-span-2">
            <label className={labelClass}>E-posta</label>
            <input type="email" value={email} placeholder="ornek@email.com" required onChange={(e) => setEmail(e.target.value)} className={inputClass} />
            {isGuest && <p className="mt-1.5 text-xs text-muted-foreground">Sipariş onayı ve takip için gerekli.</p>}
          </div>
          <div>
            <label className={labelClass}>Ad</label>
            <input name="FirstName" value={formData.FirstName} placeholder="Adınız" required onChange={handleChange} className={inputClass} />
          </div>
          <div>
            <label className={labelClass}>Soyad</label>
            <input name="LastName" value={formData.LastName} placeholder="Soyadınız" required onChange={handleChange} className={inputClass} />
          </div>
        </div>
      </div>

      <div className="border border-border rounded-2xl overflow-hidden">
        <div className="bg-muted/30 px-5 py-3 border-b border-border">
          <h2 className="text-sm font-semibold uppercase tracking-wider">Teslimat Adresi</h2>
        </div>
        <div className="p-5 grid grid-cols-2 gap-4">
          <div>
            <label className={labelClass}>Ülke</label>
            <input name="Country" value={formData.Country} placeholder="Ülke" required onChange={handleChange} className={inputClass} />
          </div>
          <div>
            <label className={labelClass}>Şehir</label>
            <input name="City" value={formData.City} placeholder="Şehir" required onChange={handleChange} className={inputClass} />
          </div>
          <div>
            <label className={labelClass}>İlçe / Bölge</label>
            <input name="State" value={formData.State} placeholder="İlçe / Bölge" required onChange={handleChange} className={inputClass} />
          </div>
          <div>
            <label className={labelClass}>Posta Kodu</label>
            <input name="ZipCode" value={formData.ZipCode} placeholder="Posta Kodu" required onChange={handleChange} className={inputClass} />
          </div>
          <div className="col-span-2">
            <label className={labelClass}>Açık Adres</label>
            <input name="AddressLine" value={formData.AddressLine} placeholder="Sokak, No, Daire" required onChange={handleChange} className={inputClass} />
          </div>
        </div>
      </div>

      <div className="border border-border rounded-2xl overflow-hidden">
        <div className="bg-muted/30 px-5 py-3 border-b border-border">
          <h2 className="text-sm font-semibold uppercase tracking-wider">Fatura</h2>
        </div>
        <div className="space-y-4 p-5">
          <div className="flex flex-wrap gap-3">
            {([{ value: "individual", label: "Bireysel" }, { value: "corporate", label: "Kurumsal" }] as const).map((opt) => (
              <label key={opt.value} className={`flex cursor-pointer items-center gap-2 rounded-xl border px-4 py-3 text-sm transition ${invoiceType === opt.value ? "border-foreground bg-muted/40" : "border-border hover:border-gray-300"}`}>
                <input type="radio" name="invoiceType" checked={invoiceType === opt.value} onChange={() => setInvoiceType(opt.value)} />
                {opt.label}
              </label>
            ))}
          </div>

          {invoiceType === "individual" ? (
            <div>
              <label className={labelClass}>TC Kimlik No (opsiyonel)</label>
              <input value={taxId} onChange={(e) => setTaxId(e.target.value)} placeholder="11 haneli TC kimlik" maxLength={11} className={inputClass} />
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <label className={labelClass}>Firma Adı</label>
                <input value={companyName} onChange={(e) => setCompanyName(e.target.value)} placeholder="Şirket ünvanı" required className={inputClass} />
              </div>
              <div>
                <label className={labelClass}>VKN</label>
                <input value={taxId} onChange={(e) => setTaxId(e.target.value)} placeholder="Vergi kimlik no" required maxLength={11} className={inputClass} />
              </div>
              <div>
                <label className={labelClass}>Vergi Dairesi</label>
                <input value={taxOffice} onChange={(e) => setTaxOffice(e.target.value)} placeholder="Vergi dairesi" required className={inputClass} />
              </div>
            </div>
          )}

          <label className="flex items-start gap-3 text-sm">
            <input type="checkbox" checked={billingSameAsShipping} onChange={(e) => setBillingSameAsShipping(e.target.checked)} className="mt-1" />
            <span>Fatura adresi teslimat adresi ile aynı</span>
          </label>

          {!billingSameAsShipping && (
            <div className="grid grid-cols-2 gap-4 border-t border-border pt-4">
              <div>
                <label className={labelClass}>Ülke</label>
                <input name="BillingCountry" value={billingForm.BillingCountry} onChange={handleBillingChange} required className={inputClass} />
              </div>
              <div>
                <label className={labelClass}>Şehir</label>
                <input name="BillingCity" value={billingForm.BillingCity} onChange={handleBillingChange} required className={inputClass} />
              </div>
              <div>
                <label className={labelClass}>İlçe / Bölge</label>
                <input name="BillingState" value={billingForm.BillingState} onChange={handleBillingChange} required className={inputClass} />
              </div>
              <div>
                <label className={labelClass}>Posta Kodu</label>
                <input name="BillingZipCode" value={billingForm.BillingZipCode} onChange={handleBillingChange} required className={inputClass} />
              </div>
              <div className="col-span-2">
                <label className={labelClass}>Açık Adres</label>
                <input name="BillingAddressLine" value={billingForm.BillingAddressLine} onChange={handleBillingChange} required className={inputClass} />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );

  const renderStep2 = () => (
    <div className="space-y-6">
      {shippingOptions.length > 0 && (
        <div className="border border-border rounded-2xl overflow-hidden">
          <div className="bg-muted/30 px-5 py-3 border-b border-border">
            <h2 className="text-sm font-semibold uppercase tracking-wider">Kargo</h2>
          </div>
          <div className="space-y-3 p-5">
            {shippingOptions.map((option) => (
              <label key={option.carrierId} className={`flex cursor-pointer items-start gap-3 rounded-xl border p-4 transition ${selectedCarrierId === option.carrierId ? "border-foreground bg-muted/40" : "border-border hover:border-gray-300"}`}>
                <input type="radio" name="shippingCarrier" className="mt-1" checked={selectedCarrierId === option.carrierId} onChange={() => setSelectedCarrierId(option.carrierId)} />
                <span className="flex flex-1 items-start justify-between gap-3 text-sm">
                  <span>
                    <span className="font-medium">{option.carrierName}</span>
                    <span className="mt-1 block text-muted-foreground">Tahmini {option.estimatedDays} gün{option.note ? ` · ${option.note}` : ""}</span>
                  </span>
                  <span className="shrink-0 font-medium">{option.isFree || option.price <= 0 ? "Ücretsiz" : formatPrice(option.price)}</span>
                </span>
              </label>
            ))}
          </div>
        </div>
      )}

      <div className="border border-border rounded-2xl overflow-hidden">
        <div className="bg-muted/30 px-5 py-3 border-b border-border">
          <h2 className="text-sm font-semibold uppercase tracking-wider">Ödeme Yöntemi</h2>
        </div>
        <div className="space-y-3 p-5">
          {([
            { value: "card" as const, label: "Kredi / Banka Kartı", hint: "Ödeme simüle edilir; kart verisi toplanmaz." },
            { value: "bank_transfer" as const, label: "Havale / EFT", hint: "Sipariş sonrası banka bilgileri gösterilir." },
            { value: "cash_on_delivery" as const, label: "Kapıda Ödeme", hint: "Kapıda ek ücret uygulanabilir." },
          ]).map((opt) => (
            <label key={opt.value} className={`flex cursor-pointer gap-3 rounded-xl border p-4 transition ${paymentMethod === opt.value ? "border-foreground bg-muted/40" : "border-border hover:border-gray-300"}`}>
              <input type="radio" name="paymentMethod" className="mt-1" checked={paymentMethod === opt.value} onChange={() => setPaymentMethod(opt.value)} />
              <span className="text-sm">
                <span className="font-medium">{opt.label}</span>
                <span className="mt-1 block text-muted-foreground">{opt.hint}</span>
              </span>
            </label>
          ))}

          {paymentMethod === "bank_transfer" && (
            <div className="rounded-xl border border-border bg-muted/30 p-4 text-sm space-y-1">
              <p className="font-medium">Banka bilgileri</p>
              <p>IBAN: <span className="font-mono">TR00 0000 0000 0000 0000 0000 00</span></p>
              <p>Alıcı: Yıldırım Store</p>
              <p className="text-muted-foreground">Açıklamaya sipariş numaranızı yazın.</p>
            </div>
          )}

          {paymentMethod === "cash_on_delivery" && (
            <p className="text-xs text-muted-foreground rounded-xl border border-border bg-muted/20 px-4 py-3">
              Kapıda ödeme seçildiğinde kargo firması ek ücret talep edebilir.
            </p>
          )}
        </div>
      </div>

      <div className="border border-border rounded-2xl overflow-hidden">
        <div className="bg-muted/30 px-5 py-3 border-b border-border">
          <h2 className="text-sm font-semibold uppercase tracking-wider">Kupon Kodu</h2>
        </div>
        <div className="p-5 space-y-3">
          <div className="flex gap-2">
            <input value={couponInput} onChange={(e) => setCouponInput(e.target.value)} placeholder="Kupon kodu" disabled={Boolean(appliedCoupon)} className={`${inputClass} flex-1`} />
            {appliedCoupon ? (
              <button type="button" onClick={() => void clearCoupon()} className="h-11 shrink-0 rounded-lg border border-border px-4 text-sm font-medium transition hover:border-foreground">Kaldır</button>
            ) : (
              <button type="button" onClick={() => void applyCoupon()} disabled={summaryLoading} className="h-11 shrink-0 rounded-lg bg-foreground px-4 text-sm font-medium text-white transition hover:bg-gray-800 disabled:opacity-50">Uygula</button>
            )}
          </div>
          {couponMessage && (
            <p className={`text-xs ${appliedCoupon ? "text-success" : "text-muted-foreground"}`}>{couponMessage}</p>
          )}
        </div>
      </div>
    </div>
  );

  const renderStep3 = () => (
    <div className="space-y-6">
      <div className="border border-border rounded-2xl overflow-hidden">
        <div className="bg-muted/30 px-5 py-3 border-b border-border">
          <h2 className="text-sm font-semibold uppercase tracking-wider">Teslimat Özeti</h2>
        </div>
        <div className="p-5 space-y-2 text-sm">
          <p><span className="text-muted-foreground">Ad Soyad:</span> {formData.FirstName} {formData.LastName}</p>
          <p><span className="text-muted-foreground">E-posta:</span> {email}</p>
          <p><span className="text-muted-foreground">Adres:</span> {formData.AddressLine}, {formData.State} / {formData.City}</p>
          <p><span className="text-muted-foreground">Ödeme:</span> {paymentMethod === "card" ? "Kredi / Banka Kartı" : paymentMethod === "bank_transfer" ? "Havale / EFT" : "Kapıda Ödeme"}</p>
        </div>
      </div>

      <div className="border border-border rounded-2xl overflow-hidden">
        <div className="bg-muted/30 px-5 py-3 border-b border-border">
          <h2 className="text-sm font-semibold uppercase tracking-wider">Sipariş Notu & Hediye</h2>
        </div>
        <div className="p-5 space-y-4">
          <div>
            <label className={labelClass}>Sipariş Notu (opsiyonel)</label>
            <textarea
              value={orderNote}
              onChange={(e) => setOrderNote(e.target.value)}
              placeholder="Teslimat ile ilgili notunuz..."
              maxLength={500}
              rows={3}
              className="w-full px-4 py-3 rounded-lg border border-border bg-white text-sm placeholder:text-muted-foreground focus:outline-none focus:border-foreground focus:ring-1 focus:ring-foreground transition resize-none"
            />
          </div>

          <label className="flex items-center gap-3 text-sm cursor-pointer">
            <input type="checkbox" checked={giftWrap} onChange={(e) => setGiftWrap(e.target.checked)} />
            <Gift className="h-4 w-4 text-muted-foreground" />
            <span className="font-medium">Hediye paketi istiyorum</span>
          </label>

          {giftWrap && (
            <div>
              <label className={labelClass}>Hediye Mesajı (opsiyonel)</label>
              <textarea
                value={giftMessage}
                onChange={(e) => setGiftMessage(e.target.value)}
                placeholder="Hediye kartına yazılacak mesaj..."
                maxLength={250}
                rows={2}
                className="w-full px-4 py-3 rounded-lg border border-border bg-white text-sm placeholder:text-muted-foreground focus:outline-none focus:border-foreground focus:ring-1 focus:ring-foreground transition resize-none"
              />
            </div>
          )}
        </div>
      </div>

      <div className="space-y-3 rounded-2xl border border-border p-5 text-sm">
        <label className="flex items-start gap-3">
          <input type="checkbox" checked={acceptKvkk} onChange={(e) => setAcceptKvkk(e.target.checked)} className="mt-1" required />
          <span>
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setLegalModal("kvkk");
              }}
              className="font-medium underline underline-offset-2 hover:text-foreground"
            >
              KVKK aydınlatma metnini
            </button>{" "}
            okudum ve kabul ediyorum.
          </span>
        </label>
        <label className="flex items-start gap-3">
          <input type="checkbox" checked={acceptMesafeli} onChange={(e) => setAcceptMesafeli(e.target.checked)} className="mt-1" required />
          <span>
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setLegalModal("mesafeli");
              }}
              className="font-medium underline underline-offset-2 hover:text-foreground"
            >
              Mesafeli satış sözleşmesini
            </button>{" "}
            okudum ve kabul ediyorum.
          </span>
        </label>
      </div>
    </div>
  );

  return (
    <main className="bg-white text-gray-900">
      <Header />

      <div className="max-w-[1600px] mx-auto px-6 md:px-12 py-8">
        <nav className="mb-6 flex items-center gap-1.5 text-sm text-gray-500">
          <Link href="/" className="transition-colors hover:text-gray-900">Anasayfa</Link>
          <ChevronRight className="h-3.5 w-3.5" />
          <Link href="/cart" className="transition-colors hover:text-gray-900">Sepetim</Link>
          <ChevronRight className="h-3.5 w-3.5" />
          <span className="font-medium text-gray-900">Ödeme</span>
        </nav>

        <h1 className="font-display mb-4 text-3xl font-bold md:text-4xl">Ödeme</h1>

        {isGuest && !authLoading && (
          <div className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border bg-muted/30 px-5 py-4 text-sm">
            <p>
              <span className="font-medium">Üye olmadan devam ediyorsunuz.</span>{" "}
              <span className="text-muted-foreground">Siparişinizi e-posta ile takip edebilirsiniz.</span>
            </p>
            <Link href="/login" className="rounded-lg border border-border bg-white px-4 py-2 text-sm font-medium transition hover:border-foreground">Giriş yap</Link>
          </div>
        )}

        {renderStepIndicator()}

        <form onSubmit={handleCheckout} className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2">
            {step === 1 && renderStep1()}
            {step === 2 && renderStep2()}
            {step === 3 && renderStep3()}

            <div className="flex gap-3 mt-6">
              {step > 1 && (
                <button type="button" onClick={goBack} className="px-6 py-3 border border-border rounded-lg text-sm font-medium hover:border-foreground transition">
                  Geri
                </button>
              )}
              {step < 3 && (
                <button type="button" onClick={goNext} className="px-6 py-3 bg-foreground text-white rounded-lg text-sm font-medium hover:bg-foreground/85 transition ml-auto">
                  Devam Et
                </button>
              )}
            </div>
          </div>

          <div className="lg:col-span-1">
            <div className="border border-border rounded-2xl overflow-hidden sticky top-24">
              <div className="bg-muted/30 px-5 py-3 border-b border-border">
                <h2 className="text-sm font-semibold uppercase tracking-wider">Sipariş Özeti</h2>
              </div>
              <div className="p-5 space-y-4">
                {items.length > 0 && (
                  <ul className="space-y-3">
                    {items.map((item) => (
                      <li key={`${item.productId}-${item.productName}`} className="flex gap-3 text-sm">
                        <span className="flex h-6 min-w-6 shrink-0 items-center justify-center rounded-full bg-muted text-[11px] font-medium">{item.quantity}</span>
                        <span className="line-clamp-2 flex-1 text-gray-600">{item.productName}</span>
                        <span className="font-medium">{formatPrice(item.price * item.quantity)}</span>
                      </li>
                    ))}
                  </ul>
                )}

                {threshold > 0 && (
                  <div className="space-y-2 rounded-xl border border-border bg-muted/20 p-3">
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>Ücretsiz kargo</span>
                      <span>{remainingForFree > 0 ? `${formatPrice(remainingForFree)} kaldı` : "Hak kazandınız"}</span>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-muted">
                      <div className="h-full rounded-full bg-foreground transition-all" style={{ width: `${freeShippingProgress}%` }} />
                    </div>
                  </div>
                )}

                <div className="space-y-2 border-t border-border pt-4 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Ara Toplam</span>
                    <span className="font-medium">{formatPrice(summary.subtotal)}</span>
                  </div>
                  {summary.discountAmount > 0 && (
                    <div className="flex justify-between text-success">
                      <span>İndirim{summary.appliedCouponCode ? ` (${summary.appliedCouponCode})` : summary.appliedCampaignName ? ` (${summary.appliedCampaignName})` : ""}</span>
                      <span className="font-medium">−{formatPrice(summary.discountAmount)}</span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Kargo</span>
                    <span className={`font-medium ${summary.freeShipping || summary.shippingCost <= 0 ? "text-success" : ""}`}>
                      {summary.freeShipping || summary.shippingCost <= 0 ? "Ücretsiz" : formatPrice(summary.shippingCost)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between border-t border-border pt-3">
                    <span className="font-semibold">Toplam</span>
                    <span className="text-xl font-bold">{summaryLoading ? "…" : formatPrice(summary.total)}</span>
                  </div>
                </div>

                <div className="flex items-center gap-3 p-3 rounded-xl bg-muted/50">
                  <ShieldCheck className="w-5 h-5 text-muted-foreground" strokeWidth={1.5} />
                  <div>
                    <p className="text-xs font-medium">Güvenli ödeme</p>
                    <p className="text-[10px] text-muted-foreground">Kart verisi işlenmez; sipariş seçtiğiniz yöntemle ilerler</p>
                  </div>
                </div>

                {step === 3 && (
                  <button
                    type="submit"
                    disabled={loading || items.length === 0 || !acceptKvkk || !acceptMesafeli || authLoading}
                    className="w-full py-3 bg-foreground text-white rounded-lg font-medium hover:bg-gray-800 transition disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {loading ? (
                      <>
                        <svg className="animate-spin w-4 h-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                        </svg>
                        Sipariş oluşturuluyor...
                      </>
                    ) : (
                      "Siparişi Tamamla"
                    )}
                  </button>
                )}
              </div>
            </div>
          </div>
        </form>
      </div>

      <LegalDocumentModal
        slug="kvkk"
        title="KVKK Aydınlatma Metni"
        open={legalModal === "kvkk"}
        onClose={() => setLegalModal(null)}
      />
      <LegalDocumentModal
        slug="mesafeli-satis-sozlesmesi"
        title="Mesafeli Satış Sözleşmesi"
        open={legalModal === "mesafeli"}
        onClose={() => setLegalModal(null)}
      />
    </main>
  );
}
