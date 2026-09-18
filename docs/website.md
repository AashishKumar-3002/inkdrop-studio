# Product website

The public landing page is available at `/website`. Signed-out hosted visitors
see the same page at `/`; embedded desktop installations continue to open the
library at `/dashboard`.

## Local preview

```bash
npm ci
npm run dev
```

Open http://localhost:3000/website. This page does not query the project database.
The web app routes still need the configuration described in the README.

## Downloads

The page reads public GitHub releases and selects a published release with
installer assets. Preview releases are included; drafts are excluded. Links use
actual matching macOS, Windows, and Linux files rather than assumed tag URLs.
The lookup is cached for ten minutes. If there are no assets or GitHub cannot
be reached, the page links to GitHub Releases instead.

Publish the desktop release to make direct download buttons available. Changing
the version alone does not create installers.

## Hosting

Deploy this Next.js repository to a host that supports its server runtime. Set
`NEXT_PUBLIC_SITE_URL` to the final public HTTPS origin before building so social
sharing images use the correct domain. Keep any hosted-app environment variables
in the host's secret configuration, never in public assets.

The website is implemented in `src/components/marketing/`, with scoped styles
and real product screenshots in `public/screenshots/`. The theme switch changes
the preview screenshot; it does not change the writing app's saved theme.

No deployment or domain configuration is included in this change.
