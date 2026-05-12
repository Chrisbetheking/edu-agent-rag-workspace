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
}: {
  id?: string;
  title: string;
  subtitle?: string;
  badge?: ReactNode;
  children: ReactNode;
  defaultOpen?: boolean;
}) {
  return (
    <details id={id} className="fold-card section-fold" open={defaultOpen}>
      <summary>
        <span>
          <strong>{title}</strong>
          {subtitle && <em>{subtitle}</em>}
        </span>
        {badge && <b>{badge}</b>}
      </summary>
      <div className="fold-body">{children}</div>
    </details>
  );
}

export function SectionNav({ items }: { items: Array<{ id: string; label: string }> }) {
  if (!items.length) return null;
  return (
    <nav className="section-nav" aria-label="页面目录">
      <span>目录</span>
      {items.map((item) => (
        <a key={item.id} href={`#${item.id}`}>{item.label}</a>
      ))}
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
