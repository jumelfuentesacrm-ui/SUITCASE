import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";
import { useEffect, type ReactNode } from "react";

import appCss from "../styles.css?url";
import { reportLovableError } from "../lib/lovable-error-reporting";
import { business } from "../config/business.config";

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-bold text-foreground">404</h1>
        <h2 className="mt-4 text-xl font-semibold text-foreground">Page not found</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          The page you're looking for doesn't exist or has been moved.
        </p>
        <div className="mt-6">
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Go home
          </Link>
        </div>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  console.error(error);
  const router = useRouter();
  useEffect(() => {
    reportLovableError(error, { boundary: "tanstack_root_error_component" });
  }, [error]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-xl font-semibold tracking-tight text-foreground">
          This page didn't load
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Something went wrong on our end. You can try refreshing or head back home.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <button
            onClick={() => {
              router.invalidate();
              reset();
            }}
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Try again
          </button>
          <a
            href="/"
            className="inline-flex items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent"
          >
            Go home
          </a>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: `${business.name} ${business.seo.titleSuffix}` },
      { name: "description", content: business.seo.description },
      { name: "author", content: business.name },
      { name: "keywords", content: business.seo.keywords },
      { name: "theme-color", content: business.theme.primary },
      { name: "apple-mobile-web-app-capable", content: "yes" },
      { name: "apple-mobile-web-app-status-bar-style", content: "default" },
      { name: "apple-mobile-web-app-title", content: business.shortName },
      { name: "mobile-web-app-capable", content: "yes" },
      { property: "og:title", content: `${business.name} ${business.seo.titleSuffix}` },
      { property: "og:description", content: business.seo.description },
      { property: "og:type", content: "website" },
      { property: "og:image", content: business.seo.ogImage },
      { property: "og:locale", content: business.seo.locale },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: `${business.name} ${business.seo.titleSuffix}` },
      { name: "twitter:description", content: business.seo.description },
      { name: "twitter:image", content: business.seo.ogImage },
      { name: "geo.region", content: "PR" },
      { name: "geo.placename", content: business.legalCity },
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      { rel: "icon", href: business.faviconSvg, type: "image/svg+xml" },
      { rel: "icon", href: "/klassy/icon-32.png", sizes: "32x32", type: "image/png" },
      { rel: "icon", href: "/klassy/icon-16.png", sizes: "16x16", type: "image/png" },
      { rel: "apple-touch-icon", href: "/klassy/icon-180.png", sizes: "180x180" },
      { rel: "manifest", href: "/manifest.json" },
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      {
        rel: "stylesheet",
        href: business.fonts.googleFontsUrl,
      },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

const LOCAL_BUSINESS_SCHEMA = {
  "@context": "https://schema.org",
  "@type": "BeautySalon",
  "name": business.name,
  "description": business.seo.description,
  "url": business.seo.siteUrl,
  "telephone": `+${business.whatsapp}`,
  "priceRange": "$$ ",
  "aggregateRating": {
    "@type": "AggregateRating",
    "ratingValue": business.googleRating.value,
    "reviewCount": business.googleRating.count,
    "bestRating": "5"
  },
  "address": {
    "@type": "PostalAddress",
    "streetAddress": business.address,
    "addressLocality": business.legalCity,
    "addressRegion": "PR",
    "postalCode": "",
    "addressCountry": "US"
  },
  "geo": {
    "@type": "GeoCoordinates",
    "latitude": business.geo.latitude,
    "longitude": business.geo.longitude
  },
  "image": business.seo.ogImage,
  "sameAs": [business.instagramUrl, business.booksyUrl, business.facebookUrl].filter(Boolean),
  "hasMap": business.googleMapsUrl,
  "amenityFeature": [
    { "@type": "LocationFeatureSpecification", "name": "Parking", "value": true },
    { "@type": "LocationFeatureSpecification", "name": "Credit Cards Accepted", "value": true }
  ],
  "currenciesAccepted": "USD",
  "paymentAccepted": "Cash, Credit Card"
};

function RootShell({ children }: { children: ReactNode }) {
  return (
    <html lang="es">
      <head>
        <HeadContent />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(LOCAL_BUSINESS_SCHEMA) }}
        />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();

  return (
    <QueryClientProvider client={queryClient}>
      {/* Required: nested routes render here. Removing <Outlet /> breaks all child routes. */}
      <Outlet />
    </QueryClientProvider>
  );
}
