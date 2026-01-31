import { QueryClientProvider } from "@tanstack/react-query";
import {
  isRouteErrorResponse,
  Links,
  Meta,
  Outlet,
  Scripts,
  ScrollRestoration,
} from "react-router";
import "@xyflow/react/dist/style.css";

import type { Route } from "./+types/root";
import "./app.css";
import { ThemeProvider } from "./components/theme-provider";
import { getQueryClient } from "./lib/query-client";

export const links: Route.LinksFunction = () => [
  { rel: "preconnect", href: "https://fonts.googleapis.com" },
  {
    rel: "preconnect",
    href: "https://fonts.gstatic.com",
    crossOrigin: "anonymous",
  },
  // Tangerine theme fonts
  {
    rel: "stylesheet",
    href: "https://fonts.googleapis.com/css2?family=Inter:ital,opsz,wght@0,14..32,100..900;1,14..32,100..900&family=JetBrains+Mono:wght@400;500;600;700&family=Source+Serif+4:ital,opsz,wght@0,8..60,400;0,8..60,600;1,8..60,400&display=swap",
  },
  // Bubblegum theme fonts
  {
    rel: "stylesheet",
    href: "https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700&family=Fira+Code:wght@400;500;600&family=Lora:ital,wght@0,400;0,600;1,400&display=swap",
  },
  // Sunset Horizon theme fonts
  {
    rel: "stylesheet",
    href: "https://fonts.googleapis.com/css2?family=Montserrat:wght@400;500;600;700&family=Ubuntu+Mono:wght@400;700&family=Merriweather:ital,wght@0,400;0,700;1,400&display=swap",
  },
  // Soft Pop theme fonts
  {
    rel: "stylesheet",
    href: "https://fonts.googleapis.com/css2?family=DM+Sans:ital,wght@0,400;0,500;0,600;0,700;1,400&family=Space+Mono:wght@400;700&display=swap",
  },
  // Notebook theme fonts
  {
    rel: "stylesheet",
    href: "https://fonts.googleapis.com/css2?family=Architects+Daughter&display=swap",
  },
  // Cyberpunk theme fonts
  {
    rel: "stylesheet",
    href: "https://fonts.googleapis.com/css2?family=Outfit:wght@400;500;600;700&display=swap",
  },
  // Vintage Paper theme fonts
  {
    rel: "stylesheet",
    href: "https://fonts.googleapis.com/css2?family=Libre+Baskerville:ital,wght@0,400;0,700;1,400&family=IBM+Plex+Mono:wght@400;500;600&family=Lora:ital,wght@0,400;0,600;1,400&display=swap",
  },
  // Caffeine theme uses system fonts - no import needed
];

// Blocking script to prevent FOUC (Flash of Unstyled Content)
// This runs synchronously before CSS paints, setting theme classes on <html>
const themeInitScript = `
(function() {
  var themes = ['tangerine', 'bubblegum', 'sunset-horizon', 'soft-pop', 'notebook', 'northern-lights', 'neo-brutalism', 'nature', 'modern-minimal', 'mocha-mousse', 'cyberpunk', 'vintage-paper', 'caffeine'];
  var defaultTheme = 'notebook';
  var theme = defaultTheme;
  var colorMode = 'light';
  try {
    var stored = localStorage.getItem('valet-theme');
    if (stored && themes.indexOf(stored) !== -1) theme = stored;
  } catch (e) {}
  try {
    var cm = localStorage.getItem('valet-color-mode');
    if (cm === 'dark' || cm === 'light') {
      colorMode = cm;
    } else if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
      colorMode = 'dark';
    }
  } catch (e) {}
  document.documentElement.classList.add('theme-' + theme);
  if (colorMode === 'dark') document.documentElement.classList.add('dark');
})();
`;

export function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
        <Meta />
        <Links />
      </head>
      <body>
        <ThemeProvider>
          <QueryClientProvider client={getQueryClient()}>
            {children}
          </QueryClientProvider>
        </ThemeProvider>
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
  let message = "Oops!";
  let details = "An unexpected error occurred.";
  let stack: string | undefined;

  if (isRouteErrorResponse(error)) {
    message = error.status === 404 ? "404" : "Error";
    details =
      error.status === 404
        ? "The requested page could not be found."
        : error.statusText || details;
  } else if (import.meta.env.DEV && error && error instanceof Error) {
    details = error.message;
    stack = error.stack;
  }

  return (
    <main className="pt-16 p-4 container mx-auto">
      <h1>{message}</h1>
      <p>{details}</p>
      {stack && (
        <pre className="w-full p-4 overflow-x-auto">
          <code>{stack}</code>
        </pre>
      )}
    </main>
  );
}
