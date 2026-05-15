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

function openParentDetails(target: HTMLElement) {
  let node: HTMLElement | null = target;
  while (node) {
    if (node instanceof HTMLDetailsElement) node.open = true;
    node = node.parentElement;
  }
}

function scrollToElement(id: string) {
  const target = document.getElementById(id);
  if (!target) return;
  openParentDetails(target);

  window.requestAnimationFrame(() => {
    target.scrollIntoView({ behavior: 'smooth', block: 'start', inline: 'nearest' });
    target.classList.add('section-target-flash');
    window.setTimeout(() => target.classList.remove('section-target-flash'), 1400);
    try {
      window.history.replaceState(null, '', `${window.location.pathname}${window.location.search}#${id}`);
    } catch {}
  });
}

function scrollToPageTop() {
  const root = document.querySelector('.page-stack') || document.querySelector('.main') || document.body;
  if (root instanceof HTMLElement) {
    root.scrollIntoView({ behavior: 'smooth', block: 'start' });
    return;
  }
  window.scrollTo({ top: 0, behavior: 'smooth' });
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

  return (
    <nav className="section-nav section-nav-readable" aria-label="页面目录">
      <div className="section-nav-title">
        <strong>目录</strong>
        <small>点击跳到对应模块</small>
      </div>
      <div className="section-nav-actions">
        {items.map((item) => (
          <button key={item.id} type="button" onClick={() => scrollToElement(item.id)}>
            {item.label}
          </button>
        ))}
      </div>
      <button className="section-nav-top" type="button" onClick={scrollToPageTop}>回到顶部</button>
    </nav>
  );
}

function readableSegments(value: unknown) {
  let text = toDisplayText(value)
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .trim();

  if (!text) return [];

  text = text
    .replace(/\s*(#{1,6}\s*)/g, '\n\n$1')
    .replace(/\s+(标签[:：])/g, '\n$1')
    .replace(/([。！？；;])\s*(?=(适用对象|核心材料|核心要求|三档定位|专业方向|项目示例|代表院校|推荐专业|申请材料|材料补强|时间线|风险提示|下一步|适合背景|课程匹配|判断依据|申请建议|补强重点|注意事项)[:：]?)/g, '$1\n\n')
    .replace(/\s+(?=([-•·]|[0-9]+[.、．]|[一二三四五六七八九十]+[、.．])\s*)/g, '\n')
    .replace(/\s+(?=(适用对象|核心材料|核心要求|三档定位|专业方向|项目示例|代表院校|推荐专业|申请材料|材料补强|时间线|风险提示|下一步|适合背景|课程匹配|判断依据|申请建议|补强重点|注意事项)[:：])/g, '\n\n');

  return text
    .split(/\n+/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const heading = line.match(/^(#{1,6})\s*(.+)$/);
      if (heading) return { type: 'heading', text: heading[2].trim() };
      const list = line.match(/^([-•·]|[0-9]+[.、．]|[一二三四五六七八九十]+[、.．])\s*(.+)$/);
      if (list) return { type: 'list', text: list[2].trim() };
      if (/^(标签|适用对象|核心材料|核心要求|三档定位|专业方向|项目示例|代表院校|推荐专业|申请材料|材料补强|时间线|风险提示|下一步|适合背景|课程匹配|判断依据|申请建议|补强重点|注意事项)[:：]/.test(line)) {
        return { type: 'label', text: line };
      }
      return { type: 'paragraph', text: line };
    });
}

export function TextBlock({ value, className = 'pre-line' }: { value: unknown; className?: string }) {
  const segments = readableSegments(value);
  if (!segments.length) return <p className={className}>暂无内容</p>;

  return (
    <div className={`readable-text ${className}`.trim()}>
      {segments.map((segment, index) => (
        <p className={`readable-line readable-${segment.type}`} key={`${segment.type}-${index}`}>
          {segment.type === 'list' && <span className="readable-bullet">•</span>}
          <span>{segment.text}</span>
        </p>
      ))}
    </div>
  );
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
