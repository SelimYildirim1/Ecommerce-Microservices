import { redirect } from "next/navigation";

export default async function OrderDetailRedirectPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  redirect(`/account/orders/${id}`);
}
