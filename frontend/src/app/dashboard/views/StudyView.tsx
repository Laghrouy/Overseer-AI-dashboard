"use client";

/* eslint-disable react/no-unescaped-entities */

import { Brain, GraduationCap } from "lucide-react";
import { CardContainer } from "../ui";
import { formatTime } from "../formatters";
import type { StudyCard, StudyPlan, StudySession, StudySubject } from "@/lib/types";

type StudyViewProps = {
  token?: string | null;
  setActionStatus: (msg: string) => void;

  // Subjects
  studySubjects: StudySubject[];
  studySubjectsFetching: boolean;
  newSubjectName: string;
  setNewSubjectName: (v: string) => void;
  newSubjectUe: string;
  setNewSubjectUe: (v: string) => void;
  newSubjectDesc: string;
  setNewSubjectDesc: (v: string) => void;
  onCreateSubject: () => void;
  createSubjectLoading: boolean;
  onUpdateSubject: (payload: { id: string; name: string; description?: string; ue_code?: string }) => void;
  onDeleteSubject: (id: string) => void;

  // Plans
  planSubjectId: string;
  setPlanSubjectId: (v: string) => void;
  planTopics: string;
  setPlanTopics: (v: string) => void;
  planExamDate: string;
  setPlanExamDate: (v: string) => void;
  planSessionsPerDay: string;
  setPlanSessionsPerDay: (v: string) => void;
  planSessionMinutes: string;
  setPlanSessionMinutes: (v: string) => void;
  onGeneratePlan: () => void;
  generatePlanLoading: boolean;
  studyPlans: StudyPlan[];
  onUpdatePlan: (payload: { id: string; title: string; exam_date?: string; total_minutes?: number }) => void;
  onDeletePlan: (id: string) => void;

  // Sessions dues
  studySessionsDue: StudySession[];
  studySessionsDueFetching: boolean;
  onUpdateSession: (payload: { id: string; status: "done" | "skipped" }) => void;

  // Cards
  newCardSubjectId: string;
  setNewCardSubjectId: (v: string) => void;
  newCardFront: string;
  setNewCardFront: (v: string) => void;
  newCardBack: string;
  setNewCardBack: (v: string) => void;
  onCreateCard: (payload: { subjectId: string; front: string; back: string }) => void;
  createCardLoading: boolean;
  studyCardsDue: StudyCard[];
  studyCardsDueFetching: boolean;
  onReviewCard: (payload: { id: string; score: number }) => void;

  // Assist
  assistSubject: string;
  setAssistSubject: (v: string) => void;
  assistTopic: string;
  setAssistTopic: (v: string) => void;
  assistContent: string;
  setAssistContent: (v: string) => void;
  assistMode: "resume" | "explication" | "exercices" | "quiz";
  setAssistMode: (v: "resume" | "explication" | "exercices" | "quiz") => void;
  assistDifficulty: string;
  setAssistDifficulty: (v: string) => void;
  assistItems: string;
  setAssistItems: (v: string) => void;
  onRunAssist: () => void;
  runAssistLoading: boolean;
  assistOutput: string;
};

export function StudyView({
  token,
  setActionStatus,
  studySubjects,
  studySubjectsFetching,
  newSubjectName,
  setNewSubjectName,
  newSubjectUe,
  setNewSubjectUe,
  newSubjectDesc,
  setNewSubjectDesc,
  onCreateSubject,
  createSubjectLoading,
  onUpdateSubject,
  onDeleteSubject,
  planSubjectId,
  setPlanSubjectId,
  planTopics,
  setPlanTopics,
  planExamDate,
  setPlanExamDate,
  planSessionsPerDay,
  setPlanSessionsPerDay,
  planSessionMinutes,
  setPlanSessionMinutes,
  onGeneratePlan,
  generatePlanLoading,
  studyPlans,
  onUpdatePlan,
  onDeletePlan,
  studySessionsDue,
  studySessionsDueFetching,
  onUpdateSession,
  newCardSubjectId,
  setNewCardSubjectId,
  newCardFront,
  setNewCardFront,
  newCardBack,
  setNewCardBack,
  onCreateCard,
  createCardLoading,
  studyCardsDue,
  studyCardsDueFetching,
  onReviewCard,
  assistSubject,
  setAssistSubject,
  assistTopic,
  setAssistTopic,
  assistContent,
  setAssistContent,
  assistMode,
  setAssistMode,
  assistDifficulty,
  setAssistDifficulty,
  assistItems,
  setAssistItems,
  onRunAssist,
  runAssistLoading,
  assistOutput,
}: StudyViewProps) {
  return (
    <section className="grid gap-6 lg:grid-cols-3">
      <CardContainer title="Révisions programmées" icon={<GraduationCap className="h-5 w-5 text-emerald-700" />} className="lg:col-span-2">
        <div className="flex flex-col gap-4">
          <p className="text-xs text-slate-500">Planifie tes sujets, génère un plan et coche tes séances dues.</p>
          {studySubjectsFetching && !studySubjects.length ? <p className="text-xs text-slate-600">Chargement des sujets...</p> : null}
          <div className="grid gap-3 md:grid-cols-2">
            <div className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm space-y-2">
              <p className="text-[12px] font-semibold text-slate-600">Nouveau sujet</p>
              <input
                type="text"
                value={newSubjectName}
                onChange={(e) => setNewSubjectName(e.target.value)}
                className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm"
                placeholder="Nom du sujet"
              />
              <input
                type="text"
                value={newSubjectUe}
                onChange={(e) => setNewSubjectUe(e.target.value)}
                className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm"
                placeholder="Code UE (optionnel)"
              />
              <textarea
                value={newSubjectDesc}
                onChange={(e) => setNewSubjectDesc(e.target.value)}
                className="w-full min-h-[70px] rounded-md border border-slate-200 px-3 py-2 text-sm"
                placeholder="Description rapide"
              />
              <button
                onClick={() => onCreateSubject()}
                disabled={!token || !newSubjectName.trim() || createSubjectLoading}
                className="inline-flex items-center justify-center gap-2 rounded-md bg-emerald-600 px-3 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-700 disabled:opacity-60"
              >
                Ajouter un sujet
              </button>
              <div className="flex flex-wrap gap-2 text-[11px] text-slate-600">
                {studySubjects.length ? (
                  studySubjects.map((s) => (
                    <div key={s.id} className="flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-1">
                      <span className="font-semibold text-emerald-700">{s.name}</span>
                      <button
                        type="button"
                        onClick={() => {
                          if (!token) {
                            setActionStatus("Connectez-vous pour modifier un sujet.");
                            return;
                          }
                          const newName = window.prompt("Nom du sujet", s.name) ?? s.name;
                          if (!newName.trim()) return;
                          const newDesc = window.prompt("Description (laisser vide pour inchangé)", s.description ?? "") ?? s.description ?? "";
                          const newUe = window.prompt("Code UE (laisser vide pour inchangé)", s.ue_code ?? "") ?? s.ue_code ?? "";
                          onUpdateSubject({
                            id: s.id,
                            name: newName,
                            description: newDesc,
                            ue_code: newUe,
                          });
                        }}
                        className="rounded-full px-1 text-[10px] text-emerald-800 hover:bg-emerald-100"
                      >
                        Éditer
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          if (!token) {
                            setActionStatus("Connectez-vous pour supprimer un sujet.");
                            return;
                          }
                          if (!window.confirm("Supprimer ce sujet et son contenu associé ?")) return;
                          onDeleteSubject(s.id);
                        }}
                        className="rounded-full px-1 text-[10px] text-rose-700 hover:bg-rose-100"
                      >
                        Supprimer
                      </button>
                    </div>
                  ))
                ) : (
                  <span>Aucun sujet pour l'instant.</span>
                )}
              </div>
            </div>

            <div className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm space-y-2">
              <p className="text-[12px] font-semibold text-slate-600">Générer un plan</p>
              <select
                value={planSubjectId}
                onChange={(e) => setPlanSubjectId(e.target.value)}
                className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm"
              >
                {studySubjects.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
              <textarea
                value={planTopics}
                onChange={(e) => setPlanTopics(e.target.value)}
                className="w-full min-h-[80px] rounded-md border border-slate-200 px-3 py-2 text-sm"
                placeholder="Chapitres ou notions (séparés par virgule ou saut de ligne)"
              />
              <div className="grid grid-cols-2 gap-2 text-sm">
                <label className="flex flex-col gap-1 text-slate-700">
                  <span className="text-[11px] font-semibold text-slate-600">Date d&apos;examen</span>
                  <input type="date" value={planExamDate} onChange={(e) => setPlanExamDate(e.target.value)} className="rounded-md border border-slate-200 px-3 py-2" />
                </label>
                <label className="flex flex-col gap-1 text-slate-700">
                  <span className="text-[11px] font-semibold text-slate-600">Sessions / jour</span>
                  <input
                    type="number"
                    min="1"
                    value={planSessionsPerDay}
                    onChange={(e) => setPlanSessionsPerDay(e.target.value)}
                    className="rounded-md border border-slate-200 px-3 py-2"
                  />
                </label>
                <label className="flex flex-col gap-1 text-slate-700">
                  <span className="text-[11px] font-semibold text-slate-600">Durée (min)</span>
                  <input
                    type="number"
                    min="10"
                    step="5"
                    value={planSessionMinutes}
                    onChange={(e) => setPlanSessionMinutes(e.target.value)}
                    className="rounded-md border border-slate-200 px-3 py-2"
                  />
                </label>
              </div>
              <button
                onClick={() => onGeneratePlan()}
                disabled={!token || !planSubjectId || generatePlanLoading}
                className="inline-flex items-center justify-center gap-2 rounded-md bg-slate-900 px-3 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-800 disabled:opacity-60"
              >
                Lancer le plan
              </button>
              <p className="text-[11px] text-slate-500">{studySessionsDue.length} séance(s) dues à traiter.</p>
            </div>

            <div className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm space-y-2">
              <div className="flex items-center justify-between text-[12px] font-semibold text-slate-700">
                <span>Plans existants</span>
                <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] text-slate-600">{studyPlans.length}</span>
              </div>
              <div className="mt-2 space-y-2 text-sm text-slate-800">
                {studyPlans.length ? (
                  studyPlans.map((plan) => (
                    <div key={plan.id} className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-slate-100 bg-slate-50 px-3 py-2">
                      <div className="min-w-0 flex-1">
                        <p className="font-semibold text-slate-900">{plan.title}</p>
                        <p className="text-[11px] text-slate-600">
                          {plan.exam_date ? `Examen le ${new Date(plan.exam_date).toLocaleDateString("fr-FR")}` : "Sans date d'examen"}
                          {plan.total_minutes != null ? ` · ${plan.total_minutes} min prévues` : ""}
                          {` · ${plan.sessions.length} séance(s)`}
                        </p>
                      </div>
                      <div className="flex flex-wrap items-center gap-2 text-[11px] font-semibold">
                        <button
                          type="button"
                          onClick={() => {
                            if (!token) {
                              setActionStatus("Connectez-vous pour modifier un plan.");
                              return;
                            }
                            const newTitle = window.prompt("Titre du plan", plan.title) ?? plan.title;
                            if (!newTitle.trim()) return;
                            const newExamDate = window.prompt("Date d'examen (YYYY-MM-DD, laisser vide pour inchangé)", plan.exam_date ?? "");
                            const totalStr = window.prompt("Minutes totales (laisser vide pour inchangé)", plan.total_minutes != null ? String(plan.total_minutes) : "");
                            const total = totalStr && totalStr.trim() ? Number(totalStr) : undefined;
                            onUpdatePlan({
                              id: plan.id,
                              title: newTitle,
                              exam_date: newExamDate || undefined,
                              total_minutes: total,
                            });
                          }}
                          className="rounded-md bg-slate-200 px-2.5 py-1 text-slate-700 hover:bg-slate-300"
                        >
                          Éditer
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            if (!token) {
                              setActionStatus("Connectez-vous pour supprimer un plan.");
                              return;
                            }
                            if (!window.confirm("Supprimer ce plan de révision (les séances associées seront supprimées) ?")) return;
                            onDeletePlan(plan.id);
                          }}
                          className="rounded-md bg-rose-100 px-2.5 py-1 text-rose-700 hover:bg-rose-200"
                        >
                          Supprimer
                        </button>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-xs text-slate-500">Aucun plan pour ce sujet pour le moment.</p>
                )}
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
            <div className="flex items-center justify-between text-[12px] font-semibold text-slate-700">
              <span>Séances dues</span>
              <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] text-slate-600">{studySessionsDue.length}</span>
            </div>
            <div className="mt-2 space-y-2 text-sm text-slate-800">
              {studySessionsDueFetching && !studySessionsDue.length ? <p className="text-xs text-slate-500">Chargement des séances de révision...</p> : null}
              {studySessionsDue.length ? (
                studySessionsDue.map((s) => (
                  <div key={s.id} className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-slate-100 bg-slate-50 px-3 py-2">
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold text-slate-900">{s.topic || "Général"}</p>
                      <p className="text-[11px] text-slate-600">{s.kind} · {s.duration_minutes} min · {s.scheduled_for ? formatTime(s.scheduled_for) : "À planifier"}</p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2 text-[11px] font-semibold">
                      <button
                        onClick={() => onUpdateSession({ id: s.id, status: "done" })}
                        className="rounded-md bg-emerald-600 px-2.5 py-1 text-white hover:bg-emerald-700"
                      >
                        Terminé
                      </button>
                      <button
                        onClick={() => onUpdateSession({ id: s.id, status: "skipped" })}
                        className="rounded-md bg-slate-200 px-2.5 py-1 text-slate-700 hover:bg-slate-300"
                      >
                        Passer
                      </button>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-xs text-slate-500">Aucune séance à traiter.</p>
              )}
            </div>
          </div>
        </div>
      </CardContainer>

      <CardContainer title="Cartes & aide" icon={<Brain className="h-5 w-5 text-indigo-700" />} className="lg:col-span-1">
        <div className="flex flex-col gap-3">
          <div className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm space-y-2">
            <p className="text-[12px] font-semibold text-slate-600">Nouvelle carte</p>
            <select
              value={newCardSubjectId}
              onChange={(e) => setNewCardSubjectId(e.target.value)}
              className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm"
            >
              {studySubjects.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
            <textarea
              value={newCardFront}
              onChange={(e) => setNewCardFront(e.target.value)}
              className="w-full min-h-[60px] rounded-md border border-slate-200 px-3 py-2 text-sm"
              placeholder="Question / recto"
            />
            <textarea
              value={newCardBack}
              onChange={(e) => setNewCardBack(e.target.value)}
              className="w-full min-h-[60px] rounded-md border border-slate-200 px-3 py-2 text-sm"
              placeholder="Réponse / verso"
            />
            <button
              onClick={() => {
                const resolvedSubjectId = newCardSubjectId || (studySubjects[0] ? String(studySubjects[0].id) : "");
                if (!resolvedSubjectId) {
                  setActionStatus("Choisir un sujet avant d'ajouter une carte.");
                  return;
                }
                onCreateCard({ subjectId: resolvedSubjectId, front: newCardFront, back: newCardBack });
              }}
              disabled={!token || (!newCardSubjectId && !studySubjects.length) || !newCardFront.trim() || !newCardBack.trim() || createCardLoading}
              className="inline-flex items-center justify-center rounded-md bg-indigo-600 px-3 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700 disabled:opacity-60"
            >
              Ajouter la carte
            </button>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
            <div className="flex items-center justify-between text-[12px] font-semibold text-slate-700">
              <span>Cartes dues</span>
              <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] text-slate-600">{studyCardsDue.length}</span>
            </div>
            <div className="mt-2 space-y-2 text-sm text-slate-800">
              {studyCardsDueFetching && !studyCardsDue.length ? <p className="text-xs text-slate-500">Chargement des cartes à réviser...</p> : null}
              {studyCardsDue.length ? (
                studyCardsDue.map((card) => (
                  <div key={card.id} className="space-y-1 rounded-lg border border-slate-100 bg-slate-50 p-3">
                    <p className="font-semibold text-slate-900">{card.front}</p>
                    <p className="text-[11px] text-slate-600">{card.back}</p>
                    <p className="text-[11px] text-slate-500">Échéance {formatTime(card.due_at)} · Série {card.streak} · Facilité {card.ease.toFixed(2)}</p>
                    <div className="flex flex-wrap items-center gap-2 text-[11px] font-semibold">
                      {[0, 3, 5].map((score) => (
                        <button
                          key={score}
                          onClick={() => onReviewCard({ id: card.id, score })}
                          className={`rounded-md px-2.5 py-1 ${score === 5 ? "bg-emerald-600 text-white" : score === 3 ? "bg-amber-100 text-amber-800" : "bg-rose-100 text-rose-800"}`}
                        >
                          {score === 5 ? "Facile" : score === 3 ? "Moyen" : "Dur"}
                        </button>
                      ))}
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-xs text-slate-500">Aucune carte à réviser.</p>
              )}
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm space-y-2">
            <p className="text-[12px] font-semibold text-slate-600">Aide pédagogique</p>
            <select
              value={assistSubject}
              onChange={(e) => setAssistSubject(e.target.value)}
              className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm"
            >
              <option value="">Sujet libre</option>
              {studySubjects.map((s) => (
                <option key={s.id} value={s.name}>
                  {s.name}
                </option>
              ))}
            </select>
            <input
              type="text"
              value={assistTopic}
              onChange={(e) => setAssistTopic(e.target.value)}
              className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm"
              placeholder="Topic précis"
            />
            <textarea
              value={assistContent}
              onChange={(e) => setAssistContent(e.target.value)}
              className="w-full min-h-[70px] rounded-md border border-slate-200 px-3 py-2 text-sm"
              placeholder="Contenu ou notes (optionnel)"
            />
            <div className="grid grid-cols-3 gap-2 text-[11px] font-semibold text-slate-700">
              <label className="flex flex-col gap-1">
                <span>Mode</span>
                <select value={assistMode} onChange={(e) => setAssistMode(e.target.value as typeof assistMode)} className="rounded-md border border-slate-200 px-2 py-1 text-sm">
                  <option value="resume">Résumé</option>
                  <option value="explication">Explication</option>
                  <option value="exercices">Exercices</option>
                  <option value="quiz">Quiz</option>
                </select>
              </label>
              <label className="flex flex-col gap-1">
                <span>Difficulté</span>
                <select value={assistDifficulty} onChange={(e) => setAssistDifficulty(e.target.value)} className="rounded-md border border-slate-200 px-2 py-1 text-sm">
                  <option value="easy">Facile</option>
                  <option value="medium">Moyen</option>
                  <option value="hard">Difficile</option>
                </select>
              </label>
              <label className="flex flex-col gap-1">
                <span>Items</span>
                <input
                  type="number"
                  min="1"
                  value={assistItems}
                  onChange={(e) => setAssistItems(e.target.value)}
                  className="rounded-md border border-slate-200 px-2 py-1 text-sm"
                />
              </label>
            </div>
            <button
              onClick={() => onRunAssist()}
              disabled={!token || runAssistLoading}
              className="inline-flex items-center justify-center rounded-md bg-slate-900 px-3 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-800 disabled:opacity-60"
            >
              Générer l&apos;aide
            </button>
            {assistOutput ? <div className="rounded-md border border-slate-200 bg-slate-50 p-3 text-sm text-slate-800 whitespace-pre-line">{assistOutput}</div> : null}
          </div>
        </div>
      </CardContainer>
    </section>
  );
}
