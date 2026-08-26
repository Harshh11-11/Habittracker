"use client";

import { FormEvent, useState } from "react";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    setError("");
    setLoading(true);

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email,
          password,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || "Unable to sign in.");
        return;
      }

      window.location.href = "/";
    } catch {
      setError("Unable to connect to the server.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="login-page">
      <div className="grid-bg" />

      <header className="topbar">
        <div className="brand">
          <span className="pulse" />
          <span>ORBITAL / streak engine</span>
        </div>

        <span className="status">
          SYSTEM ONLINE
        </span>
      </header>

      <section className="login-wrap">
        <div className="orbit-decoration">
          <div className="outer-ring" />
          <div className="middle-ring" />
          <div className="inner-ring" />
          <div className="core-dot" />
        </div>

        <div className="login-card">
          <div className="card-top">
            <span>AUTH / 01</span>
            <span className="secure">● SECURE</span>
          </div>

          <div className="title-area">
            <p className="eyebrow">
              RETURN TO YOUR ORBIT
            </p>

            <h1>Welcome back.</h1>

            <p className="subtitle">
              Continue tracking your habits,
              one local day at a time.
            </p>
          </div>

          <form
            className="login-form"
            onSubmit={handleSubmit}
          >
            <label>
              <span>EMAIL</span>

              <input
                type="email"
                value={email}
                onChange={(event) =>
                  setEmail(event.target.value)
                }
                placeholder="you@example.com"
                autoComplete="email"
                required
              />
            </label>

            <label>
              <span>PASSWORD</span>

              <input
                type="password"
                value={password}
                onChange={(event) =>
                  setPassword(event.target.value)
                }
                placeholder="••••••••"
                autoComplete="current-password"
                required
              />
            </label>

            {error && (
              <div
                className="error"
                role="alert"
              >
                <span className="error-icon">
                  !
                </span>

                <span>{error}</span>
              </div>
            )}

            <button
              className="login-button"
              type="submit"
              disabled={loading}
            >
              <span>
                {loading
                  ? "AUTHENTICATING..."
                  : "ENTER ORBIT"}
              </span>

              <span className="arrow">
                →
              </span>
            </button>
          </form>

          <div className="divider">
            <span />
            <small>OR</small>
            <span />
          </div>

          <p className="register">
            New to Orbital?{" "}
            <a href="/register">
              Create an account
            </a>
          </p>
        </div>
      </section>

      <footer className="footer">
        <span>
          LOCAL-DAY STREAK ENGINE
        </span>

        <span>
          IANA TIMEZONE AWARE
        </span>

        <span>v1.0</span>
      </footer>

      <style>{`
        .login-page {
          --bg: oklch(0.16 0.02 265);
          --ink: oklch(0.96 0.01 260);
          --dim: oklch(0.62 0.03 265);
          --line: oklch(0.32 0.03 265);
          --cyan: oklch(0.75 0.17 190);
          --green: oklch(0.78 0.2 150);
          --red: oklch(0.68 0.2 22);

          position: relative;
          min-height: 100vh;
          overflow: hidden;

          padding: 2rem
            clamp(1rem, 4vw, 3rem);

          background:
            radial-gradient(
              circle at 50% 45%,
              oklch(0.24 0.05 265 / 0.5),
              transparent 38%
            ),
            radial-gradient(
              120% 90% at 50% -10%,
              oklch(0.24 0.06 270),
              var(--bg) 60%
            );

          color: var(--ink);

          font-family:
            ui-monospace,
            "SF Mono",
            Menlo,
            Monaco,
            Consolas,
            monospace;
        }

        .login-page * {
          box-sizing: border-box;
        }

        .grid-bg {
          position: absolute;
          inset: 0;
          pointer-events: none;
          opacity: 0.45;

          background-image:
            linear-gradient(
              var(--line) 1px,
              transparent 1px
            ),
            linear-gradient(
              90deg,
              var(--line) 1px,
              transparent 1px
            );

          background-size: 56px 56px;

          mask-image:
            radial-gradient(
              70% 65% at 50% 45%,
              #000,
              transparent
            );
        }

        .topbar {
          position: relative;
          z-index: 5;

          display: flex;
          justify-content: space-between;
          align-items: center;

          padding-bottom: 1rem;

          border-bottom: 1px solid var(--line);

          color: var(--dim);

          font-size: 0.68rem;
          letter-spacing: 0.18em;
          text-transform: uppercase;
        }

        .brand {
          display: flex;
          align-items: center;
          gap: 0.55rem;
        }

        .pulse {
          width: 7px;
          height: 7px;

          border-radius: 50%;

          background: var(--green);

          box-shadow:
            0 0 12px
            oklch(0.78 0.2 150 / 0.8);
        }

        .status {
          color: var(--green);
        }

        .login-wrap {
          position: relative;
          z-index: 2;

          min-height: calc(100vh - 155px);

          display: grid;
          place-items: center;
        }

        .login-card {
          position: relative;
          z-index: 5;

          width: min(100%, 430px);

          padding: 2rem;

          border: 1px solid var(--line);
          border-radius: 4px;

          background:
            linear-gradient(
              145deg,
              oklch(0.2 0.03 265 / 0.96),
              oklch(0.17 0.02 265 / 0.96)
            );

          box-shadow:
            0 30px 100px
              oklch(0 0 0 / 0.45),
            inset 0 0 60px
              oklch(0.7 0.12 190 / 0.025);

          backdrop-filter: blur(14px);
        }

        .card-top {
          display: flex;
          justify-content: space-between;

          padding-bottom: 1rem;

          border-bottom: 1px solid var(--line);

          color: var(--dim);

          font-size: 0.58rem;
          letter-spacing: 0.16em;
        }

        .secure {
          color: var(--green);
        }

        .title-area {
          padding: 2rem 0 1.5rem;
        }

        .eyebrow {
          margin: 0 0 0.7rem;

          color: var(--cyan);

          font-size: 0.58rem;
          letter-spacing: 0.2em;
        }

        .login-card h1 {
          margin: 0;

          color: var(--ink);

          font-size: clamp(
            2rem,
            7vw,
            3rem
          );

          line-height: 1;
          font-weight: 500;
          letter-spacing: -0.05em;
        }

        .subtitle {
          margin: 1rem 0 0;

          color: var(--dim);

          font-size: 0.78rem;
          line-height: 1.7;
        }

        .login-form {
          display: grid;
          gap: 1.1rem;
        }

        .login-form label {
          display: grid;
          gap: 0.45rem;
        }

        .login-form label > span {
          color: var(--dim);

          font-size: 0.58rem;
          letter-spacing: 0.16em;
        }

        .login-form input {
          width: 100%;

          padding: 0.85rem;

          color: var(--ink);

          background:
            oklch(0.13 0.02 265 / 0.85);

          border: 1px solid var(--line);
          border-radius: 2px;

          outline: none;

          font: inherit;
          font-size: 0.8rem;

          transition:
            border-color 0.2s,
            box-shadow 0.2s;
        }

        .login-form input::placeholder {
          color: oklch(0.5 0.02 265);
        }

        .login-form input:focus {
          border-color: var(--cyan);

          box-shadow:
            0 0 22px
            oklch(0.75 0.17 190 / 0.12);
        }

        .error {
          display: flex;
          align-items: center;
          gap: 0.6rem;

          padding: 0.75rem;

          border: 1px solid
            oklch(0.68 0.2 22 / 0.5);

          background:
            oklch(0.68 0.2 22 / 0.08);

          color: var(--red);

          font-size: 0.68rem;
          line-height: 1.5;
        }

        .error-icon {
          display: grid;
          place-items: center;

          width: 18px;
          height: 18px;

          flex-shrink: 0;

          border: 1px solid var(--red);
          border-radius: 50%;
        }

        .login-button {
          display: flex;
          align-items: center;
          justify-content: space-between;

          width: 100%;

          margin-top: 0.2rem;

          padding: 0.9rem 1rem;

          border: 0;
          border-radius: 2px;

          background: var(--cyan);
          color: oklch(0.18 0.03 240);

          cursor: pointer;

          font: inherit;
          font-size: 0.65rem;
          font-weight: 700;
          letter-spacing: 0.15em;

          transition:
            transform 0.2s,
            box-shadow 0.2s;
        }

        .login-button:hover:not(:disabled) {
          transform: translateY(-1px);

          box-shadow:
            0 10px 30px
            oklch(0.75 0.17 190 / 0.25);
        }

        .login-button:active:not(:disabled) {
          transform: translateY(1px);
        }

        .login-button:disabled {
          opacity: 0.5;
          cursor: wait;
        }

        .arrow {
          font-size: 1.1rem;
        }

        .divider {
          display: flex;
          align-items: center;
          gap: 0.7rem;

          margin: 1.6rem 0 1rem;
        }

        .divider span {
          flex: 1;
          height: 1px;

          background: var(--line);
        }

        .divider small {
          color: var(--dim);

          font-size: 0.5rem;
          letter-spacing: 0.15em;
        }

        .register {
          margin: 0;

          color: var(--dim);

          text-align: center;

          font-size: 0.68rem;
        }

        .register a {
          color: var(--cyan);
          text-decoration: none;
        }

        .register a:hover {
          text-decoration: underline;
        }

        .orbit-decoration {
          position: absolute;

          width: min(70vw, 560px);
          aspect-ratio: 1;

          opacity: 0.22;

          pointer-events: none;
        }

        .outer-ring,
        .middle-ring,
        .inner-ring {
          position: absolute;
          inset: 0;

          border: 1px solid
            oklch(0.65 0.1 190 / 0.45);

          border-radius: 50%;
        }

        .outer-ring {
          animation:
            orbit-spin 30s linear infinite;
        }

        .middle-ring {
          inset: 12%;

          border-style: dashed;

          animation:
            orbit-reverse 22s linear infinite;
        }

        .inner-ring {
          inset: 27%;

          border-color:
            oklch(0.75 0.15 190 / 0.35);

          animation:
            orbit-spin 16s linear infinite;
        }

        .core-dot {
          position: absolute;

          top: 50%;
          left: 50%;

          width: 7px;
          height: 7px;

          transform: translate(-50%, -50%);

          border-radius: 50%;

          background: var(--cyan);

          box-shadow:
            0 0 30px
            oklch(0.75 0.17 190 / 0.8);
        }

        @keyframes orbit-spin {
          from {
            transform: rotate(0deg);
          }

          to {
            transform: rotate(360deg);
          }
        }

        @keyframes orbit-reverse {
          from {
            transform: rotate(0deg);
          }

          to {
            transform: rotate(-360deg);
          }
        }

        .footer {
          position: relative;
          z-index: 5;

          display: flex;
          justify-content: space-between;

          padding-top: 1rem;

          border-top: 1px solid var(--line);

          color: var(--dim);

          font-size: 0.55rem;
          letter-spacing: 0.13em;
        }

        @media (max-width: 600px) {
          .login-page {
            padding: 1rem;
          }

          .status {
            display: none;
          }

          .login-card {
            padding: 1.4rem;
          }

          .orbit-decoration {
            width: 110vw;
          }

          .footer {
            gap: 0.8rem;
            flex-wrap: wrap;
          }
        }

        @media (prefers-reduced-motion: reduce) {
          .login-page * {
            animation: none !important;
            transition: none !important;
          }
        }
      `}</style>
    </main>
  );
}