"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { SETTING_GROUP_LABELS, getSettings, saveSettings } from "@/lib/api";
import type { SiteSetting } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Save } from "lucide-react";
import { useMemo, useState } from "react";
import toast from "react-hot-toast";

/** Uzun metin girisi isteyen ayarlar. */
const MULTILINE_KEYS = new Set([
  "site.description",
  "site.address",
  "seo.defaultDescription",
  "commerce.installmentRates",
  "commerce.transferAccounts",
]);

/** Acik/kapali secimi olan ayarlar. */
const BOOLEAN_KEYS = new Set(["commerce.pricesIncludeVat", "commerce.codEnabled"]);

export default function SettingsPage() {
  const queryClient = useQueryClient();

  const { data: settings = [], isLoading } = useQuery({
    queryKey: ["settings"],
    queryFn: () => getSettings(),
  });

  // Yalnizca degistirilen alanlar tutulur; gerisi sunucudan gelen degeri gosterir
  const [edits, setEdits] = useState<Record<string, string>>({});

  const valueOf = (setting: SiteSetting) => edits[setting.key] ?? setting.value ?? "";

  const groups = useMemo(() => {
    const map = new Map<string, SiteSetting[]>();

    for (const setting of settings) {
      const list = map.get(setting.group) ?? [];
      list.push(setting);
      map.set(setting.group, list);
    }

    return [...map.entries()];
  }, [settings]);

  const save = useMutation({
    mutationFn: (values: Record<string, string>) => saveSettings(values),
    onSuccess: () => {
      toast.success("Ayarlar kaydedildi.");
      setEdits({});
      queryClient.invalidateQueries({ queryKey: ["settings"] });
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const dirty = settings.some(
    (setting) => setting.key in edits && edits[setting.key] !== (setting.value ?? "")
  );

  if (isLoading) {
    return <p className="py-10 text-center text-muted-foreground">Yükleniyor...</p>;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Ayarlar</h1>
          <p className="text-sm text-muted-foreground">
            Site bilgileri, para birimi, KDV, kargo eşiği ve e-posta şablonları.
          </p>
        </div>

        <Button onClick={() => save.mutate(edits)} disabled={!dirty || save.isPending}>
          <Save className="mr-2 h-4 w-4" />
          Kaydet
        </Button>
      </div>

      {groups.length === 0 ? (
        <p className="py-10 text-center text-muted-foreground">Ayar bulunamadı.</p>
      ) : (
        <Tabs defaultValue={groups[0][0]}>
          <TabsList>
            {groups.map(([group]) => (
              <TabsTrigger key={group} value={group}>
                {SETTING_GROUP_LABELS[group] ?? group}
              </TabsTrigger>
            ))}
          </TabsList>

          {groups.map(([group, items]) => (
            <TabsContent key={group} value={group} className="mt-4">
              <Card>
                <CardHeader>
                  <CardTitle>{SETTING_GROUP_LABELS[group] ?? group}</CardTitle>
                </CardHeader>
                <CardContent className="grid gap-5 md:grid-cols-2">
                  {items.map((setting) => (
                    <SettingField
                      key={setting.key}
                      setting={setting}
                      value={valueOf(setting)}
                      onChange={(value) =>
                        setEdits((prev) => ({ ...prev, [setting.key]: value }))
                      }
                    />
                  ))}
                </CardContent>
              </Card>
            </TabsContent>
          ))}
        </Tabs>
      )}
    </div>
  );
}

function SettingField({
  setting,
  value,
  onChange,
}: {
  setting: SiteSetting;
  value: string;
  onChange: (value: string) => void;
}) {
  const label = setting.description || setting.key;

  if (BOOLEAN_KEYS.has(setting.key)) {
    const enabled = value === "true";

    return (
      <div className="space-y-2">
        <Label>{label}</Label>
        <div className="flex gap-2">
          <Button
            type="button"
            size="sm"
            variant={enabled ? "default" : "outline"}
            onClick={() => onChange("true")}
          >
            Evet
          </Button>
          <Button
            type="button"
            size="sm"
            variant={!enabled ? "default" : "outline"}
            onClick={() => onChange("false")}
          >
            Hayır
          </Button>
        </div>
        <p className="text-xs text-muted-foreground">{setting.key}</p>
      </div>
    );
  }

  if (MULTILINE_KEYS.has(setting.key)) {
    return (
      <div className="space-y-2 md:col-span-2">
        <Label htmlFor={setting.key}>{label}</Label>
        <Textarea
          id={setting.key}
          rows={3}
          value={value}
          onChange={(e) => onChange(e.target.value)}
        />
        <p className="text-xs text-muted-foreground">{setting.key}</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <Label htmlFor={setting.key}>{label}</Label>
      <Input id={setting.key} value={value} onChange={(e) => onChange(e.target.value)} />
      <p className="text-xs text-muted-foreground">{setting.key}</p>
    </div>
  );
}
