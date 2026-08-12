"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  answerProductQuestion,
  deleteProductQuestion,
  getProductQuestions,
  moderateProductQuestion,
  type AdminProductQuestion,
} from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Check, MessageCircleQuestion, Trash2, X } from "lucide-react";
import { useState } from "react";
import toast from "react-hot-toast";

type Filter = "pending" | "unanswered" | "approved" | "all";

const FILTERS: { value: Filter; label: string }[] = [
  { value: "pending", label: "Onay bekleyenler" },
  { value: "unanswered", label: "Cevapsız" },
  { value: "approved", label: "Yayında" },
  { value: "all", label: "Tümü" },
];

const formatDate = (iso: string) =>
  new Date(iso).toLocaleString("tr-TR", { dateStyle: "short", timeStyle: "short" });

export default function QuestionsPage() {
  const queryClient = useQueryClient();
  const [filter, setFilter] = useState<Filter>("pending");
  const [answers, setAnswers] = useState<Record<string, string>>({});

  const queryParams =
    filter === "all"
      ? undefined
      : filter === "unanswered"
        ? { unanswered: true }
        : filter === "approved"
          ? { approved: true }
          : { approved: false };

  const { data: questions = [], isLoading } = useQuery({
    queryKey: ["product-questions", filter],
    queryFn: () => getProductQuestions(queryParams),
  });

  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: ["product-questions"] });

  const answer = useMutation({
    mutationFn: ({ id, text }: { id: string; text: string }) =>
      answerProductQuestion(id, text),
    onSuccess: () => {
      toast.success("Cevap kaydedildi ve soru yayınlandı.");
      invalidate();
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const moderate = useMutation({
    mutationFn: ({ id, isApproved }: { id: string; isApproved: boolean }) =>
      moderateProductQuestion(id, isApproved),
    onSuccess: () => {
      toast.success("Durum güncellendi.");
      invalidate();
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const remove = useMutation({
    mutationFn: (id: string) => deleteProductQuestion(id),
    onSuccess: () => {
      toast.success("Soru silindi.");
      invalidate();
    },
    onError: (error: Error) => toast.error(error.message),
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Ürün Soru &amp; Cevap</h1>
          <p className="text-sm text-muted-foreground">
            Müşteri sorularını yanıtlayın ve moderasyon yapın.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          {FILTERS.map((item) => (
            <Button
              key={item.value}
              variant={filter === item.value ? "default" : "outline"}
              size="sm"
              onClick={() => setFilter(item.value)}
            >
              {item.label}
            </Button>
          ))}
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageCircleQuestion className="h-5 w-5" />
            {questions.length} soru
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="py-10 text-center text-muted-foreground">Yükleniyor...</p>
          ) : questions.length === 0 ? (
            <p className="py-10 text-center text-muted-foreground">
              Bu filtrede soru bulunmuyor.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Ürün</TableHead>
                  <TableHead>Soru</TableHead>
                  <TableHead>Cevap</TableHead>
                  <TableHead>Durum</TableHead>
                  <TableHead className="text-right">İşlem</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {questions.map((q) => (
                  <QuestionRow
                    key={q.id}
                    question={q}
                    answerText={answers[q.id] ?? q.answer ?? ""}
                    onAnswerChange={(text) =>
                      setAnswers((prev) => ({ ...prev, [q.id]: text }))
                    }
                    onAnswer={() => {
                      const text = (answers[q.id] ?? q.answer ?? "").trim();
                      if (!text) {
                        toast.error("Cevap boş olamaz.");
                        return;
                      }
                      answer.mutate({ id: q.id, text });
                    }}
                    onModerate={(isApproved) =>
                      moderate.mutate({ id: q.id, isApproved })
                    }
                    onDelete={() => {
                      if (confirm("Bu soruyu silmek istiyor musunuz?")) {
                        remove.mutate(q.id);
                      }
                    }}
                  />
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function QuestionRow({
  question,
  answerText,
  onAnswerChange,
  onAnswer,
  onModerate,
  onDelete,
}: {
  question: AdminProductQuestion;
  answerText: string;
  onAnswerChange: (text: string) => void;
  onAnswer: () => void;
  onModerate: (isApproved: boolean) => void;
  onDelete: () => void;
}) {
  return (
    <TableRow>
      <TableCell className="max-w-[160px] truncate font-medium">
        {question.productName}
        <p className="text-xs text-muted-foreground">
          {question.userName} · {formatDate(question.createdAt)}
        </p>
      </TableCell>
      <TableCell className="max-w-[280px] text-sm">{question.question}</TableCell>
      <TableCell className="min-w-[220px]">
        <Textarea
          value={answerText}
          onChange={(e) => onAnswerChange(e.target.value)}
          rows={3}
          placeholder="Cevabınızı yazın..."
        />
        <Button size="sm" className="mt-2" onClick={onAnswer}>
          Kaydet &amp; Yayınla
        </Button>
      </TableCell>
      <TableCell>
        <span
          className={`rounded-full px-2 py-0.5 text-xs font-medium ${
            question.isApproved
              ? "bg-green-100 text-green-700"
              : "bg-amber-100 text-amber-700"
          }`}
        >
          {question.isApproved ? "Yayında" : "Bekliyor"}
        </span>
      </TableCell>
      <TableCell className="text-right">
        <div className="flex justify-end gap-1">
          {question.isApproved ? (
            <Button
              variant="outline"
              size="sm"
              onClick={() => onModerate(false)}
              title="Yayından kaldır"
            >
              <X className="h-4 w-4" />
            </Button>
          ) : (
            <Button size="sm" onClick={() => onModerate(true)} title="Onayla">
              <Check className="h-4 w-4" />
            </Button>
          )}
          <Button variant="outline" size="sm" onClick={onDelete} title="Sil">
            <Trash2 className="h-4 w-4 text-red-600" />
          </Button>
        </div>
      </TableCell>
    </TableRow>
  );
}
