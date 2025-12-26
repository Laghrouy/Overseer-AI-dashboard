"use client";

/* eslint-disable react/no-unescaped-entities */

export default function SettingsPage() {
  return (
    <div className="mx-auto max-w-4xl space-y-4 p-4 md:p-6">
      <header className="flex items-center justify-between">
        <div>
          <p className="text-sm text-slate-600">Préférences et configuration</p>
          <h1 className="text-2xl font-semibold text-slate-900">Paramètres</h1>
        </div>
      </header>
      <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <p className="text-sm text-slate-700">Centralisation des préférences à venir. Utilisez pour l'instant les pages Feedback ou Agent pour ajuster vos réglages.</p>
      </div>
    </div>
  );
}
