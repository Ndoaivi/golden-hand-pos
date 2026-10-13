import { useEffect, useState } from 'react';
import { sessionEndingSoon, sessionReminderKey, time } from '../../../../packages/domain/index.ts';
import type { State, Table } from '../../../../packages/domain/index.ts';
import { Icon } from './ui.tsx';

const STORAGE_KEY = 'golden-hand-session-reminders-v1';
type Acknowledgements = Partial<Record<number, string>>;

function readAcknowledgements(): Acknowledgements {
    try {
        const value: unknown = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '{}');
        if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
        return Object.fromEntries(Object.entries(value).filter(([id, key]) =>
            /^[1-5]$/.test(id) && typeof key === 'string' && key.length <= 200));
    } catch { return {}; }
}

export function SessionReminders({ state, now, onViewTable }: {
    state: State; now: number; onViewTable: (id: number) => void;
}) {
    const [acknowledged, setAcknowledged] = useState(readAcknowledgements);
    const [error, setError] = useState('');
    useEffect(() => {
        const sync = (event: StorageEvent) => {
            if (event.key === STORAGE_KEY || event.key === null) setAcknowledged(readAcknowledgements());
        };
        window.addEventListener('storage', sync);
        return () => window.removeEventListener('storage', sync);
    }, []);
    const tables = state.tables.filter(table => sessionEndingSoon(table, now) &&
        acknowledged[table.id] !== sessionReminderKey(table));

    function acknowledge(table: Table) {
        const key = sessionReminderKey(table);
        if (!key) return;
        try {
            const next = { ...readAcknowledgements(), [table.id]: key };
            localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
            setAcknowledged(next);
            setError('');
        } catch { setError('Konfirmasi tidak dapat disimpan. Pengingat tetap aktif.'); }
    }

    if (!tables.length) return null;
    return <aside className="session-reminders" aria-label="Pengingat sesi meja">
        <div className="reminder-heading"><Icon name="clock" size={19}/><strong>Sesi segera berakhir</strong></div>
        <div role="alert" className="reminder-summary" key={tables.map(sessionReminderKey).join('|')}>
            {tables.map(table => `Meja ${String(table.id).padStart(2, '0')}`).join(', ')} · sisa 10 menit atau kurang.
        </div>
        {tables.map(table => <div className="reminder-row" key={sessionReminderKey(table)}>
            <button className="reminder-table" onClick={() => onViewTable(table.id)} aria-label={`Lihat meja ${String(table.id).padStart(2, '0')}`}>
                <strong>Meja {String(table.id).padStart(2, '0')}</strong>
                <span>Selesai {time(table.session!.expires)} WIB</span>
            </button>
            <button className="button small" onClick={() => acknowledge(table)} aria-label={`Sudah diingatkan meja ${String(table.id).padStart(2, '0')}`}>Sudah diingatkan</button>
        </div>)}
        {error && <p className="reminder-error" role="alert">{error}</p>}
    </aside>;
}
