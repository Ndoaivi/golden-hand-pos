import { Component, useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { date, openShift, time } from '../../../packages/domain/index.ts';
import type { Action, Role } from '../../../packages/domain/index.ts';
import { downloadData, useDemoStore } from './data/store.ts';
import { Brand, Empty, Icon } from './components/ui.tsx';
import { Dialogs } from './components/dialogs.tsx';
import type { Dialog } from './components/dialogs.tsx';
import { Cashier } from './features/cashier/Cashier.tsx';
import { Owner } from './features/owner/Owner.tsx';
const cashierNav = [{ id: 'tables', label: 'Meja & sesi', icon: 'tables' }, { id: 'menu', label: 'Food & beverage', icon: 'coffee' }, { id: 'transactions', label: 'Transaksi & shift', icon: 'receipt' }];
const ownerNav = [{ id: 'overview', label: 'Overview', icon: 'overview' }, { id: 'tables', label: 'Monitoring meja', icon: 'tables' }, { id: 'reports', label: 'Laporan penjualan', icon: 'chart' }, { id: 'catalog', label: 'Katalog & stok', icon: 'inventory' }, { id: 'pricing', label: 'Tarif meja', icon: 'wallet' }, { id: 'approvals', label: 'Refund & void', icon: 'shield' }, { id: 'staff', label: 'Staf & shift', icon: 'staff' }, { id: 'audit', label: 'Audit trail', icon: 'history' }];
function storedRole(): Role | null { try {
    const v = sessionStorage.getItem('golden-hand-demo-role');
    return v === 'cashier' || v === 'owner' ? v : null;
}
catch {
    return null;
} }
export default function App() {
    const store = useDemoStore();
    const [role, setRole] = useState<Role | null>(storedRole);
    const [view, setView] = useState(storedRole() === 'owner' ? 'overview' : 'tables');
    const [selected, setSelected] = useState(1);
    const [dialog, setDialog] = useState<Dialog | null>(null);
    const [now, setNow] = useState(Date.now());
    const [online, setOnline] = useState(navigator.onLine);
    const [navOpen, setNavOpen] = useState(false);
    const [toast, setToast] = useState<{
        text: string;
        error: boolean;
    } | null>(null);
    useEffect(() => {
        const timer = setInterval(() => setNow(Date.now()), 1000);
        const connected = () => setOnline(navigator.onLine);
        window.addEventListener('online', connected);
        window.addEventListener('offline', connected);
        return () => { clearInterval(timer); window.removeEventListener('online', connected); window.removeEventListener('offline', connected); };
    }, []);
    useEffect(() => { if (!toast)
        return; const timeout = setTimeout(() => setToast(null), 5000); return () => clearTimeout(timeout); }, [toast]);
    useEffect(() => {
        const pop = () => {
            const next: Role | null = window.location.pathname === '/admin' ? 'owner' : window.location.pathname === '/pos' ? 'cashier' : null;
            try {
                if (next)
                    sessionStorage.setItem('golden-hand-demo-role', next);
                else
                    sessionStorage.removeItem('golden-hand-demo-role');
            }
            catch { /* Demo can still run without session persistence. */ }
            setRole(next);
            setView(next === 'owner' ? 'overview' : 'tables');
            setDialog(null);
        };
        window.addEventListener('popstate', pop);
        return () => window.removeEventListener('popstate', pop);
    }, []);
    function enter(next: Role) {
        setRole(next);
        setView(next === 'owner' ? 'overview' : 'tables');
        setNavOpen(false);
        setDialog(null);
        try {
            sessionStorage.setItem('golden-hand-demo-role', next);
        }
        catch { /* Nonpersistent preview. */ }
        window.history.pushState({}, '', next === 'owner' ? '/admin' : '/pos');
        window.scrollTo({ top: 0 });
    }
    function logout() { try {
        sessionStorage.removeItem('golden-hand-demo-role');
    }
    catch { /* Nonpersistent preview. */ } setRole(null); setDialog(null); window.history.pushState({}, '', '/'); }
    function act(a: Action) { if (!role)
        throw new Error('Pilih role demo terlebih dahulu.'); store.dispatch(a, role); setToast({ text: a.type === 'payment' && a.method === 'cash' ? `Tunai ${new Intl.NumberFormat('id-ID').format(a.amount)} dicatat · kembalian ${new Intl.NumberFormat('id-ID').format(a.tendered - a.amount)}` : 'Perubahan demo berhasil disimpan.', error: false }); }
    function safeAction(a: Action) { try {
        act(a);
    }
    catch (e) {
        setToast({ text: e instanceof Error ? e.message : 'Gagal menyimpan.', error: true });
    } }
    function navigate(v: string) { setView(v); setNavOpen(false); window.scrollTo({ top: 0, behavior: 'smooth' }); }
    if (store.error)
        return <div className="system-screen">
        <Brand large/>
        <Empty icon="alert" title="Data demo tidak dapat dimuat">
        <p role="alert">{store.error}</p>
        <div className="button-row">
        <button className="button" onClick={downloadData}>Ekspor data tersimpan</button>
        <button className="button primary" onClick={() => window.location.reload()}>Coba lagi</button>
        <button className="button danger" onClick={() => { if (window.confirm('Hapus data demo browser ini dan buat ulang data contoh? Ekspor backup terlebih dahulu.')) {
            try {
                store.reset();
            }
            catch (e) {
                setToast({ text: e instanceof Error ? e.message : 'Penyimpanan tidak tersedia.', error: true });
            }
        } }}>Reset data demo</button>
        </div>
        </Empty>{toast && <p role="alert">{toast.text}</p>}</div>;
    if (!store.state)
        return <div className="system-screen" role="status">
        <Brand large/>
        <div className="loading-ring"/>
        <h2>Memuat POS…</h2>
        <p>Memuat lima meja dan data demo.</p>
        </div>;
    if (!role)
        return <div className="login-screen">
        <div className="login-story">
        <Brand large/>
        <span className="login-bottom">POINT OF SALE</span>
        </div>
        <div className="login-panel">
        <div className="login-panel-copy">
        <span className="eyebrow">GOLDEN HAND MAHJONG</span>
        <h2>Buka workspace</h2>
        <p>Pilih antarmuka untuk menjelajahi demo.</p>
        </div>
        <button className="login-role" onClick={() => enter('cashier')}>
        <span className="role-icon">
        <Icon name="tables" size={25}/>
        </span>
        <span>
        <strong>Cashier POS</strong>
        <small>Sesi meja, F&B, pembayaran & shift</small>
        </span>
        <Icon name="arrow"/>
        </button>
        <button className="login-role" onClick={() => enter('owner')}>
        <span className="role-icon">
        <Icon name="overview" size={25}/>
        </span>
        <span>
        <strong>Owner Dashboard</strong>
        <small>Monitoring, harga, stok & laporan</small>
        </span>
        <Icon name="arrow"/>
        </button>
        <div className="login-demo-note">
        <Icon name="shield" size={17}/>
        <p>Preview Phase 1 · data contoh lokal.<br />Pilihan role ini belum merupakan autentikasi. Gunakan hanya untuk evaluasi.</p>
        </div>
        </div>
        </div>;
    const state = store.state;
    const nav = role === 'owner' ? ownerNav : cashierNav;
    const shift = openShift(state);
    const navTitle = nav.find(n => n.id === view)?.label;
    return <div className={`app-shell ${role === 'owner' ? 'owner-shell' : 'cashier-shell'}`}>
    <a href="#main-content" className="skip-link">Lewati ke konten</a>{navOpen && <button className="nav-backdrop" aria-label="Tutup navigasi" onClick={() => setNavOpen(false)}/>}
    <aside className={`sidebar ${navOpen ? 'open' : ''}`}>
    <div className="sidebar-brand">
    <Brand />
    <span className="sidebar-mode">{role === 'owner' ? 'OWNER DASHBOARD' : 'CASHIER POS'}</span>
    </div>
    <div className="sidebar-separator"/>
    <span className="nav-group">{role === 'owner' ? 'OWNER' : 'KASIR'}</span>
    <nav aria-label={role === 'owner' ? 'Navigasi owner' : 'Navigasi kasir'}>{nav.map(n => <button key={n.id} className={`nav-item ${view === n.id ? 'selected' : ''}`} onClick={() => navigate(n.id)} aria-current={view === n.id ? 'page' : undefined}>
        <Icon name={n.icon}/>
        <span>{n.label}</span>{n.id === 'approvals' && state.approvals.some(a => a.status === 'pending') && <span className="nav-count">{state.approvals.filter(a => a.status === 'pending').length}</span>}</button>)}</nav>
    <div className="sidebar-bottom">
    <div className="demo-status">
    <span />
    <strong>Demo workspace</strong>
    <small>Data lokal · Phase 1</small>
    </div>
    <button className="sidebar-tool" onClick={() => enter(role === 'owner' ? 'cashier' : 'owner')}>
    <Icon name={role === 'owner' ? 'tables' : 'crown'} size={16}/>{role === 'owner' ? 'Buka demo kasir' : 'Buka demo owner'}<Icon name="arrow" size={14}/>
    </button>
    <button className="sidebar-tool" onClick={() => setDialog({ kind: 'reset' })}>
    <Icon name="history" size={16}/>Reset demo</button>
    <div className="profile">
    <span className="profile-avatar">{role === 'owner' ? 'GH' : 'RP'}</span>
    <div>
    <strong>{role === 'owner' ? 'Owner Demo' : 'Rina Putri'}</strong>
    <small>{role === 'owner' ? 'Business owner' : shift ? 'Shift terbuka · Kasir' : 'Shift ditutup'}</small>
    </div>
    <button className="icon-button" onClick={logout} aria-label="Keluar demo">
    <Icon name="logout" size={18}/>
    </button>
    </div>
    </div>
    </aside>
    <div className="main-shell">
    <div className="mobile-brand-header"><Brand /></div>
    <header className="topbar">
    <div className="topbar-breadcrumb">
    <button className="icon-button mobile-menu" aria-label="Buka navigasi" aria-expanded={navOpen} onClick={() => setNavOpen(!navOpen)}>
    <Icon name="menu"/>
    </button>
    <span>{role === 'owner' ? 'Owner Dashboard' : 'Cashier POS'}</span>
    <span className="breadcrumb-divider">/</span>
    <strong>{navTitle}</strong>
    </div>
    <div className="topbar-right">
    <span className="demo-pill">DEMO</span>
    <span className="header-date">{date(now)}</span>
    <strong className="header-clock">{time(now)} <small>WIB</small>
    </strong>{role === 'cashier' && <button className="button small shift-button" onClick={() => setDialog({ kind: 'shift' })}>
        <Icon name="wallet" size={16}/>{shift ? 'Shift terbuka' : 'Buka shift'}</button>}</div>
    </header>
      {!online && <div className="offline-banner" role="status">
        <Icon name="alert" size={17}/>Offline · demo memakai data browser ini. Tidak tersinkron ke server.</div>}
      <main id="main-content" tabIndex={-1}>{role === 'owner' ? <Owner state={state} now={now} view={view} onDialog={setDialog} onAction={safeAction} onView={navigate}/> : <Cashier state={state} now={now} view={view} selected={selected} onSelect={setSelected} onDialog={setDialog} onAction={safeAction} onView={navigate}/>}</main>
      <footer className="app-footer">
    <span>GOLDEN HAND MAHJONG</span>
    <span>Phase 1 preview · penyimpanan lokal</span>
    </footer>
    </div>{dialog && <Dialogs key={`${dialog.kind}-${dialog.tableId}-${dialog.productId}-${dialog.staffId}`} dialog={dialog} state={state} now={now} onClose={() => setDialog(null)} onAction={act} onReset={() => { store.reset(); setToast({ text: 'Data contoh dipulihkan.', error: false }); }}/>} {toast && <div className={`toast ${toast.error ? 'error' : ''}`} role={toast.error ? 'alert' : 'status'}>
        <Icon name={toast.error ? 'alert' : 'check'}/>
        <span>{toast.text}</span>
        <button aria-label="Tutup pesan" className="icon-button" onClick={() => setToast(null)}>
        <Icon name="close" size={16}/>
        </button>
        </div>}
  </div>;
}
export class ErrorBoundary extends Component<{
    children: ReactNode;
}, {
    failed: boolean;
}> {
    state = { failed: false };
    static getDerivedStateFromError() { return { failed: true }; }
    render() {
        return this.state.failed ? <div className="system-screen">
        <Brand large/>
        <Empty icon="alert" title="Tampilan mengalami kendala">
        <p>Data demo tersimpan tetap dapat diekspor.</p>
        <div className="button-row">
        <button className="button" onClick={downloadData}>Ekspor data</button>
        <button className="button primary" onClick={() => window.location.reload()}>Muat ulang</button>
        </div>
        </Empty>
        </div> : this.props.children;
    }
}
