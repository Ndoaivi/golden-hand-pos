import { useEffect, useRef } from 'react';
import type { ReactNode } from 'react';
import { countdown, money, status } from '../../../../packages/domain/index.ts';
import type { State, Table, TableStatus } from '../../../../packages/domain/index.ts';
const paths: Record<string, ReactNode> = {
    tables: <>
    <rect x="4" y="4" width="6" height="6" rx="1"/>
    <rect x="14" y="4" width="6" height="6" rx="1"/>
    <rect x="4" y="14" width="6" height="6" rx="1"/>
    <rect x="14" y="14" width="6" height="6" rx="1"/>
    </>,
    overview: <>
    <path d="M3 10 12 3l9 7v10a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1Z"/>
    <path d="M9 21v-8h6v8"/>
    </>,
    coffee: <>
    <path d="M4 8h12v7a5 5 0 0 1-5 5H9a5 5 0 0 1-5-5Z"/>
    <path d="M16 9h2a3 3 0 0 1 0 6h-2M7 2v3m4-3v3m4-3v3M2 22h18"/>
    </>,
    snack: <>
    <path d="m4 9 3 12h10l3-12ZM7 9 6 3m4 6V2m4 7V3m3 6 1-7"/>
    </>,
    water: <>
    <path d="M9 3h6v4l2 3v10a1 1 0 0 1-1 1H8a1 1 0 0 1-1-1V10l2-3ZM9 3V1h6v2M7 13h10"/>
    </>,
    drink: <>
    <path d="M6 5h12v14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2ZM7 2h10M6 10h12M9 15h6"/>
    </>,
    tea: <>
    <path d="M4 7h16l-3 14H7ZM12 7l4-5h5M9 11h6m-5 4h4"/>
    </>,
    receipt: <>
    <path d="M6 3h12v18l-3-2-3 2-3-2-3 2ZM9 7h6M9 11h6m-6 4h4"/>
    </>,
    wallet: <>
    <path d="M20 7H5a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h13v5M3 5v15a2 2 0 0 0 2 2h15V7m0 5h-6v5h6"/>
    <path d="M16 14.5h.1"/>
    </>,
    clock: <>
    <circle cx="12" cy="12" r="9"/>
    <path d="M12 7v5l3 2"/>
    </>,
    inventory: <>
    <path d="m3 7 9-5 9 5v10l-9 5-9-5ZM3 7l9 5 9-5m-9 5v10M7 4l9 5"/>
    </>,
    chart: <>
    <path d="M3 3v18h18M7 16v-5m5 5V7m5 9v-3"/>
    </>,
    staff: <>
    <circle cx="9" cy="7" r="3"/>
    <path d="M3 21v-4a6 6 0 0 1 12 0v4m1-17a3 3 0 0 1 0 6m2 4a5 5 0 0 1 3 5v2"/>
    </>,
    shield: <>
    <path d="m12 2 8 4v6c0 5-8 10-8 10S4 17 4 12V6ZM8 12l3 3 5-6"/>
    </>,
    history: <>
    <path d="M3 11a9 9 0 1 1 2 7M3 4v7h7M12 7v5l3 2"/>
    </>,
    arrow: <path d="M5 12h14m-5-5 5 5-5 5"/>,
    plus: <path d="M12 5v14M5 12h14"/>,
    check: <path d="m5 12 4 4L19 6"/>,
    close: <path d="m6 6 12 12M6 18 18 6"/>,
    search: <>
    <circle cx="10" cy="10" r="6"/>
    <path d="m15 15 6 6"/>
    </>,
    alert: <>
    <path d="m12 3 10 18H2ZM12 9v5m0 3h.1"/>
    </>,
    print: <>
    <path d="M7 7V2h10v5M7 17H4V8h16v9h-3M7 13h10v9H7Z"/>
    <path d="M17 10h.1"/>
    </>,
    logout: <>
    <path d="M9 3H3v18h6m0-9h12m-4-4 4 4-4 4"/>
    </>,
    download: <>
    <path d="M12 3v12m-5-5 5 5 5-5M3 16v5h18v-5"/>
    </>,
    crown: <>
    <path d="m3 6 4 4 5-7 5 7 4-4-3 12H6ZM6 22h12"/>
    </>,
    menu: <path d="M4 6h16M4 12h16M4 18h16"/>,
};
export function Icon({ name, size = 20 }: {
    name: string;
    size?: number;
}) {
    return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.65" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{paths[name] ?? paths.tables}</svg>;
}
export function Brand({ large = false }: {
    large?: boolean;
}) {
    return <div className={`brand ${large ? 'brand-large' : ''}`}>
    <img src="/brand/golden-hand-original.jpg" alt="Logo asli GOLDEN HAND MAHJONG" width="1280" height="995"/>
    <span className="sr-only">GOLDEN HAND MAHJONG</span>
    </div>;
}
export const labels: Record<TableStatus, string> = { active: 'Aktif', available: 'Tersedia', expired: 'Waktu habis', cleaning: 'Cleaning' };
export function Badge({ kind, children }: {
    kind?: string;
    children: ReactNode;
}) {
    return <span className={`badge ${kind ?? ''}`}>
    <span className="status-dot"/>{children}</span>;
}
export function Empty({ icon = 'receipt', title, children }: {
    icon?: string;
    title: string;
    children?: ReactNode;
}) {
    return <div className="empty-state">
    <span className="empty-icon">
    <Icon name={icon} size={30}/>
    </span>
    <h3>{title}</h3>{children}</div>;
}
export function TableCard({ table, now, selected, compact, onClick, state }: {
    table: Table;
    now: number;
    selected?: boolean;
    compact?: boolean;
    onClick: () => void;
    state: State;
}) {
    const st = status(table, now);
    const pending = state.intents.some(i => i.tableId === table.id && i.status === 'pending');
    return <button className={`table-card ${st} ${selected ? 'selected' : ''} ${compact ? 'compact' : ''}`} onClick={onClick} aria-pressed={selected} aria-label={`Meja ${String(table.id).padStart(2, '0')} ${labels[st]}`}>
    <div className="table-card-top">
    <span className="table-no">{String(table.id).padStart(2, '0')}</span>
    <Badge kind={st}>{pending ? 'Bayar pending' : labels[st]}</Badge>
    </div>
    <div className="table-illustration" aria-hidden="true">
    <i />
    <i />
    <i />
    <i />
    <span>發</span>
    </div>
    <div className="table-card-bottom">
    <div>
    <h3>Meja {String(table.id).padStart(2, '0')}</h3>
    <span className="muted">{table.kind === 'VIP' && <Icon name="crown" size={12}/>} {table.kind}</span>
    </div>
    <div className="table-time">{table.session ? countdown(table.session.expires, now) : <Icon name={st === 'cleaning' ? 'check' : 'plus'} size={24}/>}<small>{table.session ? st === 'expired' ? 'Software cutoff' : 'Sisa waktu' : st === 'cleaning' ? 'Persiapan meja' : 'Mulai sesi'}</small>
    </div>
    </div>
    {table.session && <div className="table-balance">
        <span>Sisa bayar</span>
        <strong>{money(Math.max(0, table.session.charges.reduce((v, c) => v + c.amount, 0) - table.session.payments.reduce((v, p) => v + p.amount, 0)))}</strong>
        </div>}
  </button>;
}
export function Modal({ title, subtitle, onClose, children, wide = false }: {
    title: string;
    subtitle?: string;
    onClose: () => void;
    children: ReactNode;
    wide?: boolean;
}) {
    const ref = useRef<HTMLDivElement>(null);
    const close = useRef(onClose);
    close.current = onClose;
    useEffect(() => {
        const previous = document.activeElement as HTMLElement | null;
        const oldOverflow = document.body.style.overflow;
        document.body.style.overflow = 'hidden';
        const dialog = ref.current;
        const focusable = () => Array.from(dialog?.querySelectorAll<HTMLElement>('button:not(:disabled), input:not(:disabled), select:not(:disabled), textarea:not(:disabled), [tabindex="0"]') ?? []).filter(el => el.getClientRects().length > 0);
        (focusable().find(el => el.tagName === 'INPUT' || el.tagName === 'SELECT') ?? dialog)?.focus();
        function key(event: KeyboardEvent) {
            if (event.key === 'Escape')
                close.current();
            if (event.key !== 'Tab')
                return;
            const elements = focusable(), first = elements[0], last = elements.at(-1);
            if (!first) {
                event.preventDefault();
                dialog?.focus();
                return;
            }
            if (event.shiftKey && document.activeElement === first) {
                event.preventDefault();
                last?.focus();
            }
            else if (!event.shiftKey && document.activeElement === last) {
                event.preventDefault();
                first.focus();
            }
        }
        window.addEventListener('keydown', key);
        return () => { window.removeEventListener('keydown', key); document.body.style.overflow = oldOverflow; previous?.focus(); };
    }, []);
    return <div className="modal-overlay" onMouseDown={e => { if (e.target === e.currentTarget)
        onClose(); }}>
    <div className={`modal ${wide ? 'wide' : ''}`} role="dialog" aria-modal="true" aria-labelledby="dialog-title" ref={ref} tabIndex={-1}>
    <div className="modal-head">
    <div>
    <span className="eyebrow">GOLDEN HAND MAHJONG</span>
    <h2 id="dialog-title">{title}</h2>{subtitle && <p>{subtitle}</p>}</div>
    <button className="icon-button" aria-label="Tutup dialog" onClick={onClose}>
    <Icon name="close"/>
    </button>
    </div>{children}
  </div>
    </div>;
}
export function Metric({ title, value, detail, icon, gold }: {
    title: string;
    value: ReactNode;
    detail: ReactNode;
    icon: string;
    gold?: boolean;
}) {
    return <div className={`metric ${gold ? 'metric-gold' : ''}`}>
    <div className="metric-title">{title}<Icon name={icon}/>
    </div>
    <strong className="metric-value">{value}</strong>
    <small>{detail}</small>
    </div>;
}
