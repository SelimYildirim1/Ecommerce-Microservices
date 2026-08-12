"use client";

import { useParams } from "next/navigation";
import OrderDetailView from "@/components/account/OrderDetailView";

export default function AccountOrderDetailPage() {
  const params = useParams();
  const orderId = params.id as string;

  return <OrderDetailView orderId={orderId} />;
}
