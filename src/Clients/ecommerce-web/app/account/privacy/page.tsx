"use client";

import { useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { exportUserData, deleteAccount } from "@/lib/client-api";
import { Download, Trash2, ShieldAlert } from "lucide-react";
import { notify } from "@/lib/feedback";

export default function PrivacyPage() {
  const { user, logout } = useAuth();
  const [exporting, setExporting] = useState(false);
  const [deleteStep, setDeleteStep] = useState<0 | 1 | 2>(0);
  const [deleting, setDeleting] = useState(false);
  const [confirmText, setConfirmText] = useState("");

  const handleExport = async () => {
    setExporting(true);
    try {
      const data = await exportUserData();
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `verim-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
      notify.success("Verileriniz indirildi.");
    } catch {
      notify.error("Veri dışa aktarılamadı.");
    } finally {
      setExporting(false);
    }
  };

  const handleDelete = async () => {
    if (confirmText !== "HESABIMI SIL") {
      notify.error("Onay metnini tam olarak yazın.");
      return;
    }
    setDeleting(true);
    try {
      await deleteAccount();
      notify.success("Hesabınız silindi.");
      logout();
    } catch {
      notify.error("Hesap silinemedi.");
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-border overflow-hidden">
        <div className="bg-muted/30 px-5 py-4 border-b border-border flex items-center gap-3">
          <Download className="h-5 w-5" />
          <h2 className="text-sm font-semibold uppercase tracking-wider">Verilerimi İndir</h2>
        </div>
        <div className="p-5 space-y-3">
          <p className="text-sm text-muted-foreground">
            Profil bilgilerinizi, adreslerinizi ve bildirim tercihlerinizi JSON formatında indirin.
          </p>
          <button
            onClick={() => void handleExport()}
            disabled={exporting}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-foreground text-white rounded-lg text-sm font-medium hover:bg-foreground/85 transition disabled:opacity-50"
          >
            <Download className="h-4 w-4" />
            {exporting ? "İndiriliyor..." : "Verileri İndir"}
          </button>
        </div>
      </div>

      <div className="rounded-2xl border border-red-200 overflow-hidden">
        <div className="bg-red-50 px-5 py-4 border-b border-red-200 flex items-center gap-3">
          <ShieldAlert className="h-5 w-5 text-red-500" />
          <h2 className="text-sm font-semibold uppercase tracking-wider text-red-700">Hesabı Sil</h2>
        </div>
        <div className="p-5 space-y-4">
          {deleteStep === 0 && (
            <>
              <p className="text-sm text-muted-foreground">
                Hesabınızı silmek geri alınamaz bir işlemdir. Kişisel verileriniz anonim hale getirilir.
              </p>
              <button
                onClick={() => setDeleteStep(1)}
                className="inline-flex items-center gap-2 px-5 py-2.5 border border-red-300 text-red-600 rounded-lg text-sm font-medium hover:bg-red-50 transition"
              >
                <Trash2 className="h-4 w-4" />
                Hesabımı Silmek İstiyorum
              </button>
            </>
          )}

          {deleteStep === 1 && (
            <>
              <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 space-y-2">
                <p className="font-medium">Bu işlem geri alınamaz!</p>
                <ul className="list-disc list-inside space-y-1 text-xs">
                  <li>E-posta ve ad-soyad bilgileriniz anonimleştirilir</li>
                  <li>Adresleriniz ve bildirim tercihleriniz silinir</li>
                  <li>Oturumunuz sonlandırılır ve tekrar giriş yapamazsınız</li>
                  <li>Mevcut siparişleriniz etkilenmez</li>
                </ul>
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => setDeleteStep(0)}
                  className="px-4 py-2 border border-border rounded-lg text-sm font-medium hover:border-foreground transition"
                >
                  Vazgeç
                </button>
                <button
                  onClick={() => setDeleteStep(2)}
                  className="px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700 transition"
                >
                  Devam Et
                </button>
              </div>
            </>
          )}

          {deleteStep === 2 && (
            <>
              <p className="text-sm text-red-700 font-medium">
                Onaylamak için aşağıya <span className="font-mono">HESABIMI SIL</span> yazın:
              </p>
              <input
                value={confirmText}
                onChange={(e) => setConfirmText(e.target.value)}
                placeholder="HESABIMI SIL"
                className="w-full h-11 px-4 rounded-lg border border-red-300 bg-white text-sm placeholder:text-muted-foreground focus:outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500 transition"
              />
              <div className="flex gap-3">
                <button
                  onClick={() => { setDeleteStep(0); setConfirmText(""); }}
                  className="px-4 py-2 border border-border rounded-lg text-sm font-medium hover:border-foreground transition"
                >
                  Vazgeç
                </button>
                <button
                  onClick={() => void handleDelete()}
                  disabled={deleting || confirmText !== "HESABIMI SIL"}
                  className="px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700 transition disabled:opacity-50"
                >
                  {deleting ? "Siliniyor..." : "Hesabımı Kalıcı Olarak Sil"}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
