import { useState } from 'react';
import { countdown, date, drawer, due, money, openShift, paid, pendingFor, status, time, total } from '../../../../../packages/domain/index.ts';
import type { Action, State, TableStatus } from '../../../../../packages/domain/index.ts';
import { Badge, Empty, Icon, labels, Metric, TableCard } from '../../components/ui.tsx';
import type { Dialog } from '../../components/dialogs.tsx';
export function Cashier({ state, now, view, selected, onSelect, onDialog, onAction, onView }: {
    state: State;
    now: number;
    view: string;
    selected: number;
    onSelect: (id: number) => void;
    onDialog: (d: Dialog) => void;
    onAction: (a: Action) => void;
    onView: (v: string) => void;
}) {
    const [filter, setFilter] = useState<'all' | TableStatus>('all');
    const [search, setSearch] = useState('');
    const [category, setCategory] = useState('all');
    const table = state.tables.find(t => t.id === selected)!;
    const session = table.session;
    const st = status(table, now);
    const shift = openShift(state);
    const pending = pendingFor(state, table.id);
    const open = (kind: Dialog['kind']) => onDialog({ kind, tableId: selected });
    const products = state.products.filter(p => p.active && (category === 'all' || p.category === category) && p.name.toLowerCase().includes(search.toLowerCase()));
    const events = [...state.records.flatMap(r => r.payments.map(p => ({ ...p, tableId: r.tableId }))), ...state.tables.flatMap(t => t.session?.payments.map(p => ({ ...p, tableId: t.id })) ?? [])].filter(p => p.shiftId === shift?.id).sort((a, b) => b.at - a.at);
    const productGrid = <>
    <div className="menu-tools">
    <label className="search-field">
    <Icon name="search"/>
    <input aria-label="Cari produk" placeholder="Cari snack atau minuman…" value={search} onChange={e => setSearch(e.target.value)}/>
    </label>
    <div className="chips">{['all', 'Minuman', 'Snack'].map(c => <button key={c} className={`chip ${category === c ? 'selected' : ''}`} onClick={() => setCategory(c)} aria-pressed={category === c}>{c === 'all' ? 'Semua' : c}</button>)}</div>
    </div>
    <div className="products-grid">{products.map(p => <button key={p.id} className="product-card" disabled={p.stock === 0 || !shift || st !== 'active'} onClick={() => onDialog({ kind: 'order', tableId: selected, productId: p.id })}>
        <span className={`product-art ${p.category === 'Snack' ? 'snack-art' : ''}`}>
        <Icon name={p.icon} size={35}/>
        </span>
        <strong>{p.name}</strong>
        <span className="product-price">{money(p.price)}</span>
        <span className={`small ${p.stock <= p.min ? 'text-warning' : 'muted'}`}>{p.stock === 0 ? 'Stok habis' : `Stok ${p.stock}`} · {p.category}</span>
        </button>)}</div>{products.length === 0 && <Empty icon="search" title="Produk tidak ditemukan">
        <p>Coba nama lain atau kategori Semua.</p>
        <button className="button" onClick={() => { setSearch(''); setCategory('all'); }}>Hapus filter</button>
        </Empty>}</>;
    if (view === 'menu')
        return <>
        <PageTitle eyebrow="FOOD & BEVERAGE" title="Menu lounge" subtitle="Snack dan minuman untuk menemani setiap permainan."/>
        <div className="panel menu-panel">
        <div className="menu-target">
        <div>
        <span className="eyebrow">PESANAN UNTUK</span>
        <h3>Meja {String(selected).padStart(2, '0')} · {table.kind}</h3>
        </div>
        <select aria-label="Meja tujuan F&B" value={selected} onChange={e => onSelect(Number(e.target.value))}>{state.tables.map(t => <option key={t.id} value={t.id}>Meja {String(t.id).padStart(2, '0')} · {labels[status(t, now)]}</option>)}</select>
        </div>{st !== 'active' && <div className="notice amber">
            <Icon name="alert"/>Pilih meja dengan sesi aktif untuk menambahkan F&B.</div>}{productGrid}</div>
        </>;
    if (view === 'transactions')
        return <>
        <PageTitle eyebrow="SHIFT TRANSACTIONS" title="Transaksi kasir" subtitle="Pembayaran tercatat pada shift berjalan." action={<button className="button" onClick={() => onDialog({ kind: 'shift' })}>
            <Icon name="wallet"/>{shift ? 'Tutup shift' : 'Buka shift'}</button>}/>
        <div className="metrics three">
        <Metric title="Tunai shift" value={money(events.filter(p => p.method === 'cash').reduce((v, p) => v + p.amount, 0))} detail={`${events.length} pembayaran tercatat`} icon="wallet" gold/>
        <Metric title="Kas seharusnya" value={money(shift ? drawer(state, shift) : 0)} detail={shift ? `Termasuk modal ${money(shift.opening)}` : 'Tidak ada shift terbuka'} icon="receipt"/>
        <Metric title="Pembayaran pending" value={state.intents.filter(i => i.status === 'pending').length} detail="Belum menjadi pembayaran" icon="clock"/>
        </div>
        <div className="panel">
        <div className="panel-head">
        <h3>Riwayat pembayaran</h3>
        <Badge kind={shift ? 'active' : 'cleaning'}>{shift ? 'Shift terbuka' : 'Shift ditutup'}</Badge>
        </div>{events.length ? <div className="table-scroll">
            <table>
            <thead>
            <tr>
            <th>Waktu</th>
            <th>Meja</th>
            <th>Metode</th>
            <th>Status</th>
            <th className="align-right">Nominal</th>
            </tr>
            </thead>
            <tbody>{events.map(p => <tr key={p.id}>
                <td>{time(p.at)} WIB</td>
                <td>Meja {String(p.tableId).padStart(2, '0')}</td>
                <td>{p.method === 'cash' ? 'Tunai' : `${p.method.toUpperCase()} demo`}</td>
                <td>
                <Badge kind="active">Tercatat</Badge>
                </td>
                <td className="align-right amount">{money(p.amount)}</td>
                </tr>)}</tbody>
            </table>
            </div> : <Empty title="Belum ada pembayaran pada shift ini">
            <p>Pembayaran pending muncul setelah settlement disimulasikan.</p>
            </Empty>}</div>
        <div className="section-heading spaced">
        <h3>Pending di venue</h3>
        </div>
        <div className="pending-list">{state.intents.filter(i => i.status === 'pending').map(i => <button className="panel list-item" key={i.id} onClick={() => onDialog({ kind: 'pending', tableId: i.tableId })}>
            <span>
            <strong>Meja {String(i.tableId).padStart(2, '0')}</strong>
            <small>{i.method.toUpperCase()} · {i.kind}</small>
            </span>
            <strong>{money(i.amount)}</strong>
            <Icon name="arrow"/>
            </button>)}</div>
        </>;
    return <>
    <PageTitle eyebrow="KASIR" title="Meja & sesi" subtitle="5 meja Standard · pilih meja untuk mulai atau melanjutkan sesi." action={<div className="live-label">
        <span />Pembaruan lokal</div>}/>
    {!shift && <div className="notice amber">
        <Icon name="alert"/>Shift ditutup. Buka shift untuk mencatat sesi, order, dan pembayaran.<button className="button primary small" onClick={() => onDialog({ kind: 'shift' })}>Buka shift</button>
        </div>}
    <div className="metrics">
    <Metric title="Meja aktif" value={<>{state.tables.filter(t => status(t, now) === 'active').length}<span className="metric-denominator"> / 5</span>
        </>} detail="Sesi sedang berlangsung" icon="tables"/>
    <Metric title="Meja tersedia" value={state.tables.filter(t => status(t, now) === 'available').length} detail="Siap untuk sesi baru" icon="check"/>
    <Metric title="Waktu habis" value={state.tables.filter(t => status(t, now) === 'expired').length} detail="Extend atau checkout" icon="clock"/>
    <Metric title="Outstanding" value={money(state.tables.reduce((v, t) => v + due(t.session), 0))} detail="Saldo semua sesi terbuka" icon="wallet" gold/>
    </div>
    <div className="pos-layout">
    <div className="floor-area">
    <div className="section-heading">
    <div>
    <h2>Status meja</h2>
    <span className="muted small">Pilih meja untuk mengelola sesi</span>
    </div>
    <span className="eyebrow">01 — 05</span>
    </div>
    <div className="chips floor-filters">{(['all', 'active', 'available', 'expired', 'cleaning'] as const).map(f => <button className={`chip ${filter === f ? 'selected' : ''}`} key={f} onClick={() => setFilter(f)} aria-pressed={filter === f}>{f === 'all' ? 'Semua meja' : labels[f]}</button>)}</div>
    <div className="tables-grid">{state.tables.filter(t => filter === 'all' || status(t, now) === filter).map(t => <TableCard key={t.id} table={t} now={now} selected={t.id === selected} state={state} onClick={() => onSelect(t.id)}/>)}</div>{state.tables.filter(t => filter === 'all' || status(t, now) === filter).length === 0 && <Empty icon="tables" title="Tidak ada meja pada filter ini">
        <button className="button" onClick={() => setFilter('all')}>Lihat semua meja</button>
        </Empty>}
      <div className="floor-foot">
    <Icon name="shield" size={16}/>
    <span>Cutoff hanya pada software; mesin Mahjong tetap menyala.</span>
    </div>
      <div className="panel quick-menu">
    <div className="panel-head">
    <div>
    <h3>Favorit lounge</h3>
    <span className="muted small">Tambahkan ke Meja {String(selected).padStart(2, '0')}</span>
    </div>
    <button className="text-button" onClick={() => onView('menu')}>Semua menu <Icon name="arrow" size={16}/>
    </button>
    </div>
    <div className="quick-products">{state.products.filter(p => p.active).slice(0, 4).map(p => <button key={p.id} disabled={st !== 'active' || p.stock === 0 || !shift} onClick={() => onDialog({ kind: 'order', tableId: selected, productId: p.id })}>
        <span className="quick-icon">
        <Icon name={p.icon} size={24}/>
        </span>
        <span>
        <strong>{p.name}</strong>
        <small>{money(p.price)} · stok {p.stock}</small>
        </span>
        <Icon name="plus" size={17}/>
        </button>)}</div>
    </div>
    </div>
    <aside className="panel session-panel">
    <div className="panel-head">
    <div>
    <span className="eyebrow">SESI TERPILIH</span>
    <h2>Meja {String(selected).padStart(2, '0')} <span className="muted">· {table.kind}</span>
    </h2>
    </div>
    <Badge kind={st}>{labels[st]}</Badge>
    </div>
    <div className="session-body">
    <div className="session-information">
      {pending.length > 0 && <button className="notice amber pending-trigger" onClick={() => open('pending')}>
        <Icon name="clock"/>
        <span>{pending.length} pembayaran pending<br />
        <strong>Lihat & simulasikan settlement</strong>
        </span>
        <Icon name="arrow" size={18}/>
        </button>}
      {st === 'available' && <Empty icon="tables" title={pending.length ? 'Menunggu pembayaran awal' : 'Meja siap digunakan'}>
        <p>{pending.length ? 'Sesi prepaid belum diaktifkan.' : 'Mulai sesi baru dan pilih durasi serta skema pembayaran.'}</p>
        <p className="price-preview">{money(state.rates[table.kind])}<span>/jam</span>
        </p>
        <button className="button primary full" disabled={!shift || pending.length > 0} onClick={() => open('start')}>
        <Icon name="plus"/>Mulai sesi baru</button>
        </Empty>}
      {st === 'cleaning' && <Empty icon="check" title="Saatnya persiapan meja">
        <p>Setelah dibersihkan, tandai meja tersedia untuk tamu berikutnya.</p>
        <button className="button primary full" onClick={() => onAction({ type: 'ready', tableId: selected })}>Tandai meja siap</button>
        </Empty>}
      {session && <>
        <div className={`countdown-panel ${st === 'expired' ? 'expired' : ''}`}>
        <span className="eyebrow">{st === 'expired' ? 'WAKTU HABIS' : 'SISA WAKTU'}</span>
        <strong>{countdown(session.expires, now)}</strong>
        <span>{st === 'expired' ? 'Software cutoff aktif' : `Cutoff ${time(session.expires)} WIB`}</span>{st === 'active' && session.expires - now < 600000 && <small className="text-warning">Kurang dari 10 menit tersisa</small>}</div>
        <div className="detail-row">
        <span>Mulai sesi</span>
        <strong>{time(session.started)} WIB</strong>
        </div>
        <div className="detail-row">
        <span>Skema pembayaran</span>
        <strong>{session.policy === 'mixed' ? 'Campuran' : session.policy === 'prepaid' ? 'Prepaid' : 'Postpaid'}</strong>
        </div>
        <div className="detail-row">
        <span>Tarif sesi</span>
        <strong>{money(session.rate)}/jam</strong>
        </div>
        <h3 className="bill-heading">Detail tagihan <span>{session.charges.length} item</span>
        </h3>
        <div className="bill-items">{session.charges.map(c => <div key={c.id} className="bill-item">
            <div>
            <strong>{c.label}</strong>
            <small>{c.kind === 'fnb' ? 'Food & beverage' : 'Sewa meja'}</small>
            </div>
            <strong>{money(c.amount)}</strong>
            </div>)}</div>
        <div className="bill-summary">
        <div className="detail-row">
        <span>Total tagihan</span>
        <strong>{money(total(session))}</strong>
        </div>
        <div className="detail-row">
        <span>Sudah dibayar</span>
        <strong className="text-success">− {money(paid(session))}</strong>
        </div>
        <div className="balance-due">
        <span>Sisa bayar</span>
        <strong>{money(due(session))}</strong>
        </div>
        </div>
        <button className="text-button full request-button" onClick={() => open('request')}>Minta refund / void approval</button>
        </>}
      <p className="session-note">
    <Icon name="shield" size={14}/>Harga dan stok dikelola oleh owner.</p>
    </div>{session && <div className="session-actions">
        <div className="checkout-total">
        <span>Sisa bayar</span>
        <strong>{money(due(session))}</strong>
        </div>
        <div className="session-action-grid">
        <button className="button full" disabled={!shift || pending.length > 0} onClick={() => open('extend')}>
        <Icon name="clock"/>Extend</button>
        <button className="button full" disabled={st !== 'active' || !shift} onClick={() => onView('menu')}>
        <Icon name="coffee"/>Tambah F&B</button>
        <button className="button print-action" aria-label="Preview / cetak bill" title="Preview / cetak bill" onClick={() => open('bill')}>
        <Icon name="print"/>
        </button>
        </div>
        <button className="button primary full checkout-button" disabled={!shift || pending.length > 0} onClick={() => due(session) > 0 ? open('payment') : onAction({ type: 'checkout', tableId: selected })}>
        <Icon name={due(session) > 0 ? 'wallet' : 'check'}/>{due(session) > 0 ? 'Terima pembayaran' : 'Selesaikan & checkout'}<Icon name="arrow" size={18}/>
        </button>
        </div>}</div>
    </aside>
    </div>
    <p className="page-foot">{date(now)} · {shift ? `Shift ${shift.staff} sejak ${time(shift.opened)} WIB` : 'Tidak ada shift berjalan'}<span>GOLDEN HAND MAHJONG</span>
    </p>
  </>;
}
export function PageTitle({ eyebrow, title, subtitle, action }: {
    eyebrow: string;
    title: string;
    subtitle: string;
    action?: React.ReactNode;
}) {
    return <div className="page-title">
    <div>
    <span className="eyebrow">{eyebrow}</span>
    <h1>{title}</h1>
    <p>{subtitle}</p>
    </div>{action}</div>;
}
