"use client";
import { useState, type FormEvent } from "react";
import styles from "../guide.module.css";

export default function GuideLogin() {
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function login(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setError("");
    try {
      const response = await fetch("/api/planning-guide-baleines/session", {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ password }),
      });
      const payload = await response.json();
      if (!response.ok) { setError(payload.error || "Connexion impossible."); return; }
      window.location.replace("/planning-guide-baleines");
    } catch { setError("Connexion impossible. Vérifiez votre connexion internet."); }
    finally { setBusy(false); }
  }
  return <main className={styles.loginPage}>
    <section className={styles.loginCard}>
      <div className={styles.brandMark} aria-hidden="true">≈</div>
      <p className={styles.eyebrow}>Tahiti Trip · Guide Baleines</p>
      <h1>Prête pour<br />la prochaine sortie.</h1>
      <p className={styles.intro}>Les départs, les participants et le matériel à préparer, au même endroit.</p>
      <form onSubmit={login} className={styles.loginForm}>
        <label htmlFor="guide-password">Mot de passe Guide</label>
        <input id="guide-password" name="password" type="password" autoComplete="current-password"
          required maxLength={1024} value={password} onChange={event => setPassword(event.target.value)} />
        {error && <p role="alert" className={styles.error}>{error}</p>}
        <button className={styles.primaryButton} disabled={busy}>{busy ? "Connexion…" : "Ouvrir mon planning"}</button>
      </form>
      <p className={styles.loginNote}>Espace Guide · Consultation uniquement</p>
    </section>
  </main>;
}
