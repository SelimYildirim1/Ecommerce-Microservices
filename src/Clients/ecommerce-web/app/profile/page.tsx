"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Header from "@/components/Header";
import AddressBook from "@/components/AddressBook";
import { Card, Field, INPUT } from "@/components/FormPrimitives";
import { useAuth } from "@/context/AuthContext";
import * as api from "@/lib/client-api";

type Tab = "profile" | "addresses" | "password";

const TABS: { id: Tab; label: string }[] = [
  { id: "profile", label: "Profil bilgileri" },
  { id: "addresses", label: "Adres defteri" },
  { id: "password", label: "Şifre değiştir" },
];

export default function ProfilePage() {
  const { user, isLoading: authLoading } = useAuth();
  const router = useRouter();
  const [tab, setTab] = useState<Tab>("profile");

  useEffect(() => {
    if (!authLoading && !user) router.push("/login");
  }, [authLoading, user, router]);

  return (
    <main className="bg-white text-foreground">
      <Header />

      <div className="max-w-[1600px] mx-auto px-6 md:px-12 py-8">
        <h1 className="font-display mb-8 text-3xl font-bold md:text-4xl">Hesabım</h1>

        <div className="flex flex-col lg:flex-row gap-6">
          <nav className="w-full lg:w-56 shrink-0 space-y-1">
            {TABS.map((item) => (
              <button
                key={item.id}
                onClick={() => setTab(item.id)}
                className={`w-full text-left px-4 py-2.5 rounded-lg text-sm transition
                  ${tab === item.id
                    ? "bg-foreground text-white font-medium"
                    : "hover:bg-muted"
                  }`}
              >
                {item.label}
              </button>
            ))}
            <Link
              href="/orders"
              className="block px-4 py-2.5 rounded-lg text-sm hover:bg-muted transition"
            >
              Siparişlerim
            </Link>
            <Link
              href="/favorites"
              className="block px-4 py-2.5 rounded-lg text-sm hover:bg-muted transition"
            >
              Favorilerim
            </Link>
          </nav>

          <section className="flex-1 min-w-0">
            {tab === "profile" && <ProfileForm />}
            {tab === "addresses" && <AddressBook />}
            {tab === "password" && <PasswordForm />}
          </section>
        </div>
      </div>

    </main>
  );
}

function ProfileForm() {
  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    phoneNumber: "",
    email: "",
    userName: "",
    createdAt: "",
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const profile = await api.getProfile();
      setForm({
        firstName: profile.firstName ?? "",
        lastName: profile.lastName ?? "",
        phoneNumber: profile.phoneNumber ?? "",
        email: profile.email,
        userName: profile.userName,
        createdAt: profile.createdAt,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Profil yüklenemedi.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setNotice(null);
    setError(null);

    try {
      await api.updateProfile({
        firstName: form.firstName,
        lastName: form.lastName,
        phoneNumber: form.phoneNumber,
      });
      setNotice("Profil bilgileriniz güncellendi.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Güncelleme başarısız.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <Skeleton />;

  return (
    <Card title="Profil bilgileri">
      <form onSubmit={submit} className="space-y-4 max-w-lg">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="Ad">
            <input
              value={form.firstName}
              onChange={(e) => setForm({ ...form, firstName: e.target.value })}
              className={INPUT}
            />
          </Field>
          <Field label="Soyad">
            <input
              value={form.lastName}
              onChange={(e) => setForm({ ...form, lastName: e.target.value })}
              className={INPUT}
            />
          </Field>
        </div>

        <Field label="Telefon">
          <input
            value={form.phoneNumber}
            onChange={(e) => setForm({ ...form, phoneNumber: e.target.value })}
            placeholder="5xx xxx xx xx"
            className={INPUT}
          />
        </Field>

        <Field label="E-posta">
          <input value={form.email} disabled className={`${INPUT} bg-muted/50 text-muted-foreground`} />
        </Field>

        <Field label="Kullanıcı adı">
          <input value={form.userName} disabled className={`${INPUT} bg-muted/50 text-muted-foreground`} />
        </Field>

        {form.createdAt && (
          <p className="text-xs text-muted-foreground">
            Üyelik tarihi: {new Date(form.createdAt).toLocaleDateString("tr-TR")}
          </p>
        )}

        {error && <p className="text-sm text-danger">{error}</p>}
        {notice && <p className="text-sm text-success">{notice}</p>}

        <button
          type="submit"
          disabled={saving}
          className="px-5 py-2.5 rounded-lg bg-foreground text-white text-sm font-medium hover:bg-gray-800 disabled:opacity-50 transition"
        >
          {saving ? "Kaydediliyor..." : "Kaydet"}
        </button>
      </form>
    </Card>
  );
}

function PasswordForm() {
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setNotice(null);
    setError(null);

    if (next !== confirm) {
      setError("Yeni şifreler eşleşmiyor.");
      return;
    }

    setSaving(true);
    try {
      await api.changePassword({ currentPassword: current, newPassword: next });
      setCurrent("");
      setNext("");
      setConfirm("");
      setNotice("Şifreniz güncellendi.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Şifre değiştirilemedi.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card title="Şifre değiştir">
      <form onSubmit={submit} className="space-y-4 max-w-md">
        <Field label="Mevcut şifre">
          <input
            type="password"
            value={current}
            onChange={(e) => setCurrent(e.target.value)}
            required
            className={INPUT}
          />
        </Field>
        <Field label="Yeni şifre">
          <input
            type="password"
            value={next}
            onChange={(e) => setNext(e.target.value)}
            required
            minLength={6}
            className={INPUT}
          />
        </Field>
        <Field label="Yeni şifre (tekrar)">
          <input
            type="password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            required
            minLength={6}
            className={INPUT}
          />
        </Field>

        {error && <p className="text-sm text-danger">{error}</p>}
        {notice && <p className="text-sm text-success">{notice}</p>}

        <button
          type="submit"
          disabled={saving}
          className="px-5 py-2.5 rounded-lg bg-foreground text-white text-sm font-medium hover:bg-gray-800 disabled:opacity-50 transition"
        >
          {saving ? "Güncelleniyor..." : "Şifreyi değiştir"}
        </button>
      </form>
    </Card>
  );
}

function Skeleton() {
  return <div className="h-80 rounded-lg bg-muted/50 animate-pulse" />;
}
