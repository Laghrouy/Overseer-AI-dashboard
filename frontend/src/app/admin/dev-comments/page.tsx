"use client";

import { Bug, Filter, Sparkles } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { apiDevFeedbackList, DevFeedbackPayload } from "@/lib/api";
import { useAuthStore } from "@/store/auth";
import { ActionButton, CardContainer } from "../../dashboard/ui";

type Counts = Record<DevFeedbackPayload["category"], number> & { all: number };

const categoryOptions: Array<{ label: string; value: DevFeedbackPayload["category"] }> = [
  { label: "Propositions", value: "suggestion" },
  { label: "Bugs", value: "bug" },
  { label: "Questions", value: "question" },
  { label: "Autres", value: "autre" },
];

const filterOptions: Array<{ label: string; value: DevFeedbackPayload["category"] | "" }> = [
  { label: "Tous les retours", value: "" },
  ...categoryOptions,
];

export default function AdminDevCommentsPage() {
  const token = useAuthStore((state) => state.token);
  const [categoryFilter, setCategoryFilter] = useState<DevFeedbackPayload["category"] | "">("");
  const [searchTerm, setSearchTerm] = useState("");

  const {
    data: comments = [],
    isLoading,
    isError,
    refetch,
  } = useQuery({
    queryKey: ["dev-feedback-comments", token, categoryFilter],
    queryFn: () => apiDevFeedbackList(token!, categoryFilter || undefined),
    enabled: Boolean(token),
    staleTime: 60 * 1000,
  });

  const visibleComments = useMemo(() => {
    const normalized = searchTerm.trim().toLowerCase();
    if (!normalized) return comments;
    return comments.filter((comment) => {
      const haystack = `${comment.summary} ${comment.details} ${comment.reproduction ?? ""}`.toLowerCase();
      return haystack.includes(normalized);
    });
  }, [comments, searchTerm]);

  const counts = useMemo<Counts>(() => {
    return filterOptions.reduce((acc, option) => {
      if (!option.value) {
        acc.all = comments.length;
        return acc;
      }
      acc[option.value] = comments.filter((comment) => comment.category === option.value).length;
      return acc;
    }, { all: 0, suggestion: 0, bug: 0, question: 0, autre: 0 });
  }, [comments]);

  if (!token) {
    return (
      <div className="space-y-6">
        <CardContainer title="Administration des commentaires" icon={<Filter className="h-5 w-5 text-amber-500" />}>
          <p className="text-sm text-slate-700">
            Tu dois être connecté pour consulter les commentaires enregistrés.
            <Link href="/login" className="ml-1 font-semibold text-slate-900 underline">
              Se connecter
            </Link>
          </p>
        </CardContainer>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <CardContainer title="Administration des commentaires dev" icon={<Sparkles className="h-5 w-5 text-fuchsia-600" />}>
        <p className="text-sm text-slate-700">
          Chaque nouveau commentaire envoyé via le formulaire est conservé ici et trié selon la catégorie. Tu peux filtrer par type, relire les détails, et identifier rapidement les bugs prioritaires.
        </p>
        <div className="mt-4 flex flex-wrap items-center gap-3 text-[11px] text-slate-600">
          <span className="font-semibold">Retours enregistrés</span>
          <strong className="text-slate-900">{counts.all}</strong>
          <ActionButton label="Rafraîchir" onClick={() => refetch()} icon={<Filter className="h-4 w-4" />} />
        </div>
      </CardContainer>

      <CardContainer title="Filtres" icon={<Filter className="h-5 w-5 text-slate-600" />}>
        <div className="grid gap-3 md:grid-cols-2">
          <label className="text-xs font-semibold text-slate-600">
            Catégorie
            <select
              value={categoryFilter}
              onChange={(event) => setCategoryFilter(event.target.value as DevFeedbackPayload["category"] | "")}
              className="mt-1 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 focus:border-slate-400"
            >
              {filterOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
          <label className="text-xs font-semibold text-slate-600">
            Recherche
            <input
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              placeholder="Résumé, détail, reproduction..."
              className="mt-1 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 focus:border-slate-400"
            />
          </label>
        </div>
        <div className="mt-3 flex flex-wrap gap-2 text-[11px] text-slate-600">
          {categoryOptions.map((option) => (
            <span key={option.value} className="rounded-full border border-slate-200 px-3 py-1">
              {option.label} : {counts[option.value]}
            </span>
          ))}
        </div>
      </CardContainer>

      <CardContainer title="Fil de commentaires" icon={<Sparkles className="h-5 w-5 text-fuchsia-600" />}>
        {isLoading && <p className="text-sm text-slate-500">Chargement des commentaires...</p>}
        {isError && <p className="text-sm text-rose-600">Impossible de charger les retours, réessaie.</p>}
        {!isLoading && !visibleComments.length && (
          <p className="text-sm text-slate-500">Aucun commentaire pour ces critères.</p>
        )}
        <div className="mt-4 space-y-3">
          {visibleComments.map((comment) => {
            const created = new Date(comment.created_at).toLocaleString("fr-FR");
            const isBug = comment.category === "bug";
            return (
              <article
                key={comment.id}
                className={`rounded-2xl border p-4 ${isBug ? "border-rose-200 bg-rose-50" : "border-slate-200 bg-white/80"}`}
              >
                <div className="flex items-center justify-between gap-2 font-semibold text-[11px] uppercase tracking-wider text-slate-500">
                  <span className="flex items-center gap-1">
                    {isBug ? <Bug className="h-4 w-4" /> : <Sparkles className="h-4 w-4" />}
                    {comment.category}
                  </span>
                  <span>#{comment.owner_id}</span>
                </div>
                <p className="mt-2 text-sm font-semibold text-slate-900">{comment.summary}</p>
                <p className="mt-1 max-h-20 overflow-hidden text-[13px] text-slate-700">{comment.details}</p>
                {comment.reproduction ? (
                  <p className="mt-2 text-xs text-slate-600">
                    <span className="font-semibold">Reproduction :</span> {comment.reproduction}
                  </p>
                ) : null}
                <div className="mt-2 flex items-center justify-between text-[11px] text-slate-500">
                  <span>{created}</span>
                  {comment.contact ? <span>Contact : {comment.contact}</span> : <span className="italic">Pas de contact</span>}
                </div>
              </article>
            );
          })}
        </div>
      </CardContainer>
    </div>
  );
}
