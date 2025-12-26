"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Lock, LogIn, UserPlus } from "lucide-react";
import { useAuthStore } from "@/store/auth";
import { apiLogin, apiRegister } from "@/lib/api";

export default function LoginPage() {
  const router = useRouter();
  const { setToken, setEmail } = useAuthStore();
  const [email, setEmailInput] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [mode, setMode] = useState<"login" | "register">("login");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    setLoading(true);

    if (!email || !password) {
      setError("Email et mot de passe requis");
      setLoading(false);
      return;
    }

    if (mode === "register" && password !== confirm) {
      setError("Les mots de passe ne correspondent pas");
      setLoading(false);
      return;
    }

    try {
      if (mode === "register") {
        await apiRegister(email, password);
      }
      const tokenResp = await apiLogin(email, password);
      setToken(tokenResp.access_token);
      setEmail(email);
      router.push("/");
    } catch (e) {
      const message = e instanceof Error ? e.message : "Erreur lors de la connexion";
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-6">
      <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-8 shadow-lg">
        <div className="mb-6 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-900 text-white">
            <Lock className="h-5 w-5" />
          </div>
          <div>
            <p className="text-xs uppercase tracking-wide text-slate-500">Accès privé</p>
            <h1 className="text-xl font-semibold text-slate-900">
              {mode === "login" ? "Se connecter" : "Créer un compte"}
            </h1>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-700">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmailInput(e.target.value)}
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-900 shadow-sm outline-none focus:border-slate-400"
              placeholder="moi@example.com"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-700">Mot de passe</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-900 shadow-sm outline-none focus:border-slate-400"
              placeholder="••••••••"
            />
          </div>

          {mode === "register" ? (
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700">Confirmer le mot de passe</label>
              <input
                type="password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-900 shadow-sm outline-none focus:border-slate-400"
                placeholder="••••••••"
              />
            </div>
          ) : null}

          {error ? <p className="text-xs text-rose-600">{error}</p> : null}

          <button
            type="submit"
            disabled={loading}
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-800 disabled:opacity-70"
          >
            {mode === "login" ? <LogIn className="h-4 w-4" /> : <UserPlus className="h-4 w-4" />}
            {loading ? "Patientez..." : mode === "login" ? "Continuer" : "Créer mon compte"}
          </button>
        </form>

        <div className="mt-4 text-center text-sm text-slate-600">
          {mode === "login" ? (
            <button
              onClick={() => {
                setMode("register");
                setError(null);
              }}
              className="font-medium text-slate-900 underline-offset-2 hover:underline"
            >
              Pas encore de compte ? Créer un compte
            </button>
          ) : (
            <button
              onClick={() => {
                setMode("login");
                setError(null);
              }}
              className="font-medium text-slate-900 underline-offset-2 hover:underline"
            >
              Déjà inscrit ? Se connecter
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
