"use client";

import { useState } from "react";
import { API_URL } from "@/lib/api";
import { notify, parseApiError } from "@/lib/feedback";

export default function ContactForm() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSending(true);
    try {
      const res = await fetch(`${API_URL}/catalog/contact`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          email: email.trim(),
          phone: phone.trim() || null,
          subject: subject.trim(),
          message: message.trim(),
        }),
      });
      if (!res.ok) {
        throw new Error(parseApiError(await res.text(), "Mesaj gönderilemedi."));
      }
      const data = await res.json().catch(() => null);
      notify.success(data?.message ?? "Mesajınız alındı.");
      setName("");
      setEmail("");
      setPhone("");
      setSubject("");
      setMessage("");
    } catch (err) {
      notify.error(err instanceof Error ? err.message : "Mesaj gönderilemedi.");
    } finally {
      setSending(false);
    }
  };

  return (
    <form onSubmit={submit} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Adınız" required>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            className={inputClass}
          />
        </Field>
        <Field label="E-posta" required>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className={inputClass}
          />
        </Field>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Telefon">
          <input
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            className={inputClass}
          />
        </Field>
        <Field label="Konu" required>
          <input
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            required
            className={inputClass}
          />
        </Field>
      </div>
      <Field label="Mesajınız" required>
        <textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          required
          rows={6}
          className={`${inputClass} py-3`}
        />
      </Field>
      <button
        type="submit"
        disabled={sending}
        className="rounded-lg bg-foreground px-5 py-2.5 text-sm font-medium text-white transition hover:bg-gray-800 disabled:opacity-50"
      >
        {sending ? "Gönderiliyor..." : "Gönder"}
      </button>
    </form>
  );
}

const inputClass =
  "h-11 w-full rounded-lg border border-border px-4 text-sm focus:border-foreground focus:outline-none focus:ring-1 focus:ring-foreground";

function Field({
  label,
  required,
  children,
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-muted-foreground">
        {label}
        {required ? " *" : ""}
      </label>
      {children}
    </div>
  );
}
