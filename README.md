# IceGuard website

Static landing page for [IceGuard](https://github.com/adelfardi/iceguard), built with React + TypeScript + Vite + Tailwind CSS v4.

```bash
npm install
npm run dev      # http://localhost:5173
npm run build    # static output in dist/, deployable to any static host
```

- All copy, links and commands live in `src/content.ts` (bump `RELEASE_TAG` on each release).
- The demo video is not bundled: it streams from the GitHub release asset (`demo.mp4`), loaded only on click.
- `base: './'` in `vite.config.ts` keeps asset URLs relative, so `dist/` works under GitHub Pages' `/<repo>/` path.

## Publishing

`.github/workflows/deploy.yml` builds the site on every push and pull request, and publishes `dist/` to
GitHub Pages on pushes to `main`. One-time setup: repo **Settings → Pages → Source: GitHub Actions**.
