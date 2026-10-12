import { useState } from 'react';
import { Capacitor } from '@capacitor/core';
import type { FormEvent, ReactNode } from 'react';
import { date, drawer, due, money, openShift, paid, pendingFor, status, time, total } from '../../../../packages/domain/index.ts';
import type { Action, Method, Policy, State } from '../../../../packages/domain/index.ts';
import { Brand, Icon, Modal } from './ui.tsx';
import { downloadData } from '../data/store.ts';
export type Dialog = {
    kind: 'start' | 'extend' | 'payment' | 'order' | 'price' | 'stock' | 'rate' | 'product' | 'staff' | 'shift' | 'bill' | 'pending' | 'table' | 'request' | 'reset';
    tableId?: number;
    productId?: string;
    staffId?: string;
    rateKind?: 'Standard';
    recordId?: string;
};
export function Dialogs({ dialog, state, now, onClose, onAction, onReset }: {
    dialog: Dialog;
    state: State;
    now: number;
    onClose: () => void;
    onAction: (a: Action) => void;
    onReset: () => void;
}) {
    const table = state.tables.find(t => t.id === dialog.tableId);
    const product = state.products.find(p => p.id === dialog.productId);
    const member = state.staff.find(s => s.id === dialog.staffId);
    const [method, setMethod] = useState<Method>('cash');
    const [policy, setPolicy] = useState<Policy>('mixed');
    const [minutes, setMinutes] = useState(dialog.kind === 'extend' ? 30 : 120);
    const [prepaid, setPrepaid] = useState(false);
    const [amount, setAmount] = useState(due(table?.session ?? null));
    const [tendered, setTendered] = useState<number | undefined>();
    const [error, setError] = useState('');
    const [busy, setBusy] = useState(false);
    const titleTable = `Meja ${String(table?.id ?? 0).padStart(2, '0')}`;
    const titles: Record<Dialog['kind'], string> = { start: `Mulai sesi · ${titleTable}`, extend: `Perpanjang · ${titleTable}`, payment: `Terima pembayaran · ${titleTable}`, order: `Tambah F&B · ${titleTable}`, price: 'Harga jual & HPP', stock: 'Restock & penyesuaian', rate: `Tarif ${dialog.rateKind ?? 'Standard'}`, product: 'Tambah produk', staff: member ? 'Edit staf demo' : 'Tambah staf demo', shift: openShift(state) ? 'Tutup & rekonsiliasi shift' : 'Buka shift', bill: 'Bill & receipt', pending: 'Pembayaran pending', table: titleTable, request: 'Minta approval owner', reset: 'Reset data demo' };
    const fdNumber = (fd: FormData, key: string) => Number(fd.get(key));
    function submit(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        if (busy)
            return;
        setBusy(true);
        setError('');
        const fd = new FormData(event.currentTarget);
        try {
            let action: Action | undefined;
            switch (dialog.kind) {
                case 'start':
                    if (table)
                        action = { type: 'start', tableId: table.id, minutes, policy, method, tendered: tendered ?? state.rates[table.kind] * minutes / 60 };
                    break;
                case 'extend':
                    if (table)
                        action = { type: 'extend', tableId: table.id, minutes, prepaid, method, tendered: tendered ?? (table.session?.rate ?? 0) * minutes / 60 };
                    break;
                case 'payment':
                    if (table)
                        action = { type: 'payment', tableId: table.id, amount, method, tendered: tendered ?? amount };
                    break;
                case 'order':
                    if (table && product)
                        action = { type: 'order', tableId: table.id, productId: product.id, quantity: fdNumber(fd, 'quantity') };
                    break;
                case 'price':
                    if (product)
                        action = { type: 'price', productId: product.id, price: fdNumber(fd, 'price'), cost: fdNumber(fd, 'cost') };
                    break;
                case 'stock':
                    if (product)
                        action = { type: 'stock', productId: product.id, delta: fdNumber(fd, 'quantity') * (fd.get('movement') === 'subtract' ? -1 : 1), reason: String(fd.get('reason')) };
                    break;
                case 'rate':
                    action = { type: 'rate', kind: dialog.rateKind ?? 'Standard', price: fdNumber(fd, 'price') };
                    break;
                case 'product':
                    action = { type: 'catalog', product: { id: '', name: String(fd.get('name')), category: fd.get('category') as 'Snack' | 'Minuman', price: fdNumber(fd, 'price'), cost: fdNumber(fd, 'cost'), stock: fdNumber(fd, 'stock'), min: fdNumber(fd, 'min'), icon: fd.get('category') === 'Snack' ? 'snack' : 'drink', active: true } };
                    break;
                case 'staff':
                    action = { type: 'staff', staff: { id: member?.id ?? '', name: String(fd.get('name')), role: fd.get('role') as 'owner' | 'cashier', active: fd.get('active') === 'true' } };
                    break;
                case 'shift':
                    action = openShift(state) ? { type: 'shift-close', counted: fdNumber(fd, 'counted') } : { type: 'shift-open', opening: fdNumber(fd, 'opening') };
                    break;
                case 'request':
                    if (table)
                        action = { type: 'request-approval', kind: fd.get('kind') as 'Refund' | 'Void', tableId: table.id, amount: fdNumber(fd, 'amount'), reason: String(fd.get('reason')) };
                    break;
                case 'reset':
                    if (fd.get('confirm') !== 'RESET')
                        throw new Error('Ketik RESET untuk konfirmasi.');
                    onReset();
                    onClose();
                    return;
            }
            if (!action)
                throw new Error('Data tidak ditemukan. Tutup dan buka kembali dialog.');
            onAction(action);
            onClose();
        }
        catch (e) {
            setError(e instanceof Error ? e.message : 'Gagal menyimpan perubahan.');
        }
        finally {
            setBusy(false);
        }
    }
    function inlineAction(action: Action) { try {
        onAction(action);
        setError('');
    }
    catch (e) {
        setError(e instanceof Error ? e.message : 'Gagal memproses.');
    } }
    const field = (label: string, child: ReactNode) => <label className="field">
    <span>{label}</span>{child}</label>;
    const num = (name: string, value: number, min = 0) => <input name={name} type="number" inputMode="numeric" min={min} max="100000000" step="1" required defaultValue={value}/>;
    const paymentMethod = <div className="field">
    <span>Metode pembayaran</span>
    <div className="segmented payment-methods">{(['cash', 'qris', 'transfer'] as const).map(m => <button type="button" className={method === m ? 'selected' : ''} key={m} onClick={() => setMethod(m)} aria-pressed={method === m}>{m === 'cash' ? 'Tunai' : m === 'qris' ? 'QRIS demo' : 'Transfer demo'}</button>)}</div>{method !== 'cash' && <div className="notice amber">
        <Icon name="alert"/>Simulasi saja. Tidak ada QR atau transfer nyata. Sesi prepaid menunggu simulasi settlement.</div>}</div>;
    const quote = table ? dialog.kind === 'start' ? state.rates[table.kind] * minutes / 60 : dialog.kind === 'extend' ? (table.session?.rate ?? 0) * minutes / 60 : amount : 0;
    const cashInput = method === 'cash' && field('Uang diterima (Rp)', <input aria-label="Uang diterima (Rp)" type="number" inputMode="numeric" min={quote} max="100000000" step="1" required value={tendered ?? quote} onChange={e => setTendered(Number(e.target.value))}/>);
    const cashChange = method === 'cash' && <div className="detail-row">
    <span>Kembalian</span>
    <strong>{money(Math.max(0, (tendered ?? quote) - quote))}</strong>
    </div>;
    const errorNode = error && <div className="notice danger" role="alert">
    <Icon name="alert"/>{error}</div>;
    if (dialog.kind === 'bill') {
        const record = state.records.find(r => r.id === dialog.recordId);
        const s = record ?? table?.session;
        if (!s)
            return <Modal title="Bill tidak tersedia" onClose={onClose}>
            <div className="modal-body">
            <p>Belum ada sesi atau transaksi yang dipilih.</p>
            </div>
            </Modal>;
        const remaining = Math.max(0, total(s) - paid(s));
        return <Modal title={titles.bill} subtitle="Preview cetak 80 mm · gunakan dialog cetak Android" onClose={onClose}>
      <div className="modal-body">{errorNode}<article className="receipt">
        <Brand />
        <h3>GOLDEN HAND MAHJONG</h3>
        <p>{remaining === 0 ? 'RECEIPT · LUNAS' : 'BILL · BELUM LUNAS'}<br />DEMO — BUKAN TRANSAKSI NYATA</p>
        <hr />
        <p>ID {s.id.slice(0, 12).toUpperCase()}<br />Meja {String(record?.tableId ?? table?.id).padStart(2, '0')} · {date(record?.at ?? now)} {time(record?.at ?? now)} WIB</p>
        <hr />{s.charges.map(c => <div className="receipt-row" key={c.id}>
            <span>{c.label}</span>
            <strong>{money(c.amount)}</strong>
            </div>)}<hr />
        <div className="receipt-row">
        <strong>Total</strong>
        <strong>{money(total(s))}</strong>
        </div>{s.payments.map(p => <div className="receipt-row" key={p.id}>
            <span>{p.method === 'cash' ? 'Tunai' : `${p.method.toUpperCase()} (simulasi)`}</span>
            <span>{money(p.amount)}</span>
            </div>)}<div className="receipt-row">
        <strong>Sisa bayar</strong>
        <strong>{money(remaining)}</strong>
        </div>
        <hr />
        <p>Terima kasih atas kunjungan Anda.<br />Semoga tangan emas selalu menyertai.</p>
        <small>Preview / salinan demo · {date(now)} {time(now)} WIB</small>
        </article>
        <p className="muted small">{Capacitor.isNativePlatform()
            ? 'APK demo menyediakan preview bill. Cetak Android / ESC/POS belum terhubung.'
            : 'ESC/POS langsung memerlukan print bridge dan pengujian printer fisik pada fase berikutnya.'}</p>
        </div>
      <div className="modal-actions">
        <button className="button" onClick={onClose}>Tutup</button>
        <button className="button primary" disabled={Capacitor.isNativePlatform()} onClick={() => { try {
            onAction({ type: 'print', label: `${remaining === 0 ? 'Receipt' : 'Bill'} ${s.id.slice(0, 12)} · preview/salinan` });
            window.print();
        }
        catch (e) {
            setError(e instanceof Error ? e.message : 'Gagal mencetak.');
        } }}>
        <Icon name="print"/>Cetak 80 mm</button>
        </div>
    </Modal>;
    }
    if (dialog.kind === 'pending')
        return <Modal title={titles.pending} subtitle={`${titleTable} · semua metode non-tunai di sini adalah simulasi`} onClose={onClose}>
        <div className="modal-body">{errorNode}{table && pendingFor(state, table.id).map(i => <div className="pending-card" key={i.id}>
            <div className="section-heading">
            <BadgePending />
            <strong>{money(i.amount)}</strong>
            </div>
            <p>{i.method.toUpperCase()} · {i.kind === 'start' ? 'Mulai sesi' : i.kind === 'extend' ? 'Extend prepaid' : 'Bayar tagihan'}<br />
            <span className="muted">Referensi DEMO-{i.id.slice(0, 8)}</span>
            </p>
            <div className="notice amber">Belum menambah saldo pembayaran atau mengaktifkan durasi prepaid. Tombol di bawah hanya menjalankan simulasi lokal.</div>
            <div className="button-row">
            <button className="button danger" onClick={() => inlineAction({ type: 'cancel-intent', intentId: i.id })}>Batalkan pending</button>
            <button className="button primary" onClick={() => inlineAction({ type: 'settle', intentId: i.id })}>Simulasi settlement</button>
            </div>
            </div>)}{table && pendingFor(state, table.id).length === 0 && <p>Tidak ada pembayaran pending.</p>}</div>
        <div className="modal-actions">
        <button className="button" onClick={onClose}>Tutup</button>
        </div>
        </Modal>;
    if (dialog.kind === 'table')
        return <Modal title={titleTable} subtitle={`${table?.kind} · monitoring owner`} onClose={onClose}>
        <div className="modal-body">{table?.session ? <>
            <div className="detail-row">
            <span>Status</span>
            <strong>{status(table, now) === 'expired' ? 'Waktu habis · software cutoff' : 'Sesi aktif'}</strong>
            </div>
            <div className="detail-row">
            <span>Mulai</span>
            <strong>{time(table.session.started)} WIB</strong>
            </div>
            <div className="detail-row">
            <span>Cutoff</span>
            <strong>{time(table.session.expires)} WIB</strong>
            </div>
            <div className="detail-row">
            <span>Tarif snapshot sesi</span>
            <strong>{money(table.session.rate)}/jam</strong>
            </div>
            <div className="detail-row">
            <span>Tagihan / dibayar</span>
            <strong>{money(total(table.session))} / {money(paid(table.session))}</strong>
            </div>
            <div className="detail-row">
            <span>Outstanding</span>
            <strong>{money(due(table.session))}</strong>
            </div>
            </> : <p>{table?.state === 'cleaning' ? 'Meja sedang dibersihkan.' : 'Meja tersedia untuk sesi baru.'}</p>}<div className="notice">Durasi dan checkout dikelola di antarmuka kasir. Cutoff software tidak mematikan mesin Mahjong.</div>
        </div>
        </Modal>;
    let content: ReactNode;
    switch (dialog.kind) {
        case 'start':
            content = <>
            <div className="quote">
            <span>{table?.kind} · {money(table ? state.rates[table.kind] : 0)}/jam</span>
            <strong>{money(quote)}</strong>
            </div>{field('Durasi awal', <select value={minutes} onChange={e => { setMinutes(Number(e.target.value)); setTendered(undefined); }}>{[60, 120, 180, 240].map(m => <option key={m} value={m}>{m / 60} jam</option>)}</select>)}{field('Skema pembayaran', <select value={policy} onChange={e => setPolicy(e.target.value as Policy)}>
                <option value="mixed">Campuran · sewa prepaid, F&B postpaid</option>
                <option value="prepaid">Prepaid · sewa dibayar di depan</option>
                <option value="postpaid">Postpaid · bayar saat checkout</option>
                </select>)}{policy !== 'postpaid' && <>{paymentMethod}{cashInput}{cashChange}</>}<div className="notice">Harga sewa disimpan saat sesi dimulai. Meja prepaid aktif setelah pembayaran tercatat.</div>
            </>;
            break;
        case 'extend':
            content = <>
            <div className="quote">
            <span>Tarif sesi · {money(table?.session?.rate ?? 0)}/jam</span>
            <strong>{money(quote)}</strong>
            </div>{field('Tambahan durasi', <select value={minutes} onChange={e => { setMinutes(Number(e.target.value)); setTendered(undefined); }}>{[30, 60, 120].map(m => <option key={m} value={m}>{m < 60 ? `${m} menit` : `${m / 60} jam`}</option>)}</select>)}{field('Bayar extend', <select value={prepaid ? 'prepaid' : 'postpaid'} onChange={e => setPrepaid(e.target.value === 'prepaid')}>
                <option value="postpaid">Postpaid · tambah tagihan</option>
                <option value="prepaid">Prepaid · bayar sekarang</option>
                </select>)}{prepaid && <>{paymentMethod}{cashInput}{cashChange}</>}<div className="notice">Jika waktu sudah habis, tambahan durasi dihitung mulai sekarang. Tidak ada biaya keterlambatan otomatis.</div>
            </>;
            break;
        case 'payment':
            content = <>
            <div className="quote">
            <span>Saldo terutang</span>
            <strong>{money(due(table?.session ?? null))}</strong>
            </div>{field('Nominal pembayaran (Rp)', <input type="number" inputMode="numeric" min="1" max={due(table?.session ?? null)} step="1" value={amount} required onChange={e => { setAmount(Number(e.target.value)); setTendered(undefined); }}/>)}{paymentMethod}{cashInput}{cashChange}<div className="notice">Pembayaran parsial didukung. Checkout tersedia setelah saldo lunas dan pending selesai.</div>
            </>;
            break;
        case 'order':
            content = <>
            <div className="quote">
            <span>{product?.name}</span>
            <strong>{money(product?.price ?? 0)}</strong>
            </div>{field(`Jumlah · tersedia ${product?.stock ?? 0}`, <input type="number" inputMode="numeric" name="quantity" min="1" max={product?.stock} step="1" required defaultValue="1"/>)}<div className="notice">Harga disimpan saat order dikonfirmasi. Stok otomatis berkurang; kasir tidak dapat mengubah harga.</div>
            </>;
            break;
        case 'price':
            content = <>
            <h3>{product?.name}</h3>
            <div className="form-grid">{field('Harga jual (Rp)', num('price', product?.price ?? 0, 1))}{field('HPP / unit (Rp)', num('cost', product?.cost ?? 0))}</div>
            <div className="notice">Hanya order baru yang memakai harga baru. Laporan transaksi lama memakai snapshot HPP saat penjualan.</div>
            </>;
            break;
        case 'stock':
            content = <>
            <div className="quote">
            <span>{product?.name}</span>
            <strong>{product?.stock} unit</strong>
            </div>{field('Jenis perubahan', <select name="movement">
                <option value="add">Restock / koreksi bertambah</option>
                <option value="subtract">Rusak / koreksi berkurang</option>
                </select>)}{field('Jumlah unit', num('quantity', 1, 1))}{field('Alasan perubahan', <input name="reason" minLength={3} maxLength={160} required placeholder="Contoh: restock supplier"/>)}<div className="notice">Perubahan dicatat di audit demo. Stok tidak boleh negatif.</div>
            </>;
            break;
        case 'rate':
            content = <>{field('Tarif per jam (Rp)', <input name="price" type="number" inputMode="numeric" step="2" min="2" max="100000000" defaultValue={state.rates[dialog.rateKind ?? 'Standard']} required/>)}<div className="notice">Tarif baru berlaku untuk sesi berikutnya. Sesi aktif dan extend mempertahankan tarif saat sesi dimulai. Gunakan rupiah bulat genap untuk extend 30 menit.</div>
            </>;
            break;
        case 'product':
            content = <>{field('Nama produk', <input name="name" minLength={2} maxLength={100} required placeholder="Nama snack atau minuman"/>)}{field('Kategori', <select name="category">
                <option>Minuman</option>
                <option>Snack</option>
                </select>)}<div className="form-grid">{field('Harga jual (Rp)', num('price', 10000, 1))}{field('HPP (Rp)', num('cost', 0))}{field('Stok awal', num('stock', 0))}{field('Batas stok rendah', num('min', 5))}</div>
            </>;
            break;
        case 'staff':
            content = <>{field('Nama staf', <input name="name" defaultValue={member?.name} required minLength={2} maxLength={80}/>)}{field('Role', <select name="role" defaultValue={member?.role ?? 'cashier'}>
                <option value="cashier">Cashier · operasional</option>
                <option value="owner">Owner · pengaturan & laporan</option>
                </select>)}{field('Status', <select name="active" defaultValue={String(member?.active ?? true)}>
                <option value="true">Aktif</option>
                <option value="false">Nonaktif</option>
                </select>)}<div className="notice amber">Data staf demo saja. Tidak membuat akun login, mengirim undangan, atau memberikan akses nyata. Auth dan RBAC server menunggu Phase 2.</div>
            </>;
            break;
        case 'shift': {
            const shift = openShift(state);
            content = shift ? <>
            <div className="quote">
            <span>Kas seharusnya · {shift.staff}</span>
            <strong>{money(drawer(state, shift))}</strong>
            </div>
            <div className="detail-row">
            <span>Modal kas</span>
            <strong>{money(shift.opening)}</strong>
            </div>{field('Kas aktual di laci (Rp)', num('counted', drawer(state, shift)))}<div className="notice">Sesi terbuka tetap tersimpan. Setelah shift ditutup, buka shift baru untuk melanjutkan pencatatan transaksi.</div>
            </> : <>{field('Modal awal kas (Rp)', num('opening', 300000))}<div className="notice">Shift demo untuk Kasir Rina Putri.</div>
            </>;
            break;
        }
        case 'request':
            content = <>{field('Jenis permintaan', <select name="kind">
                <option>Refund</option>
                <option>Void</option>
                </select>)}{field('Nominal (Rp)', num('amount', 10000, 1))}{field('Alasan', <textarea name="reason" minLength={3} maxLength={160} required placeholder="Jelaskan alasan permintaan"/>)}<div className="notice amber">Alur approval demo; keputusan owner belum melakukan reversal pembayaran atau stok.</div>
            </>;
            break;
        case 'reset':
            content = <>
            <div className="notice danger">Menghapus seluruh data demo di browser ini, termasuk transaksi, stok, dan audit. Data contoh akan dibuat ulang.</div>
            <button type="button" className="button full" onClick={downloadData}>
            <Icon name="download"/>Ekspor backup terlebih dahulu</button>{field('Ketik RESET untuk konfirmasi', <input name="confirm" autoComplete="off" pattern="RESET" required placeholder="RESET"/>)}</>;
            break;
    }
    return <Modal title={titles[dialog.kind]} onClose={onClose}>
    <form onSubmit={submit}>
    <div className="modal-body">{errorNode}{content}</div>
    <div className="modal-actions">
    <button type="button" className="button" onClick={onClose}>Batal</button>
    <button type="submit" className={`button ${dialog.kind === 'reset' ? 'danger' : 'primary'}`} disabled={busy}>{busy ? 'Menyimpan…' : dialog.kind === 'start' ? policy === 'postpaid' || method === 'cash' ? 'Mulai sesi' : 'Buat pembayaran pending' : dialog.kind === 'payment' ? method === 'cash' ? 'Catat pembayaran' : 'Buat pending demo' : dialog.kind === 'reset' ? 'Reset demo' : 'Simpan & lanjutkan'}<Icon name="arrow" size={18}/>
    </button>
    </div>
    </form>
    </Modal>;
}
function BadgePending() {
    return <span className="badge warning">
    <span className="status-dot"/>Pending demo</span>;
}
