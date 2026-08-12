import { redirect } from "next/navigation";

/** Auth-aware yönlendirme middleware'de; burası fallback. */
export default function AdminRootPage() {
  redirect("/login");
}
