"use client";

import { useRef, useState } from "react";
import Image from "next/image";
import toast from "react-hot-toast";
import { resolveImageUrl, uploadImage, type ProductImagePayload } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Upload,
  Star,
  Trash2,
  ArrowLeft,
  ArrowRight,
  Loader2,
  Link as LinkIcon,
} from "lucide-react";

interface Props {
  images: ProductImagePayload[];
  onChange: (images: ProductImagePayload[]) => void;
}

/** Coklu urun gorseli yonetimi: yukleme, URL ekleme, siralama, birincil secimi. */
export function ImageManager({ images, onChange }: Props) {
  const fileInput = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [manualUrl, setManualUrl] = useState("");

  const normalize = (list: ProductImagePayload[]): ProductImagePayload[] => {
    const withOrder = list.map((img, index) => ({ ...img, sortOrder: index }));
    if (withOrder.length > 0 && !withOrder.some((i) => i.isPrimary)) {
      withOrder[0].isPrimary = true;
    }
    return withOrder;
  };

  const append = (urls: string[]) => {
    const existing = new Set(images.map((i) => i.url));
    const fresh = urls
      .filter((url) => !existing.has(url))
      .map((url) => ({ url, isPrimary: false, sortOrder: 0 }));

    if (fresh.length === 0) return;
    onChange(normalize([...images, ...fresh]));
  };

  const handleFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return;

    setUploading(true);
    try {
      const results = await Promise.all(Array.from(files).map(uploadImage));
      append(results.map((r) => r.url));
      toast.success(`${results.length} görsel yüklendi.`);
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setUploading(false);
      if (fileInput.current) fileInput.current.value = "";
    }
  };

  const addManualUrl = () => {
    const url = manualUrl.trim();
    if (!url) return;
    append([url]);
    setManualUrl("");
  };

  const remove = (index: number) =>
    onChange(normalize(images.filter((_, i) => i !== index)));

  const makePrimary = (index: number) =>
    onChange(images.map((img, i) => ({ ...img, isPrimary: i === index })));

  const move = (index: number, direction: -1 | 1) => {
    const target = index + direction;
    if (target < 0 || target >= images.length) return;

    const next = [...images];
    [next[index], next[target]] = [next[target], next[index]];
    onChange(normalize(next));
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <input
          ref={fileInput}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={(e) => handleFiles(e.target.files)}
        />
        <Button
          type="button"
          variant="outline"
          disabled={uploading}
          onClick={() => fileInput.current?.click()}
        >
          {uploading ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Upload className="mr-2 h-4 w-4" />
          )}
          {uploading ? "Yükleniyor..." : "Görsel Yükle"}
        </Button>

        <div className="flex flex-1 items-center gap-2 min-w-[240px]">
          <Input
            value={manualUrl}
            onChange={(e) => setManualUrl(e.target.value)}
            placeholder="veya görsel URL'i yapıştırın"
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                addManualUrl();
              }
            }}
          />
          <Button type="button" variant="secondary" onClick={addManualUrl}>
            <LinkIcon className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {images.length === 0 ? (
        <p className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
          Henüz görsel eklenmedi.
        </p>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {images.map((img, index) => (
            <div
              key={`${img.url}-${index}`}
              className="group relative overflow-hidden rounded-lg border bg-muted/30"
            >
              <div className="relative aspect-square">
                <Image
                  src={resolveImageUrl(img.url)}
                  alt={`Görsel ${index + 1}`}
                  fill
                  unoptimized
                  className="object-cover"
                />
              </div>

              {img.isPrimary && (
                <span className="absolute left-2 top-2 rounded bg-primary px-1.5 py-0.5 text-[10px] font-medium text-primary-foreground">
                  Birincil
                </span>
              )}

              <div className="flex items-center justify-between border-t bg-background/95 px-1 py-1">
                <div className="flex">
                  <button
                    type="button"
                    title="Sola al"
                    onClick={() => move(index, -1)}
                    className="rounded p-1 text-muted-foreground hover:bg-accent"
                  >
                    <ArrowLeft className="h-3.5 w-3.5" />
                  </button>
                  <button
                    type="button"
                    title="Sağa al"
                    onClick={() => move(index, 1)}
                    className="rounded p-1 text-muted-foreground hover:bg-accent"
                  >
                    <ArrowRight className="h-3.5 w-3.5" />
                  </button>
                </div>
                <div className="flex">
                  <button
                    type="button"
                    title="Birincil yap"
                    onClick={() => makePrimary(index)}
                    className="rounded p-1 text-muted-foreground hover:bg-accent"
                  >
                    <Star
                      className={`h-3.5 w-3.5 ${img.isPrimary ? "fill-current text-primary" : ""}`}
                    />
                  </button>
                  <button
                    type="button"
                    title="Kaldır"
                    onClick={() => remove(index)}
                    className="rounded p-1 text-muted-foreground hover:bg-accent hover:text-destructive"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
