import { getPublicUrl } from '../lib/assets';

interface SectionPlaceholderProps {
  eyebrow: string;
  title: string;
  description: string;
  icon: string;
}

export function SectionPlaceholder({ eyebrow, title, description, icon }: SectionPlaceholderProps) {
  return (
    <section className="flex min-h-[calc(100dvh-160px)] flex-col items-center justify-center px-5 py-12 text-center">
      <p className="mb-3 text-xs font-semibold tracking-[0.14em] text-bronze">{eyebrow}</p>
      <img
        src={getPublicUrl(icon)}
        alt=""
        width={48}
        height={48}
        aria-hidden="true"
        className="mb-5 opacity-80"
      />
      <h2 className="font-heading text-h1 text-bone">{title}</h2>
      <p className="mt-3 max-w-[310px] text-body text-bone/65">{description}</p>
    </section>
  );
}
