import { useEffect, useState } from 'react';
import { seed, transition, validateState } from '../../../../packages/domain/index.ts';
import type { Action, Role, State } from '../../../../packages/domain/index.ts';
export const STORAGE_KEY = 'golden-hand-pos-phase1-v1';
export function useDemoStore() {
    const [state, setState] = useState<State | null>(null);
    const [error, setError] = useState('');
    useEffect(() => {
        function load() {
            try {
                const raw = localStorage.getItem(STORAGE_KEY);
                const data: unknown = raw ? JSON.parse(raw) : seed();
                if (!validateState(data))
                    throw new Error('Data demo tersimpan tidak valid. Ekspor data sebelum mereset demo.');
                if (!raw)
                    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
                setState(data);
                setError('');
            }
            catch (e) {
                setError(e instanceof Error ? e.message : 'Penyimpanan browser tidak tersedia.');
            }
        }
        load();
        const sync = (event: StorageEvent) => { if (event.key === STORAGE_KEY || event.key === null)
            load(); };
        window.addEventListener('storage', sync);
        return () => window.removeEventListener('storage', sync);
    }, []);
    function dispatch(action: Action, role: Role) {
        if (!state)
            throw new Error('Data belum siap.');
        const raw = localStorage.getItem(STORAGE_KEY);
        const current: unknown = raw ? JSON.parse(raw) : null;
        if (!validateState(current))
            throw new Error('Penyimpanan berubah atau tidak valid. Muat ulang halaman.');
        if (current.revision !== state.revision) {
            setState(current);
            throw new Error('Data diperbarui di tab lain. Periksa ulang lalu coba lagi.');
        }
        const next = transition(current, action, role);
        // Persist first; failure must not appear as a successful financial operation.
        localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
        setState(next);
    }
    function reset() {
        const next = seed();
        localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
        setState(next);
        setError('');
    }
    return { state, error, dispatch, reset };
}
export function downloadData() {
    const raw = localStorage.getItem(STORAGE_KEY) ?? '{}';
    download('golden-hand-demo-backup.json', raw, 'application/json');
}
export function download(name: string, content: string, type: string) {
    const url = URL.createObjectURL(new Blob([content], { type }));
    const a = document.createElement('a');
    a.href = url;
    a.download = name;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
}
