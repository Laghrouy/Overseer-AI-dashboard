"use client";

import { CheckCircle2, MessageSquare, Sparkles } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { apiDevFeedback } from "@/lib/api";
import { useAuthStore } from "@/store/auth";
import { CardContainer } from "../dashboard/ui";

const categories = [
  { value: "suggestion", label: "Proposition de changement" },
  { value: "bug", label: "Bug rencontré" },
  { value: "question", label: "Question d'usage" },
  { value: "autre", label: "Autre remarque" },
];

const PENDING_STORAGE_KEY = "overseer-dev-feedback-pending";

type ToastStatus = "success" | "error";

type ToastMessage = {
  type: ToastStatus;
  message: string;
};

export default function CommentairesDevPage() {
  const token = useAuthStore((state) => state.token);
  const [category, setCategory] = useState(categories[0].value);
  const [summary, setSummary] = useState("");
  const [details, setDetails] = useState("");
  const [repro, setRepro] = useState("");
  const [contact, setContact] = useState("");
  const [status, setStatus] = useState<"idle" | "sending" | "success" | "error">("idle");
  const [feedbackError, setFeedbackError] = useState<string | null>(null);
  const [toast, setToast] = useState<ToastMessage | null>(null);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!summary.trim() || !details.trim()) {
      setStatus("error");
      setFeedbackError(null);
      return;
    }

    if (!token) {
      setStatus("error");
      setFeedbackError("Connecte-toi pour envoyer un commentaire.");
      return;
    }

    setStatus("sending");
    setFeedbackError(null);
    try {
      await apiDevFeedback(token, {
        category,
        summary: summary.trim(),
        details: details.trim(),
        reproduction: repro.trim() || undefined,
        contact: contact.trim() || undefined,
      });
      await new Promise((resolve) => setTimeout(resolve, 900));
      setSummary("");
      setDetails("");
      setRepro("");
      setContact("");
      setCategory(categories[0].value);
      setStatus("success");
      setToast({ type: "success", message: "Commentaire envoyé, merci !" });
    } catch (error) {
      setStatus("error");
      const message = error instanceof Error ? error.message : "Impossible d'envoyer ton commentaire";
      setFeedbackError(message);
      setToast({ type: "error", message });
    }
  }

  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 4200);
      return () => clearTimeout(timer);
    }
    return undefined;
  }, [toast]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const stored = window.localStorage.getItem(PENDING_STORAGE_KEY);
    if (!stored) return;
    try {
      const parsed = JSON.parse(stored);
      if (parsed.summary) setSummary(parsed.summary);
      if (parsed.details) setDetails(parsed.details);
      if (parsed.category) setCategory(parsed.category);
      if (parsed.reproduction) setRepro(parsed.reproduction);
      if (parsed.contact) setContact(parsed.contact);
    } catch (error) {
      window.localStorage.removeItem(PENDING_STORAGE_KEY);
    }
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const payload = { category, summary, details, reproduction: repro, contact };
    window.localStorage.setItem(PENDING_STORAGE_KEY, JSON.stringify(payload));
  }, [category, summary, details, repro, contact]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (status === "success") {
      window.localStorage.removeItem(PENDING_STORAGE_KEY);
    }
  }, [status]);

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,2fr)_320px]">
      <div className="space-y-6">
        <CardContainer title="Commentaires dev" icon={<Sparkles className="h-5 w-5 text-fuchsia-600" />}>
          <p className="text-sm text-slate-700">
            Tu peux ici me faire part d'idées pour optimiser Overseer ou me signaler des bugs persistants. Chaque retour est analysé dès que j'ai un moment, même si je ne réponds pas immédiatement à tout le monde.
          </p>
          <ul className="space-y-2 text-xs text-slate-500">
            <li className="flex items-start gap-2">
              <Sparkles className="mt-0.5 h-4 w-4 text-fuchsia-500" />
              <span>Indique clairement le bénéfice attendu ou le contexte d'usage dans ta proposition.</span>
            </li>
            <li className="flex items-start gap-2">
              <MessageSquare className="mt-0.5 h-4 w-4 text-sky-500" />
              <span>Pour un bug, donne un maximum d'informations (étapes, captures, navigateur, heure).</span>
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle2 className="mt-0.5 h-4 w-4 text-emerald-500" />
              <span>Ajoute un email ou un lien de contact si tu veux que je puisse te répondre.</span>
            </li>
          </ul>
        </CardContainer>
        <CardContainer title="Comment je traite les retours" icon={<CheckCircle2 className="h-5 w-5 text-emerald-600" />}>
          <p className="text-sm text-slate-700">
            Les signalements sont revue une fois par semaine, et les propositions d'amélioration sont priorisées en fonction de leur impact sur ta productivité.
          </p>
          <div className="mt-4 grid gap-3 text-xs text-slate-500 md:grid-cols-3">
            <div className="rounded-xl border p-3">
              <p className="font-semibold text-slate-900">Analyse</p>
              <p>Je relis tes retours pour comprendre l'origine et le besoin.</p>
            </div>
            <div className="rounded-xl border p-3">
              <p className="font-semibold text-slate-900">Plan</p>
              <p>Si c'est faisable rapidement, je l'implémente, sinon je note la priorité.</p>
            </div>
            <div className="rounded-xl border p-3">
              <p className="font-semibold text-slate-900">Retour</p>
              <p>Je te redis si j'ai besoin de précisions ou quand la fonctionnalité arrive.</p>
            </div>
          </div>
        </CardContainer>
      </div>

      <CardContainer title="Envoyer un commentaire" icon={<MessageSquare className="h-5 w-5 text-amber-600" />}>
        <form className="space-y-4" onSubmit={handleSubmit}>
          {status === "success" && (
            <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">Merci, j'ai bien reçu ton message.</div>
          )}
          {status === "error" && (
            <div className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">
              {feedbackError ?? "Merci de vérifier que tu as bien rempli le titre et les détails."}
            </div>
          )}
          {!token && (
            <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
              Tu dois être connecté pour envoyer un commentaire.
            </div>
          )}
          <div className="rounded-lg border border-slate-200 bg-slate-100/60 p-3 text-xs text-slate-600">
            Les champs sont sauvegardés localement tant que tu n'as pas validé le formulaire.
          </div>
          <label className="text-xs font-semibold text-slate-600">
            Catégorie
            <select
              value={category}
              onChange={(event) => setCategory(event.target.value)}
              className="mt-1 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 focus:border-slate-400"
            >
              {categories.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
          <label className="text-xs font-semibold text-slate-600">
            Résumé rapide
            <input
              value={summary}
              onChange={(event) => setSummary(event.target.value)}
              placeholder="Concis, en une phrase"
              className="mt-1 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 focus:border-slate-400"
            />
          </label>
          <label className="text-xs font-semibold text-slate-600">
            Détails
            <textarea
              value={details}
              onChange={(event) => setDetails(event.target.value)}
              placeholder="Décris le comportement ou ta remise en question"
              rows={4}
              className="mt-1 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 focus:border-slate-400"
            />
          </label>
          <label className="text-xs font-semibold text-slate-600">
            Étapes pour reproduire/explication complémentaire
            <textarea
              value={repro}
              onChange={(event) => setRepro(event.target.value)}
              placeholder="Facultatif mais très utile"
              rows={3}
              className="mt-1 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 focus:border-slate-400"
            />
          </label>
          <label className="text-xs font-semibold text-slate-600">
            Ton contact (email, slack, etc.)
            <input
              value={contact}
              onChange={(event) => setContact(event.target.value)}
              placeholder="Facultatif"
              className="mt-1 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 focus:border-slate-400"
            />
          </label>
          <button
            type="submit"
            disabled={status === "sending" || !token}
            className="w-full rounded-lg border border-slate-200 bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:-translate-y-0.5 hover:shadow-lg disabled:cursor-wait disabled:opacity-60"
          >
            {status === "sending" ? "Transmission..." : "Envoyer le commentaire"}
          </button>
        </form>
      </CardContainer>
      <Link
        href="/admin/dev-comments"
        className="mt-4 inline-flex items-center justify-center rounded-full border border-slate-300 px-4 py-2 text-xs font-semibold text-slate-700 transition hover:border-slate-400 hover:text-slate-900"
      >
        Voir l'administration des commentaires
      </Link>
      {toast && <NotificationToast toast={toast} />}
    </div>
  );
}

function NotificationToast({ toast }: { toast: ToastMessage }) {
  const bg = toast.type === "success" ? "bg-emerald-600" : "bg-rose-600";
  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-6 flex justify-center">
      <div className={`${bg} rounded-full px-5 py-2 text-sm font-semibold text-white shadow-lg`}>{toast.message}</div>
    </div>
  );
}
