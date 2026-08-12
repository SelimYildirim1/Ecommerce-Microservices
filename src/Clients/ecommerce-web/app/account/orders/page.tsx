"use client";

import OrdersList from "@/components/account/OrdersList";

export default function AccountOrdersPage() {
  return (
    <div>
      <h2 className="mb-6 text-xl font-semibold">Siparişlerim</h2>
      <OrdersList />
    </div>
  );
}
