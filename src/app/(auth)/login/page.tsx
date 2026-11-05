"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import Link from "next/link";
import { Wallet } from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const supabase = createClient();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      setError(error.message);
      setLoading(false);
    } else {
      router.push("/lancamento");
      router.refresh();
    }
  }

  return (
    <div className="min-h-screen bg-bg flex items-center justify-center px-4">
      <div className="bg-card border border-border rounded-2xl p-8 w-full max-w-sm shadow-[0_8px_30px_rgba(0,0,0,.06)]">
        <div className="text-center mb-8">
          <span className="mx-auto mb-4 size-12 grid place-items-center rounded-2xl bg-brand text-onbrand"><Wallet size={24} /></span>
          <h1 className="text-xl font-semibold text-heading">Controle Financeiro</h1>
          <p className="text-sm text-muted mt-1">Entre na sua conta</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1.5">E-mail</label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
              className="w-full border border-border rounded-lg px-3 py-2.5 text-sm font-sans outline-none focus:border-accent focus:ring-2 focus:ring-accent/20 focus:bg-card bg-bg transition"
              placeholder="seu@email.com"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1.5">Senha</label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
              className="w-full border border-border rounded-lg px-3 py-2.5 text-sm font-sans outline-none focus:border-accent focus:ring-2 focus:ring-accent/20 focus:bg-card bg-bg transition"
              placeholder="••••••••"
            />
          </div>

          {error && (
            <p className="text-danger-ink text-sm bg-danger-soft border border-danger/30 rounded-lg px-3 py-2">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-brand text-onbrand rounded-full py-2.5 text-sm font-semibold hover:bg-brand/90 transition-colors disabled:opacity-60"
          >
            {loading ? "Entrando…" : "Entrar"}
          </button>
        </form>

        <p className="text-center text-sm text-muted mt-6">
          Não tem conta?{" "}
          <Link href="/signup" className="text-brand font-semibold hover:underline">
            Cadastrar
          </Link>
        </p>
      </div>
    </div>
  );
}
