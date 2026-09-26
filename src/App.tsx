import { useState } from 'react';
import {
  ArrowRight,
  Bell,
  BookOpen,
  Boxes,
  CalendarClock,
  Container,
  Database,
  ExternalLink,
  GitBranch,
  HardDrive,
  History,
  Layers,
  Menu,
  MonitorPlay,
  Rocket,
  Ship,
  Wrench,
  X,
} from 'lucide-react';
import { CodeBlock, DemoVideo, GithubIcon, Section, ThemeToggle } from './components';
import {
  CATALOGS,
  DEMO_VIDEO,
  FEATURES,
  FIRST_CATALOG,
  HELM_STEPS,
  HELM_TEMPLATE,
  HERO_COMMAND,
  INSTALL_OPTIONS,
  LINKS,
  RELEASE_TAG,
  type Feature,
} from './content';

const FEATURE_ICONS: Record<Feature['icon'], typeof Boxes> = {
  catalogs: Boxes,
  schema: Layers,
  storage: HardDrive,
  maintenance: Wrench,
  pipelines: CalendarClock,
  alerts: Bell,
  timeline: History,
  versioning: GitBranch,
};

const NAV = [
  { href: '#features', label: 'Features' },
  { href: '#demo', label: 'Demo' },
  { href: LINKS.demo, label: 'Live demo' },
  { href: '#quick-start', label: 'Quick start' },
  { href: '#helm', label: 'Kubernetes' },
  { href: '#architecture', label: 'Architecture' },
];

export default function App() {
  return (
    <>
      <Header />
      <main>
        <Hero />
        <HeroCommand />
        <Features />
        <Demo />
        <QuickStart />
        <Helm />
        <Architecture />
        <Contribute />
      </main>
      <Footer />
    </>
  );
}

function Header() {
  const [open, setOpen] = useState(false);
  return (
    <header className="sticky top-0 z-40 border-b border-slate-200/70 bg-white/80 backdrop-blur-lg dark:border-white/10 dark:bg-abyss-950/80">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
        <a href="#" className="flex items-center gap-2.5 font-bold text-slate-900 dark:text-white">
          <img src="ice.png" alt="" className="h-8 w-8" />
          <span className="text-lg">IceGuard</span>
        </a>
        <nav className="hidden items-center gap-1 md:flex">
          {NAV.map((n) => (
            <a
              key={n.href}
              href={n.href}
              {...(n.href === LINKS.demo ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
              className="rounded-lg px-3 py-2 text-sm font-medium text-slate-600 transition hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
            >
              {n.label}
            </a>
          ))}
        </nav>
        <div className="flex items-center gap-1">
          <ThemeToggle />
          <a
            href={LINKS.repo}
            className="hidden items-center gap-2 rounded-lg bg-slate-900 px-3.5 py-2 text-sm font-medium text-white transition hover:bg-slate-700 sm:flex dark:bg-white dark:text-slate-900 dark:hover:bg-slate-200"
          >
            <GithubIcon className="h-4 w-4" /> GitHub
          </a>
          <button
            type="button"
            className="rounded-lg p-2 text-slate-600 md:hidden dark:text-slate-300"
            onClick={() => setOpen((o) => !o)}
            aria-label="Toggle menu"
            aria-expanded={open}
          >
            {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>
      {open && (
        <nav className="border-t border-slate-200 px-4 py-2 md:hidden dark:border-white/10">
          {[...NAV, { href: LINKS.repo, label: 'GitHub' }].map((n) => (
            <a
              key={n.href}
              href={n.href}
              {...(n.href === LINKS.demo ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
              onClick={() => setOpen(false)}
              className="block rounded-lg px-3 py-2.5 text-sm font-medium text-slate-700 dark:text-slate-300"
            >
              {n.label}
            </a>
          ))}
        </nav>
      )}
    </header>
  );
}

function Hero() {
  return (
    <div className="relative overflow-hidden">
      <div className="aurora absolute inset-0 -z-10" />
      <div className="grid-lines absolute inset-0 -z-10" />
      <div className="mx-auto grid max-w-6xl items-center gap-10 px-4 pb-16 pt-14 sm:px-6 md:grid-cols-[2fr_3fr] md:gap-14 md:pb-20 md:pt-20">
        {/* Icon on the left, like the Flink squirrel */}
        <img
          src="logo-1024.png"
          alt="IceGuard logo"
          width={1024}
          height={1024}
          className="mx-auto w-44 rounded-full bg-white shadow-[0_25px_60px_rgba(6,182,212,0.35)] ring-8 ring-ice-400/15 sm:w-56 md:w-full md:max-w-sm"
        />

        {/* Description on the right */}
        <div className="text-center md:text-left">
          <a
            href={LINKS.releases}
            className="mb-6 inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white/70 px-3 py-1 text-xs font-medium text-slate-600 backdrop-blur transition hover:border-ice-400 dark:border-white/10 dark:bg-white/5 dark:text-slate-300"
          >
            <span className="rounded-full bg-ice-500/15 px-2 py-0.5 text-ice-500">v{RELEASE_TAG}</span>
            Open source · Apache 2.0
            <ArrowRight className="h-3.5 w-3.5" />
          </a>
          <h1 className="text-5xl font-bold tracking-tight text-slate-900 sm:text-6xl dark:text-white">IceGuard</h1>
          <p className="mt-4 text-2xl font-semibold text-slate-800 sm:text-3xl dark:text-slate-100">
            The web console for your <span className="text-gradient">Apache Iceberg™</span> tables
          </p>
          <p className="mt-5 text-lg leading-relaxed text-slate-600 dark:text-slate-400">
            Browse, inspect and maintain Iceberg tables across REST, Nessie, Polaris and Unity catalogs, from
            schema evolution to scheduled compaction, in one self-hosted UI.
          </p>
          <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row md:justify-start sm:justify-center">
            <a
              href="#quick-start"
              className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-ice-500 to-glacier-500 px-6 py-3 font-semibold text-white shadow-lg shadow-glacier-500/25 transition hover:brightness-110"
            >
              <Rocket className="h-4 w-4" /> Get started
            </a>
            <a
              href={LINKS.demo}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-xl border border-ice-500/40 bg-ice-500/10 px-6 py-3 font-semibold text-ice-500 transition hover:bg-ice-500/20"
            >
              <MonitorPlay className="h-4 w-4" /> Live demo
            </a>
            <a
              href={LINKS.repo}
              className="inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-6 py-3 font-semibold text-slate-800 transition hover:border-slate-400 dark:border-white/15 dark:bg-white/5 dark:text-white dark:hover:bg-white/10"
            >
              <GithubIcon className="h-4 w-4" /> Star on GitHub
            </a>
          </div>
        </div>
      </div>

    </div>
  );
}

function HeroCommand() {
  return (
    <div className="mx-auto max-w-2xl px-4 pb-4 sm:px-6">
      <CodeBlock code={HERO_COMMAND} />
      <p className="mt-2 text-center text-xs text-slate-500">
        Then open <span className="font-mono">http://localhost:8090</span>
      </p>
    </div>
  );
}

function Features() {
  return (
    <Section
      id="features"
      eyebrow="Features"
      title="Everything an Iceberg admin reaches for"
      intro="IceGuard sits on top of the catalogs you already run. It is not a catalog: it's the console you were missing."
    >
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {FEATURES.map((f) => {
          const Icon = FEATURE_ICONS[f.icon];
          return (
            <div
              key={f.title}
              className="rounded-2xl border border-slate-200 bg-white p-6 transition hover:-translate-y-0.5 hover:border-ice-400/60 hover:shadow-lg dark:border-white/10 dark:bg-white/[0.03] dark:hover:border-ice-400/40"
            >
              <div className="mb-4 inline-flex rounded-xl bg-gradient-to-br from-ice-400/15 to-glacier-500/15 p-2.5 text-ice-500">
                <Icon className="h-5 w-5" />
              </div>
              <h3 className="mb-2 font-semibold text-slate-900 dark:text-white">{f.title}</h3>
              <p className="text-sm leading-relaxed text-slate-600 dark:text-slate-400">{f.text}</p>
            </div>
          );
        })}
      </div>

      <div className="mt-16">
        <p className="mb-6 text-center text-sm font-medium text-slate-500">Works with any Iceberg REST-compatible catalog</p>
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          {CATALOGS.map((c) => (
            <div
              key={c.name}
              className="flex flex-col items-center gap-3 rounded-2xl border border-slate-200 p-5 text-center dark:border-white/10"
            >
              <div className="flex h-12 items-center justify-center rounded-lg bg-white px-3 dark:bg-white/90">
                <img src={c.logo} alt="" className="h-9 w-9 object-contain" />
              </div>
              <span className="font-medium text-slate-900 dark:text-white">{c.name}</span>
            </div>
          ))}
        </div>
      </div>
    </Section>
  );
}

function Demo() {
  return (
    <div className="border-y border-slate-200 bg-slate-50 dark:border-white/10 dark:bg-abyss-900/60">
      <Section
        id="demo"
        eyebrow="Demo"
        title="See it in action"
        intro="Browse tagged catalogs, inspect a table's metadata, snapshots, storage and timeline, then run a Spark maintenance action and watch its result and logs."
      >
        <DemoVideo src={DEMO_VIDEO} />
        <div className="mt-10 flex flex-col items-center gap-3 text-center">
          <p className="text-slate-600 dark:text-slate-400">
            Rather click around yourself? The live demo runs on Apache Polaris with real branches, tags and
            schema history, read-only.
          </p>
          <a
            href={LINKS.demo}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-ice-500 to-glacier-500 px-6 py-3 font-semibold text-white shadow-lg shadow-glacier-500/25 transition hover:brightness-110"
          >
            <MonitorPlay className="h-4 w-4" /> Open the live demo
          </a>
        </div>
        <p className="mt-6 text-center text-sm text-slate-500">
          Video not loading?{' '}
          <a href={DEMO_VIDEO} className="font-medium text-ice-500 hover:underline">
            Download the MP4
          </a>
        </p>
      </Section>
    </div>
  );
}

function QuickStart() {
  const [active, setActive] = useState(INSTALL_OPTIONS[0].id);
  const option = INSTALL_OPTIONS.find((o) => o.id === active)!;
  return (
    <Section
      id="quick-start"
      eyebrow="Quick start"
      title="Running in two commands"
      intro={
        <>
          IceGuard is two services, a <strong>frontend</strong> and a <strong>backend</strong>, plus one
          required dependency: a <strong>PostgreSQL</strong> for its own state.
        </>
      }
    >
      <div className="mx-auto max-w-4xl">
        <div role="tablist" className="mb-6 flex flex-wrap justify-center gap-2">
          {INSTALL_OPTIONS.map((o) => (
            <button
              key={o.id}
              role="tab"
              type="button"
              aria-selected={o.id === active}
              onClick={() => setActive(o.id)}
              className={
                o.id === active
                  ? 'rounded-full bg-slate-900 px-4 py-2 text-sm font-medium text-white dark:bg-white dark:text-slate-900'
                  : 'rounded-full border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 transition hover:border-slate-400 dark:border-white/15 dark:text-slate-300'
              }
            >
              {o.title}
            </button>
          ))}
        </div>

        <div role="tabpanel" className="rounded-2xl border border-slate-200 bg-white p-6 sm:p-8 dark:border-white/10 dark:bg-white/[0.03]">
          <p className="mb-6 text-slate-600 dark:text-slate-400">{option.blurb}</p>
          <ol className="space-y-5">
            {option.steps.map((s, i) => (
              <li key={s.label} className="flex gap-4">
                <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-ice-500/15 text-xs font-bold text-ice-500">
                  {i + 1}
                </span>
                <div className="min-w-0 flex-1">
                  <CodeBlock label={s.label} code={s.code} />
                </div>
              </li>
            ))}
          </ol>
          {option.open && (
            <p className="mt-6 flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400">
              <ExternalLink className="h-4 w-4 text-ice-500" /> Then open{' '}
              <span className="font-mono text-slate-900 dark:text-white">{option.open}</span>
            </p>
          )}
        </div>

        <div className="mt-8 grid gap-6 rounded-2xl border border-dashed border-slate-300 p-6 sm:p-8 md:grid-cols-[1fr_1.2fr] dark:border-white/15">
          <div>
            <h3 className="mb-2 flex items-center gap-2 font-semibold text-slate-900 dark:text-white">
              <Database className="h-5 w-5 text-ice-500" /> Add your first catalog
            </h3>
            <p className="text-sm text-slate-600 dark:text-slate-400">
              With the sandbox running, go to <strong>Catalogs → Add Catalog</strong> and register the bundled
              REST catalog. Use Docker service names: the backend reaches them over the Compose network.
            </p>
          </div>
          <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-sm">
            {FIRST_CATALOG.map(([k, v]) => (
              <div key={k} className="contents">
                <dt className="text-slate-500">{k}</dt>
                <dd className="break-all font-mono text-slate-900 dark:text-slate-100">{v}</dd>
              </div>
            ))}
          </dl>
        </div>
      </div>
    </Section>
  );
}

function Helm() {
  return (
    <div className="border-y border-slate-200 bg-slate-50 dark:border-white/10 dark:bg-abyss-900/60">
      <Section
        id="helm"
        eyebrow="Kubernetes"
        title="Deploy with Helm"
        intro="The chart deploys the two IceGuard services against a PostgreSQL you provide. Flyway owns the schema and migrates it at startup."
      >
        <div className="mx-auto grid max-w-5xl gap-8 lg:grid-cols-[1.4fr_1fr]">
          <ol className="min-w-0 space-y-5">
            {HELM_STEPS.map((s, i) => (
              <li key={s.label} className="flex gap-4">
                <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-glacier-500/15 text-xs font-bold text-glacier-500">
                  {i + 1}
                </span>
                <div className="min-w-0 flex-1">
                  <CodeBlock label={s.label} code={s.code} />
                </div>
              </li>
            ))}
          </ol>
          <div className="min-w-0 space-y-4">
            <div className="rounded-2xl border border-slate-200 bg-white p-6 dark:border-white/10 dark:bg-white/[0.03]">
              <h3 className="mb-3 flex items-center gap-2 font-semibold text-slate-900 dark:text-white">
                <Ship className="h-5 w-5 text-glacier-500" /> Good to know
              </h3>
              <ul className="space-y-2 text-sm text-slate-600 dark:text-slate-400">
                <li>• The DB password comes from a Secret (key <code className="font-mono">password</code>).</li>
                <li>• Managed Postgres? Pass the full URL: <code className="font-mono">--set database.jdbcUrl=…</code></li>
                <li>• Ingress, network policies, OIDC, replicas and PDBs are all in the values.</li>
              </ul>
              <a href={LINKS.helmReadme} className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-ice-500 hover:underline">
                Full values reference <ArrowRight className="h-3.5 w-3.5" />
              </a>
            </div>
            <div>
              <p className="mb-2 flex items-center gap-2 text-sm font-medium text-slate-700 dark:text-slate-300">
                <Container className="h-4 w-4" /> Prefer plain kubectl? Render, then apply:
              </p>
              <CodeBlock code={HELM_TEMPLATE} />
            </div>
          </div>
        </div>
      </Section>
    </div>
  );
}

function Architecture() {
  const box = 'rounded-xl border px-4 py-3 text-sm font-medium';
  return (
    <Section
      id="architecture"
      eyebrow="Architecture"
      title="Small footprint, your infrastructure"
      intro="IceGuard's own state lives in your PostgreSQL. Table data and metadata stay in your object store, behind your catalogs."
    >
      <div className="mx-auto grid max-w-4xl items-center gap-6 md:grid-cols-[1fr_auto_1fr]">
        <div className="rounded-2xl border-2 border-ice-400/50 bg-ice-400/5 p-5">
          <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-ice-500">IceGuard</p>
          <div className="space-y-2">
            <div className={`${box} border-slate-200 bg-white dark:border-white/10 dark:bg-white/5`}>React UI</div>
            <div className={`${box} border-slate-200 bg-white dark:border-white/10 dark:bg-white/5`}>Quarkus REST API · Java 21</div>
          </div>
        </div>
        <ArrowRight className="mx-auto h-6 w-6 rotate-90 text-slate-400 md:rotate-0" />
        <div className="space-y-3">
          <div className={`${box} border-glacier-400/40 bg-glacier-500/5`}>
            <p className="text-xs text-slate-500">Required</p>PostgreSQL for IceGuard state
          </div>
          <div className={`${box} border-slate-200 dark:border-white/10`}>
            <p className="text-xs text-slate-500">Yours</p>Iceberg catalogs: REST · Nessie · Polaris · Unity
          </div>
          <div className={`${box} border-slate-200 dark:border-white/10`}>
            <p className="text-xs text-slate-500">Yours</p>Object store: S3, MinIO and friends
          </div>
          <div className={`${box} border-dashed border-slate-300 dark:border-white/15`}>
            <p className="text-xs text-slate-500">Optional</p>Spark, local or cluster, for real compaction
          </div>
        </div>
      </div>
    </Section>
  );
}

function Contribute() {
  return (
    <div className="mx-auto max-w-6xl px-4 pb-24 sm:px-6">
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-abyss-900 via-slate-900 to-indigo-950 px-6 py-14 text-center sm:px-12">
        <div className="grid-lines absolute inset-0" />
        <div className="relative">
          <h2 className="text-3xl font-bold text-white sm:text-4xl">Built in the open</h2>
          <p className="mx-auto mt-4 max-w-xl text-slate-300">
            Issues, ideas and pull requests are welcome. Good first issues are labelled to get you started.
          </p>
          <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
            <a href={LINKS.repo} className="inline-flex items-center justify-center gap-2 rounded-xl bg-white px-6 py-3 font-semibold text-slate-900 transition hover:bg-slate-200">
              <GithubIcon className="h-4 w-4" /> adelfardi/iceguard
            </a>
            <a href={LINKS.contributing} className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/20 px-6 py-3 font-semibold text-white transition hover:bg-white/10">
              <BookOpen className="h-4 w-4" /> Contributing guide
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}

function Footer() {
  return (
    <footer className="border-t border-slate-200 dark:border-white/10">
      <div className="mx-auto flex max-w-6xl flex-col gap-6 px-4 py-10 text-sm text-slate-500 sm:px-6 md:flex-row md:items-start md:justify-between">
        <div className="max-w-md space-y-2">
          <div className="flex items-center gap-2 font-semibold text-slate-900 dark:text-white">
            <img src="ice.png" alt="" className="h-6 w-6" /> IceGuard
          </div>
          <p>
            Independent community project, not affiliated with or endorsed by the Apache Software Foundation.
            “Apache”, “Apache Iceberg”, “Iceberg” and “Apache Polaris” are trademarks of the ASF.
          </p>
        </div>
        <div className="flex flex-wrap gap-x-6 gap-y-2">
          <a href={LINKS.repo} className="hover:text-slate-900 dark:hover:text-white">GitHub</a>
          <a href={LINKS.releases} className="hover:text-slate-900 dark:hover:text-white">Releases</a>
          <a href={LINKS.images} className="hover:text-slate-900 dark:hover:text-white">Container images</a>
          <a href={LINKS.issues} className="hover:text-slate-900 dark:hover:text-white">Issues</a>
          <a href={LINKS.license} className="hover:text-slate-900 dark:hover:text-white">Apache 2.0 license</a>
        </div>
      </div>
    </footer>
  );
}
