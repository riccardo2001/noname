import {
  isRouteErrorResponse,
  Links,
  Meta,
  Outlet,
  Scripts,
  ScrollRestoration,
} from "react-router";

import type { Route } from "./+types/root";
import "./app.css";

export const links: Route.LinksFunction = () => [
  { rel: "preconnect", href: "https://fonts.googleapis.com" },
  {
    rel: "preconnect",
    href: "https://fonts.gstatic.com",
    crossOrigin: "anonymous",
  },
  {
    rel: "stylesheet",
    href: "https://fonts.googleapis.com/css2?family=Inter:ital,opsz,wght@0,14..32,100..900;1,14..32,100..900&family=EB+Garamond:ital,wght@0,400..700;1,400..700&family=JetBrains+Mono:wght@300..600&display=swap",
  },
];

export function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="it">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <Meta />
        <Links />
      </head>
      <body>
        {children}
        <ScrollRestoration />
        <Scripts />
      </body>
    </html>
  );
}

export default function App() {
  return <Outlet />;
}

export function ErrorBoundary({ error }: Route.ErrorBoundaryProps) {
  let message = "Il labirinto si è richiuso";
  let details =
    "Una parete, dove un attimo fa c'era un corridoio. Succede, qui sotto. Risali in superficie e riprova a scendere.";
  let stack: string | undefined;

  if (isRouteErrorResponse(error)) {
    message = error.status === 404 ? "Questa stanza non esiste" : "Il labirinto si è richiuso";
    details =
      error.status === 404
        ? "Hai bussato a una porta che il labirinto non ha mai costruito. O che ha già digerito."
        : details;
  } else if (import.meta.env.DEV && error && error instanceof Error) {
    details = error.message;
    stack = error.stack;
  }

  return (
    <main className="veil relative flex min-h-dvh flex-col items-center justify-center px-6 text-center">
      <p className="font-mono text-xs tracking-[0.5em] text-(--color-ash) uppercase">
        qualcosa è andato storto · o si è storto da solo
      </p>
      <h1
        data-text={message}
        className="glitch mt-4 font-serif text-4xl font-semibold tracking-wide text-(--color-ember) sm:text-5xl"
      >
        {message}
      </h1>
      <p className="mt-6 max-w-lg font-serif text-lg leading-relaxed text-(--color-bone)/90 italic">
        {details}
      </p>
      <a
        href="/"
        className="choice mt-10 cursor-pointer border border-(--color-smoke) bg-(--color-coal) px-6 py-4 font-mono text-base tracking-widest text-(--color-bone) uppercase"
      >
        <span className="choice-marker mr-3">▸</span>
        risali in superficie
      </a>
      {stack && (
        <pre className="mt-10 max-h-64 w-full max-w-2xl overflow-auto border border-(--color-smoke) bg-(--color-coal) p-4 text-left font-mono text-xs text-(--color-ash)">
          <code>{stack}</code>
        </pre>
      )}
    </main>
  );
}
