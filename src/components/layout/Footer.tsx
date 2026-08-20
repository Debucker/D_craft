import { Logo } from '@/components/brand/Logo';
import { site } from '@/content/site';

export function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer className="border-t border-line">
      <div className="shell flex flex-col gap-8 py-12 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <Logo size={24} className="text-faint" />
          <p className="text-sm text-muted">
            © {year} {site.name}. Built in {site.location.split(',')[0]}.
          </p>
        </div>

        <div className="flex items-center gap-6">
          <p className="text-xs text-faint">Next.js · TypeScript · Tailwind</p>
          <a
            href="#top"
            className="link-draw relative text-sm text-muted transition-colors duration-300 hover:text-fg"
          >
            Back to top
          </a>
        </div>
      </div>
    </footer>
  );
}
