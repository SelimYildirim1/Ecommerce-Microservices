"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  getEmailTemplates,
  previewEmailTemplate,
  updateEmailTemplate,
  type EmailTemplate,
} from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";

export default function EmailTemplatesPage() {
  const queryClient = useQueryClient();
  const { data: templates = [], isLoading } = useQuery({
    queryKey: ["email-templates"],
    queryFn: getEmailTemplates,
  });

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const selected = templates.find((t) => t.id === selectedId) ?? templates[0] ?? null;

  const [name, setName] = useState("");
  const [subject, setSubject] = useState("");
  const [bodyHtml, setBodyHtml] = useState("");
  const [isActive, setIsActive] = useState(true);
  const [previewVars, setPreviewVars] = useState<Record<string, string>>({});
  const [preview, setPreview] = useState<{ subject: string; bodyHtml: string } | null>(
    null,
  );

  useEffect(() => {
    if (!selectedId && templates[0]) setSelectedId(templates[0].id);
  }, [templates, selectedId]);

  useEffect(() => {
    if (!selected) return;
    setName(selected.name);
    setSubject(selected.subject);
    setBodyHtml(selected.bodyHtml);
    setIsActive(selected.isActive);
    setPreview(null);
    const vars: Record<string, string> = {};
    for (const v of selected.variables ?? []) {
      vars[v] =
        v === "OrderId"
          ? "11111111-1111-1111-1111-111111111111"
          : v === "OrderNumber"
            ? "YS-1001"
            : v === "Reason"
              ? "Yetersiz bakiye"
              : v === "TrackingNumber"
                ? "TR123456"
                : v === "Link"
                  ? "https://example.com/verify"
                  : `örnek-${v}`;
    }
    setPreviewVars(vars);
  }, [selected]);

  const variables = useMemo(() => selected?.variables ?? [], [selected]);

  const save = useMutation({
    mutationFn: () =>
      updateEmailTemplate(selected!.id, {
        name,
        subject,
        bodyHtml,
        variables,
        isActive,
      }),
    onSuccess: () => {
      toast.success("Şablon kaydedildi.");
      queryClient.invalidateQueries({ queryKey: ["email-templates"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const runPreview = useMutation({
    mutationFn: () => previewEmailTemplate(selected!.id, previewVars),
    onSuccess: (data) => setPreview(data),
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">E-posta Şablonları</h1>
        <p className="text-sm text-muted-foreground">
          Değişkenler {"{{OrderId}}"} biçiminde kullanılır. Boş bırakılan şablonlar kod
          fallback&apos;ine düşer.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[260px_1fr]">
        <Card>
          <CardHeader>
            <CardTitle>Şablonlar</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {isLoading ? (
              <p className="text-sm text-muted-foreground">Yükleniyor...</p>
            ) : (
              templates.map((t: EmailTemplate) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setSelectedId(t.id)}
                  className={`flex w-full flex-col rounded-md border px-3 py-2 text-left text-sm ${
                    selected?.id === t.id ? "border-primary bg-accent" : ""
                  }`}
                >
                  <span className="font-medium">{t.name}</span>
                  <span className="text-xs text-muted-foreground">{t.code}</span>
                </button>
              ))
            )}
          </CardContent>
        </Card>

        {!selected ? (
          <p className="text-muted-foreground">Şablon seçin.</p>
        ) : (
          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  {selected.code}
                  {!isActive && <Badge variant="secondary">Pasif</Badge>}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Ad</Label>
                  <Input value={name} onChange={(e) => setName(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Konu</Label>
                  <Input value={subject} onChange={(e) => setSubject(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>HTML gövde</Label>
                  <Textarea
                    rows={14}
                    value={bodyHtml}
                    onChange={(e) => setBodyHtml(e.target.value)}
                    className="font-mono text-xs"
                  />
                </div>
                <div className="flex flex-wrap gap-2">
                  <Label className="w-full">Değişkenler</Label>
                  {variables.length === 0 ? (
                    <span className="text-sm text-muted-foreground">Yok</span>
                  ) : (
                    variables.map((v) => (
                      <Badge key={v} variant="outline">
                        {`{{${v}}}`}
                      </Badge>
                    ))
                  )}
                </div>
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={isActive}
                    onChange={(e) => setIsActive(e.target.checked)}
                    className="h-4 w-4"
                  />
                  Aktif
                </label>
                <Button disabled={save.isPending} onClick={() => save.mutate()}>
                  Kaydet
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Önizleme</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid gap-3 md:grid-cols-2">
                  {variables.map((v) => (
                    <div key={v} className="space-y-1">
                      <Label>{v}</Label>
                      <Input
                        value={previewVars[v] ?? ""}
                        onChange={(e) =>
                          setPreviewVars((prev) => ({ ...prev, [v]: e.target.value }))
                        }
                      />
                    </div>
                  ))}
                </div>
                <Button
                  variant="outline"
                  disabled={runPreview.isPending}
                  onClick={() => runPreview.mutate()}
                >
                  Önizle
                </Button>
                {preview && (
                  <div className="rounded-md border p-4">
                    <p className="mb-3 text-sm font-semibold">{preview.subject}</p>
                    <div
                      className="prose prose-sm max-w-none"
                      dangerouslySetInnerHTML={{ __html: preview.bodyHtml }}
                    />
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}
