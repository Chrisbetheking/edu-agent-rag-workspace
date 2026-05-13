import { ReactNode } from 'react';

export function toDisplayText(value: unknown): string {
  if (value === null || value === undefined || value === '') return '';
  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') return String(value);
  if (Array.isArray(value)) return value.map(toDisplayText).filter(Boolean).join('\n');
  if (typeof value === 'object') {
    const obj = value as Record<string, unknown>;
    const preferred = ['text', 'content', 'message', 'answer', 'desc', 'description', 'name', 'title', 'value'];
    for (const key of preferred) {
      if (obj[key]) return toDisplayText(obj[key]);
    }
    return Object.entries(obj)
      .filter(([, v]) => v !== undefined && v !== null && v !== '')
      .map(([k, v]) => `${k}: ${toDisplayText(v)}`)
      .join('\n');
  }
  return String(value);
}

export function FoldSection({
  id,
  title,
  subtitle,
  badge,
  children,
  defaultOpen = false,
  className = '',
  bodyClassName = '',
}: {
  id?: string;
  title: string;
  subtitle?: string;
  badge?: ReactNode;
  children: ReactNode;
  defaultOpen?: boolean;
  className?: string;
  bodyClassName?: string;
}) {
  return (
    <details id={id} className={`fold-card section-fold ${className}`.trim()} open={defaultOpen}>
      <summary>
        <span>
          <strong>{title}</strong>
          {subtitle && <em>{subtitle}</em>}
        </span>
        {badge && <b>{badge}</b>}
      </summary>
      <div className={`fold-body ${bodyClassName}`.trim()}>{children}</div>
    </details>
  );
}

export function SectionGroup({
  id,
  title,
  subtitle,
  children,
  defaultOpen = true,
  className = '',
  bodyClassName = '',
}: {
  id?: string;
  title: string;
  subtitle?: string;
  children: ReactNode;
  defaultOpen?: boolean;
  className?: string;
  bodyClassName?: string;
}) {
  return (
    <FoldSection
      id={id}
      title={title}
      subtitle={subtitle}
      defaultOpen={defaultOpen}
      className={`section-group-card ${className}`.trim()}
      bodyClassName={bodyClassName}
    >
      {children}
    </FoldSection>
  );
}

export function SectionNav({ items }: { items: Array<{ id: string; label: string }> }) {
  if (!items.length) return null;

  function getScrollRoot(): HTMLElement | null {
    return (document.querySelector('.main') as HTMLElement | null)
      || (document.querySelector('[data-scroll-root="true"]') as HTMLElement | null)
      || document.scrollingElement as HTMLElement | null;
  }

  function openAncestorDetails(target: HTMLElement) {
    let node: HTMLElement | null = target;
    while (node) {
      if (node.tagName?.toLowerCase() === 'details') (node as HTMLDetailsElement).open = true;
      node = node.parentElement;
    }
  }

  function scrollToId(id: string) {
    const target = document.getElementById(id);
    if (!target) return;
    openAncestorDetails(target);
    requestAnimationFrame(() => {
      const root = getScrollRoot();
      const offset = 18;
      if (root && root !== document.body && root !== document.documentElement) {
        const rootRect = root.getBoundingClientRect();
        const targetRect = target.getBoundingClientRect();
        const top = targetRect.top - rootRect.top + root.scrollTop - offset;
        root.scrollTo({ top: Math.max(0, top), behavior: 'smooth' });
      } else {
        const top = target.getBoundingClientRect().top + window.scrollY - offset;
        window.scrollTo({ top: Math.max(0, top), behavior: 'smooth' });
      }
      window.history.replaceState(null, '', `#${id}`);
    });
  }

  function backToTop() {
    const root = getScrollRoot();
    if (root && root !== document.body && root !== document.documentElement) root.scrollTo({ top: 0, behavior: 'smooth' });
    window.scrollTo({ top: 0, behavior: 'smooth' });
    window.history.replaceState(null, '', window.location.pathname);
  }

  return (
    <nav className="section-nav section-nav-inline section-nav-v15 section-nav-v16" aria-label="页面目录">
      <div className="section-nav-label">
        <strong>目录</strong>
        <span>点一下直接到模块</span>
      </div>
      <div className="section-nav-links">
        {items.map((item) => (
          <button key={item.id} type="button" onClick={() => scrollToId(item.id)}>{item.label}</button>
        ))}
      </div>
      <button className="section-nav-top" type="button" onClick={backToTop}>回到顶部</button>
    </nav>
  );
}

export function TextBlock({ value, className = 'pre-line' }: { value: unknown; className?: string }) {
  return <p className={className}>{toDisplayText(value) || '暂无内容'}</p>;
}

export function ListBlock({ items }: { items: unknown }) {
  const arr = Array.isArray(items) ? items : (items ? [items] : []);
  if (!arr.length) return <p className="muted">暂无内容</p>;
  return <ul>{arr.map((item, index) => <li key={index}>{toDisplayText(item)}</li>)}</ul>;
}

export function CompactMetric({ label, value, note }: { label: string; value: ReactNode; note?: ReactNode }) {
  return (
    <div className="compact-metric">
      <span>{label}</span>
      <strong>{value}</strong>
      {note && <em>{note}</em>}
    </div>
  );
}

export function ResultShell({
  id,
  title,
  subtitle,
  aside,
  children,
  defaultOpen = true,
}: {
  id?: string;
  title: string;
  subtitle?: string;
  aside?: ReactNode;
  children: ReactNode;
  defaultOpen?: boolean;
}) {
  return (
    <SectionGroup id={id} title={title} subtitle={subtitle} defaultOpen={defaultOpen} bodyClassName="result-shell-body">
      <div className={aside ? 'result-shell-grid' : 'result-shell-single'}>
        {aside && <aside className="result-shell-aside">{aside}</aside>}
        <div className="result-shell-main">{children}</div>
      </div>
    </SectionGroup>
  );
}
