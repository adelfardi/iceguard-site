import { useEffect, useState, type ReactNode } from 'react';
import { Check, Copy, Moon, Play, Sun } from 'lucide-react';

export function GithubIcon({ className = 'h-5 w-5' }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" className={className}>
      <path d="M12 .5a11.5 11.5 0 0 0-3.64 22.41c.58.1.79-.25.79-.56v-2c-3.2.7-3.88-1.37-3.88-1.37-.52-1.33-1.28-1.69-1.28-1.69-1.05-.72.08-.7.08-.7 1.16.08 1.77 1.19 1.77 1.19 1.03 1.77 2.7 1.26 3.36.96.1-.75.4-1.26.73-1.55-2.55-.29-5.24-1.28-5.24-5.69 0-1.26.45-2.29 1.19-3.1-.12-.29-.52-1.46.11-3.05 0 0 .97-.31 3.17 1.18a11 11 0 0 1 5.77 0c2.2-1.49 3.17-1.18 3.17-1.18.63 1.59.23 2.76.11 3.05.74.81 1.19 1.84 1.19 3.1 0 4.42-2.7 5.39-5.26 5.68.41.36.78 1.06.78 2.14v3.17c0 .31.21.67.8.56A11.5 11.5 0 0 0 12 .5Z" />
    </svg>
  );
}

export function ThemeToggle() {
  const [dark, setDark] = useState(() => document.documentElement.classList.contains('dark'));
  useEffect(() => {
    document.documentElement.classList.toggle('dark', dark);
    try {
      localStorage.setItem('theme', dark ? 'dark' : 'light');
    } catch {
      /* private mode: theme just won't persist */
    }
  }, [dark]);
  return (
    <button
      type="button"
      onClick={() => setDark((d) => !d)}
      aria-label={dark ? 'Switch to light theme' : 'Switch to dark theme'}
      className="rounded-lg p-2 text-slate-500 transition hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-white/10 dark:hover:text-white"
    >
      {dark ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
    </button>
  );
}

export function CodeBlock({ code, label }: { code: string; label?: string }) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* clipboard blocked (http, iframe): the text is still selectable */
    }
  };
  return (
    <div>
      {label && <p className="mb-1.5 text-sm text-slate-500 dark:text-slate-400">{label}</p>}
      <div className="group relative rounded-xl border border-slate-800 bg-abyss-900 shadow-sm">
        <pre className="overflow-x-auto p-4 pr-12 font-mono text-[13px] leading-relaxed text-slate-100">
          {code.split('\n').map((line, i, lines) => {
            const continuation = i > 0 && lines[i - 1].endsWith('\\');
            return (
              <div key={i}>
                <span className="select-none text-ice-400">{continuation ? '  ' : '$ '}</span>
                {line}
              </div>
            );
          })}
        </pre>
        <button
          type="button"
          onClick={copy}
          aria-label="Copy to clipboard"
          className="absolute right-2 top-2 rounded-md p-2 text-slate-400 transition hover:bg-white/10 hover:text-white"
        >
          {copied ? <Check className="h-4 w-4 text-emerald-400" /> : <Copy className="h-4 w-4" />}
        </button>
      </div>
    </div>
  );
}

export function Section({ id, eyebrow, title, intro, children, className = '' }: {
  id: string;
  eyebrow: string;
  title: ReactNode;
  intro?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section id={id} className={`mx-auto max-w-6xl px-4 py-20 sm:px-6 sm:py-24 ${className}`}>
      <div className="mx-auto mb-12 max-w-2xl text-center">
        <p className="mb-3 text-sm font-semibold uppercase tracking-widest text-ice-500">{eyebrow}</p>
        <h2 className="text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl dark:text-white">{title}</h2>
        {intro && <p className="mt-4 text-lg text-slate-600 dark:text-slate-400">{intro}</p>}
      </div>
      {children}
    </section>
  );
}

/** Click-to-play facade: nothing is downloaded until the visitor asks for the video. */
export function DemoVideo({ src }: { src: string }) {
  const [playing, setPlaying] = useState(false);
  return (
    <div className="relative mx-auto max-w-5xl">
      <div className="absolute -inset-4 -z-10 rounded-[2rem] bg-gradient-to-r from-ice-400/30 via-sky-500/20 to-glacier-500/30 blur-2xl" />
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-slate-900 shadow-2xl dark:border-white/10">
        <div className="flex items-center gap-1.5 border-b border-white/10 bg-abyss-900 px-4 py-3">
          <span className="h-3 w-3 rounded-full bg-rose-400/80" />
          <span className="h-3 w-3 rounded-full bg-amber-400/80" />
          <span className="h-3 w-3 rounded-full bg-emerald-400/80" />
        </div>
        <div className="relative aspect-video">
          {playing ? (
            <video src={src} controls autoPlay playsInline className="h-full w-full bg-black" />
          ) : (
            <button
              type="button"
              onClick={() => setPlaying(true)}
              className="group absolute inset-0 flex flex-col items-center justify-center gap-5 bg-gradient-to-br from-abyss-900 via-slate-900 to-indigo-950"
              aria-label="Play the IceGuard demo video"
            >
              <div className="grid-lines absolute inset-0 opacity-60" />
              <img src="ice.png" alt="" className="relative h-20 w-20 drop-shadow-[0_0_30px_rgba(34,211,238,0.45)]" />
              <span className="relative flex h-16 w-16 items-center justify-center rounded-full bg-white/95 text-glacier-600 shadow-lg ring-8 ring-white/10 transition group-hover:scale-110">
                <Play className="ml-1 h-7 w-7 fill-current" />
              </span>
              <span className="relative text-sm text-slate-300">Watch the 70-second tour</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
