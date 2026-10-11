import { useState } from 'react';
import { date, drawer, localDay, money, payments, report, status, time } from '../../../../../packages/domain/index.ts';
import type { Action, State } from '../../../../../packages/domain/index.ts';
import { Badge, Empty, Icon, Metric, TableCard } from '../../components/ui.tsx';
import type { Dialog } from '../../components/dialogs.tsx';
import { PageTitle } from '../cashier/Cashier.tsx';
import { download } from '../../data/store.ts';
export function Owner({ state, now, view, onDialog, onAction, onView }: {
    state: State;
    now: number;
    view: string;
    onDialog: (d: Dialog) => void;
    onAction: (a: Action) => void;
    onView: (v: string) => void;
}) {
    const [search, setSearch] = useState('');
    const [category, setCategory] = useState('all');
    const [day, setDay] = useState(localDay(now));
    const r = report(state, day);
    const active = state.tables.filter(t => status(t, now) === 'active').length;
    const low = state.products.filter(p => p.active && p.stock <= p.min);
    const pending = state.approvals.filter(a => a.status === 'pending');
    const visibleProducts = state.products.filter(p => p.name.toLowerCase().includes(search.toLowerCase()) && (category === 'all' || p.category === category));
    const cards = <div className="metrics">
    <Metric title="Penjualan selesai" value={money(r.sales)} detail="Sewa & F&B · tanggal terpilih" icon="chart" gold/>
    <Metric title="Laba kotor" value={money(r.profit)} detail={`Penjualan − HPP ${money(r.cost)}`} icon="wallet"/>
    <Metric title="Occupancy saat ini" value={<>{active}<span className="metric-denominator"> / 5 meja</span>
        </>} detail={`${state.tables.filter(t => status(t, now) === 'expired').length} sesi waktu habis`} icon="tables"/>
    <Metric title="Outstanding saat ini" value={money(r.outstanding)} detail="Semua sesi terbuka di venue" icon="receipt"/>
    </div>;
    const dayPicker = <label className="date-picker">
    <Icon name="clock" size={17}/>
    <input type="date" aria-label="Tanggal laporan" value={day} onChange={e => { if (e.target.value)
        setDay(e.target.value); }}/>
    </label>;
    function exportReport() {
        const cell = (v: string | number) => `"${String(v).replace(/^[=+@-]/, "'$&").replaceAll('"', '""')}"`;
        const rows = [['ID', 'Tanggal WIB', 'Meja', 'Kategori', 'Deskripsi', 'Penjualan', 'HPP'], ...r.records.flatMap(rec => rec.charges.map(c => [rec.id, `${date(rec.at)} ${time(rec.at)}`, rec.tableId, c.kind, c.label, c.amount, c.cost]))];
        download(`golden-hand-sales-${day}.csv`, '\uFEFF' + rows.map(row => row.map(cell).join(',')).join('\r\n'), 'text/csv;charset=utf-8');
    }
    const liveTables = <div className="owner-tables">{state.tables.map(t => <TableCard key={t.id} compact table={t} now={now} state={state} onClick={() => onDialog({ kind: 'table', tableId: t.id })}/>)}</div>;
    const chart = <RevenueChart state={state} now={now} selectedDay={day} onDay={setDay}/>;
    if (view === 'overview')
        return <>
        <PageTitle eyebrow="OWNER DASHBOARD" title="Ringkasan operasional" subtitle="Penjualan, saldo sesi, dan stok untuk tanggal terpilih." action={dayPicker}/>{cards}<div className="owner-overview-grid">
        <div className="panel revenue-panel">
        <div className="panel-head">
        <div>
        <h2>Performa penjualan</h2>
        <span className="muted small">7 hari terakhir · transaksi selesai · data contoh</span>
        </div>
        <Badge kind="gold">{date(now)}</Badge>
        </div>{chart}<div className="chart-summary">
        <span>
        <i />Sewa meja <strong>{money(r.rental)}</strong>
        </span>
        <span>
        <i />Food & beverage <strong>{money(r.fnb)}</strong>
        </span>
        </div>
        </div>
        <div className="panel stock-alerts">
        <div className="panel-head">
        <div>
        <h2>Perlu perhatian</h2>
        <span className="muted small">Stok rendah & approval</span>
        </div>
        <span className="round-count">{low.length + pending.length}</span>
        </div>{low.slice(0, 3).map(p => <button className="attention-row" key={p.id} onClick={() => onDialog({ kind: 'stock', productId: p.id })}>
            <span className="attention-icon">
            <Icon name={p.icon}/>
            </span>
            <span>
            <strong>{p.name}</strong>
            <small className="text-warning">Tersisa {p.stock} unit</small>
            </span>
            <Icon name="arrow" size={16}/>
            </button>)}{pending.length > 0 && <button className="approval-callout" onClick={() => onView('approvals')}>
            <Icon name="shield"/>
            <span>
            <strong>{pending.length} approval menunggu</strong>
            <small>Review refund / void</small>
            </span>
            <Icon name="arrow" size={16}/>
            </button>}{!low.length && !pending.length && <Empty icon="check" title="Semua dalam kondisi baik"/>}</div>
        </div>
        <div className="section-heading spaced">
        <div>
        <h2>Monitoring meja</h2>
        <p className="muted small">Status lokal bersama antarmuka kasir</p>
        </div>
        <div className="live-label">
        <span />Lima meja</div>
        </div>{liveTables}<div className="owner-bottom">
        <div className="panel">
        <div className="panel-head">
        <h3>Aktivitas terbaru</h3>
        <button className="text-button" onClick={() => onView('audit')}>Audit trail <Icon name="arrow" size={16}/>
        </button>
        </div>{state.audit.slice(0, 3).map(a => <div key={a.id} className="activity-row">
            <Icon name="history" size={17}/>
            <div>
            <strong>{a.title}</strong>
            <small>{a.actor} · {time(a.at)} WIB</small>
            </div>
            </div>)}</div>
        </div>
        </>;
    if (view === 'tables')
        return <>
        <PageTitle eyebrow="FLOOR MONITORING" title="Lima meja lounge" subtitle="Monitoring sesi aktif, cutoff, dan saldo terutang." action={<div className="live-label">
            <span />Pembaruan lokal</div>}/>{liveTables}<div className="notice spaced">
        <Icon name="shield"/>Owner memantau sesi. Kasir mengelola start, extend, pesanan, dan checkout.</div>
        </>;
    if (view === 'catalog')
        return <>
        <PageTitle eyebrow="CATALOG & INVENTORY" title="Food & beverage" subtitle="Atur harga, HPP, ketersediaan, dan stok dalam satu tempat." action={<button className="button primary" onClick={() => onDialog({ kind: 'product' })}>
            <Icon name="plus"/>Tambah produk</button>}/>
        <div className="metrics three">
        <Metric title="Produk katalog" value={state.products.length} detail={`${state.products.filter(p => p.active).length} produk aktif`} icon="inventory"/>
        <Metric title="Stok rendah" value={low.length} detail="Perlu restock atau pemeriksaan" icon="alert"/>
        <Metric title="Total nilai stok / HPP" value={money(state.products.reduce((v, p) => v + p.cost * p.stock, 0))} detail="Harga modal saat ini × stok" icon="wallet" gold/>
        </div>
        <div className="panel">
        <div className="catalog-tools">
        <label className="search-field">
        <Icon name="search"/>
        <input aria-label="Cari katalog" placeholder="Cari produk…" value={search} onChange={e => setSearch(e.target.value)}/>
        </label>
        <div className="chips">{['all', 'Minuman', 'Snack'].map(c => <button key={c} className={`chip ${category === c ? 'selected' : ''}`} onClick={() => setCategory(c)}>{c === 'all' ? 'Semua produk' : c}</button>)}</div>
        </div>
        <div className="table-scroll">
        <table className="catalog-table">
        <thead>
        <tr>
        <th>Produk</th>
        <th>Harga jual</th>
        <th>HPP / unit</th>
        <th>Margin</th>
        <th>Stok</th>
        <th>Status</th>
        <th className="align-right">Tindakan</th>
        </tr>
        </thead>
        <tbody>{visibleProducts.map(p => <tr key={p.id}>
            <td>
            <div className="product-cell">
            <span className="product-symbol">
            <Icon name={p.icon}/>
            </span>
            <span>
            <strong>{p.name}</strong>
            <small>{p.category}</small>
            </span>
            </div>
            </td>
            <td className="amount">{money(p.price)}</td>
            <td>{money(p.cost)}</td>
            <td>
            <span className={p.price >= p.cost ? 'text-success' : 'text-danger'}>{Math.round((p.price - p.cost) / p.price * 100)}%</span>
            </td>
            <td>
            <Badge kind={p.stock <= p.min ? 'warning' : 'cleaning'}>{p.stock} unit</Badge>
            </td>
            <td>{p.active ? 'Aktif' : 'Arsip'}</td>
            <td>
            <div className="row-actions">
            <button className="button small" onClick={() => onDialog({ kind: 'price', productId: p.id })}>Edit harga</button>
            <button className="button small" onClick={() => onDialog({ kind: 'stock', productId: p.id })}>Stok ±</button>
            <button className="icon-button" aria-label={`${p.active ? 'Arsipkan' : 'Aktifkan'} ${p.name}`} onClick={() => onAction({ type: 'toggle-product', productId: p.id })}>
            <Icon name={p.active ? 'inventory' : 'check'} size={17}/>
            </button>
            </div>
            </td>
            </tr>)}</tbody>
        </table>
        </div>{!visibleProducts.length && <Empty icon="search" title="Tidak ada produk cocok">
            <button className="button" onClick={() => { setSearch(''); setCategory('all'); }}>Hapus filter</button>
            </Empty>}</div>
        <p className="muted small spaced">Harga dan HPP disimpan sebagai snapshot saat order. Produk arsip tetap ada di riwayat transaksi.</p>
        </>;
    if (view === 'pricing')
        return <>
        <PageTitle eyebrow="RENTAL PRICING" title="Tarif meja" subtitle="Perubahan berlaku pada sesi baru; histori tetap konsisten."/>
        <div className="rates-grid">{(['Standard'] as const).map(kind => <div className="panel rate-card" key={kind}>
            <Icon name="tables" size={30}/>
            <span className="eyebrow">BERLAKU UNTUK SEMUA MEJA</span>
            <h2>{kind}</h2>
            <p>{state.tables.filter(t => t.kind === kind).map(t => `Meja ${String(t.id).padStart(2, '0')}`).join(' · ')}</p>
            <div className="rate-value">{money(state.rates[kind])}<span>/ jam</span>
            </div>
            <button className="button primary" onClick={() => onDialog({ kind: 'rate', rateKind: kind })}>Ubah tarif <Icon name="arrow" size={17}/>
            </button>
            </div>)}</div>
        <div className="panel rules-panel">
        <h2>Kebijakan sesi demo</h2>
        <div className="rules-grid">
        <div>
        <Icon name="clock"/>
        <h3>Extend 30, 60, 120 menit</h3>
        <p>Setelah expired, waktu tambahan dihitung dari saat reaktivasi.</p>
        </div>
        <div>
        <Icon name="wallet"/>
        <h3>Prepaid & postpaid</h3>
        <p>Prepaid aktif setelah pembayaran; postpaid menambah saldo tagihan.</p>
        </div>
        <div>
        <Icon name="shield"/>
        <h3>Snapshot tarif</h3>
        <p>Sesi aktif dan extend memakai tarif saat sesi dimulai.</p>
        </div>
        </div>
        </div>
        </>;
    if (view === 'approvals')
        return <>
        <PageTitle eyebrow="OWNER APPROVALS" title="Refund & void" subtitle="Tinjau alasan kasir sebelum mengambil keputusan."/>
        <div className="notice amber">
        <Icon name="alert"/>Keputusan demo hanya mengubah status permintaan. Reversal stok, charge, dan refund uang belum diimplementasikan.</div>
        <div className="panel spaced">
        <div className="panel-head">
        <h2>Permintaan approval</h2>
        <Badge kind="warning">{pending.length} pending</Badge>
        </div>{state.approvals.map(a => <div className="approval-row" key={a.id}>
            <span className="attention-icon">
            <Icon name="shield"/>
            </span>
            <div className="grow">
            <strong>{a.kind} · Meja {String(a.tableId).padStart(2, '0')}</strong>
            <p>{a.reason}</p>
            <small>{a.staff} · {date(a.at)} {time(a.at)} WIB</small>
            </div>
            <strong className="amount">{money(a.amount)}</strong>{a.status === 'pending' ? <div className="button-row">
                <button className="button danger small" onClick={() => onAction({ type: 'approval', id: a.id, decision: 'rejected' })}>Tolak</button>
                <button className="button primary small" onClick={() => onAction({ type: 'approval', id: a.id, decision: 'approved' })}>Setujui demo</button>
                </div> : <Badge kind={a.status === 'approved' ? 'active' : 'expired'}>{a.status === 'approved' ? 'Disetujui demo' : 'Ditolak'}</Badge>}</div>)}{state.approvals.length === 0 && <Empty icon="check" title="Belum ada permintaan"/>}</div>
        </>;
    if (view === 'staff')
        return <>
        <PageTitle eyebrow="TEAM & SHIFTS" title="Staf & shift" subtitle="Kelola profil demo dan lihat rekonsiliasi kasir." action={<button className="button primary" onClick={() => onDialog({ kind: 'staff' })}>
            <Icon name="plus"/>Tambah staf</button>}/>
        <div className="notice amber">
        <Icon name="shield"/>Profil staf lokal tidak memberikan akses login nyata. Server-enforced RBAC dan Supabase Auth menunggu Phase 2.</div>
        <div className="staff-grid spaced">{state.staff.map(f => <div className="panel staff-card" key={f.id}>
            <span className="staff-avatar">{f.name.split(' ').slice(0, 2).map(x => x[0]).join('')}</span>
            <h3>{f.name}</h3>
            <p>{f.role === 'owner' ? 'Owner · pengaturan & laporan' : 'Cashier · operasional POS'}</p>
            <Badge kind={f.active ? 'active' : 'cleaning'}>{f.active ? 'Aktif' : 'Nonaktif'}</Badge>
            <button className="button full" onClick={() => onDialog({ kind: 'staff', staffId: f.id })}>Edit profil demo</button>
            </div>)}</div>
        <div className="panel spaced">
        <div className="panel-head">
        <h2>Laporan shift kasir</h2>
        </div>
        <div className="table-scroll">
        <table>
        <thead>
        <tr>
        <th>Kasir</th>
        <th>Mulai / selesai</th>
        <th>Modal</th>
        <th>Tunai tercatat</th>
        <th>Kas seharusnya</th>
        <th>Kas aktual / selisih</th>
        </tr>
        </thead>
        <tbody>{state.shifts.map(sh => <tr key={sh.id}>
            <td>
            <strong>{sh.staff}</strong>
            <small>{sh.closed ? 'Ditutup' : 'Berjalan'}</small>
            </td>
            <td>{date(sh.opened)} {time(sh.opened)}<small>{sh.closed ? `${date(sh.closed)} ${time(sh.closed)}` : 'Shift terbuka'}</small>
            </td>
            <td>{money(sh.opening)}</td>
            <td>{money(payments(state).filter(p => p.shiftId === sh.id && p.method === 'cash').reduce((v, p) => v + p.amount, 0))}</td>
            <td className="amount">{money(drawer(state, sh))}</td>
            <td>{sh.counted === null ? '—' : <>{money(sh.counted)}<small className={sh.counted === drawer(state, sh) ? 'text-success' : 'text-warning'}>Selisih {money(sh.counted - drawer(state, sh))}</small>
                </>}</td>
            </tr>)}</tbody>
        </table>
        </div>
        </div>
        </>;
    if (view === 'reports')
        return <>
        <PageTitle eyebrow="SALES & GROSS PROFIT" title="Laporan penjualan" subtitle="Penjualan diakui saat checkout; penerimaan dicatat saat pembayaran." action={<div className="button-row">{dayPicker}<button className="button" onClick={exportReport}>
            <Icon name="download"/>Ekspor CSV</button>
            </div>}/>{cards}<div className="report-grid">
        <div className="panel">
        <div className="panel-head">
        <h2>Tren 7 hari</h2>
        </div>{chart}</div>
        <div className="panel reconciliation">
        <div className="panel-head">
        <h2>Rekonsiliasi</h2>
        </div>{[['Sewa meja selesai', r.rental], ['F&B selesai', r.fnb], ['HPP F&B', r.cost], ['Laba kotor', r.profit], ['Penerimaan tunai', r.cash], ['QRIS demo', r.qris], ['Transfer demo', r.transfer], ['Total penerimaan', r.collected]].map(([label, value]) => <div className="detail-row" key={label}>
            <span>{label}</span>
            <strong>{money(Number(value))}</strong>
            </div>)}</div>
        </div>
        <div className="panel spaced">
        <div className="panel-head">
        <h2>Transaksi selesai · {r.records.length}</h2>
        <span className="muted small">{day}</span>
        </div>{r.records.length ? <div className="table-scroll">
            <table>
            <thead>
            <tr>
            <th>ID</th>
            <th>Waktu</th>
            <th>Meja</th>
            <th>Penjualan</th>
            <th>HPP</th>
            <th>Tindakan</th>
            </tr>
            </thead>
            <tbody>{r.records.map(rec => <tr key={rec.id}>
                <td className="mono">{rec.id.slice(0, 14).toUpperCase()}</td>
                <td>{time(rec.at)} WIB</td>
                <td>Meja {String(rec.tableId).padStart(2, '0')}</td>
                <td className="amount">{money(rec.charges.reduce((v, c) => v + c.amount, 0))}</td>
                <td>{money(rec.charges.reduce((v, c) => v + c.cost, 0))}</td>
                <td>
                <button className="button small" onClick={() => onDialog({ kind: 'bill', recordId: rec.id })}>Receipt</button>
                </td>
                </tr>)}</tbody>
            </table>
            </div> : <Empty title="Belum ada transaksi selesai pada tanggal ini">
            <p>Pilih tanggal lain atau selesaikan checkout melalui kasir.</p>
            </Empty>}</div>
        <p className="muted small spaced">Laba kotor = penjualan − HPP F&B. Biaya operasional, pajak, dan penyusutan meja belum dihitung.</p>
        </>;
    return <>
    <PageTitle eyebrow="ACTIVITY LOG" title="Audit trail" subtitle="Riwayat perubahan lokal, keputusan owner, dan transaksi demo."/>
    <div className="panel">
    <div className="panel-head">
    <h2>Aktivitas venue</h2>
    <Badge kind="gold">{state.audit.length} event</Badge>
    </div>
    <div className="audit-feed">{state.audit.map(a => <div className="audit-row" key={a.id}>
        <span className="audit-dot"/>
        <div>
        <strong>{a.title}</strong>
        <small>{a.actor} · {date(a.at)} {time(a.at)} WIB</small>
        </div>
        </div>)}</div>
    </div>
    <p className="muted small spaced">Audit browser dapat diubah atau dihapus pengguna perangkat. Audit append-only di server belum tersedia.</p>
    </>;
}
function RevenueChart({ state, now, selectedDay, onDay }: {
    state: State;
    now: number;
    selectedDay: string;
    onDay: (day: string) => void;
}) {
    const days = Array.from({ length: 7 }, (_, i) => { const timestamp = now - (6 - i) * 86400000; const day = localDay(timestamp); return { timestamp, day, ...report(state, day) }; });
    const max = Math.max(1, ...days.map(d => d.sales));
    const chosen = days.find(d => d.day === selectedDay);
    return <div className="chart-wrap">
    <div className="chart-top">
    <strong>{chosen ? money(chosen.sales) : 'Pilih hari pada grafik'}</strong>
    <span className="muted small">{chosen ? date(chosen.timestamp) : '7 hari terakhir'}</span>
    </div>
    <div className="chart-body">
    <div className="chart-y">{[1, .75, .5, .25, 0].map(n => <span key={n}>{Math.round(max * n / 1000)}k</span>)}</div>
    <div className="chart-bars">{days.map(d => <button key={d.day} className={`chart-column ${selectedDay === d.day ? 'selected' : ''}`} onClick={() => onDay(d.day)} aria-label={`Penjualan ${date(d.timestamp)} ${money(d.sales)}`} aria-pressed={selectedDay === d.day}>
        <span className="bar-stack" style={{ height: `${Math.max(0, d.sales / max * 100)}%` }}>
        <i className="bar-fnb" style={{ flex: d.fnb }}/>
        <i className="bar-rental" style={{ flex: d.rental }}/>
        </span>
        <span className="chart-x">{new Date(d.timestamp).toLocaleDateString('id-ID', { weekday: 'short', timeZone: 'Asia/Jakarta' })}</span>
        </button>)}</div>
    </div>
    <p className="chart-hint">Pilih batang untuk melihat laporan hari tersebut.</p>
    </div>;
}
