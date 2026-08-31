import {
  createRootRoute,
  HeadContent,
  Outlet,
  Scripts,
} from "@tanstack/react-router";
import {
  BRAND_BACKGROUND_COLOR,
  BRAND_NAME,
  DEFAULT_DESCRIPTION,
} from "../../brand.ts";

import "../styles.css";
import { DocumentationProvider } from "../components/layout.tsx";

export const Route = createRootRoute({
  component: RootComponent,
  notFoundComponent: DocumentationNotFound,
  head: () => ({
    links: [
      { href: "/favicon.svg", rel: "icon", type: "image/svg+xml" },
      {
        href: "/favicon-32.png",
        rel: "icon",
        sizes: "32x32",
        type: "image/png",
      },
      { href: "/favicon.ico", rel: "shortcut icon" },
      {
        href: "/apple-touch-icon.png",
        rel: "apple-touch-icon",
        sizes: "180x180",
      },
      { href: "/site.webmanifest", rel: "manifest" },
    ],
    meta: [
      { charSet: "utf-8" },
      {
        content: "width=device-width, initial-scale=1, viewport-fit=cover",
        name: "viewport",
      },
      { content: DEFAULT_DESCRIPTION, name: "description" },
      { content: BRAND_NAME, name: "application-name" },
      { content: BRAND_NAME, name: "apple-mobile-web-app-title" },
      { content: BRAND_BACKGROUND_COLOR, name: "theme-color" },
      { title: "Blazing Agents Documentation" },
    ],
  }),
});

function RootComponent() {
  return (
    <html className="dark" lang="en" suppressHydrationWarning>
      <head>
        <HeadContent />
      </head>
      <body>
        <DocumentationProvider>
          <Outlet />
        </DocumentationProvider>
        <Scripts />
      </body>
    </html>
  );
}

function DocumentationNotFound() {
  return (
    <main className="mx-auto max-w-2xl px-6 py-24">
      <h1 className="font-semibold text-3xl">Page not found</h1>
      <p className="mt-3 text-fd-muted-foreground">
        The documentation page you requested does not exist.
      </p>
      <a className="mt-6 inline-block text-fd-primary underline" href="/">
        Return to documentation home
      </a>
    </main>
  );
}
