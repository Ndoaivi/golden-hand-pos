/** Phase 1 local demo rules. These checks are NOT a production security boundary. */
export type Role = 'cashier' | 'owner';
export type Policy = 'prepaid' | 'postpaid' | 'mixed';
export type Method = 'cash' | 'qris' | 'transfer';
export type TableStatus = 'available' | 'active' | 'expired' | 'cleaning';
export type Category = 'Minuman' | 'Snack';
export interface Product {
    id: string;
    name: string;
    category: Category;
    price: number;
    cost: number;
    stock: number;
    min: number;
    icon: string;
    active: boolean;
}
export interface Charge {
    id: string;
    kind: 'rental' | 'extension' | 'fnb';
    label: string;
    amount: number;
    cost: number;
    productId?: string;
    quantity?: number;
    unitPrice?: number;
}
export interface Payment {
    id: string;
    method: Method;
    amount: number;
    at: number;
    shiftId: string;
}
export interface Session {
    id: string;
    started: number;
    expires: number;
    duration: number;
    rate: number;
    policy: Policy;
    charges: Charge[];
    payments: Payment[];
}
export interface Table {
    id: number;
    kind: 'Standard';
    state: 'available' | 'active' | 'cleaning';
    session: Session | null;
}
export interface Intent {
    id: string;
    tableId: number;
    sessionId: string | null;
    kind: 'start' | 'extend' | 'payment';
    method: 'qris' | 'transfer';
    amount: number;
    minutes?: number;
    policy?: Policy;
    status: 'pending' | 'settled' | 'cancelled';
    at: number;
}
export interface Record {
    id: string;
    tableId: number;
    at: number;
    charges: Charge[];
    payments: Payment[];
}
export interface Shift {
    id: string;
    staff: string;
    opened: number;
    closed: number | null;
    opening: number;
    counted: number | null;
}
export interface Staff {
    id: string;
    name: string;
    role: Role;
    active: boolean;
}
export interface Approval {
    id: string;
    kind: 'Refund' | 'Void';
    tableId: number;
    amount: number;
    reason: string;
    staff: string;
    status: 'pending' | 'approved' | 'rejected';
    at: number;
}
export interface Audit {
    id: string;
    at: number;
    actor: string;
    title: string;
}
export interface State {
    version: 2;
    revision: number;
    tables: Table[];
    products: Product[];
    rates: {
        Standard: number;
    };
    records: Record[];
    intents: Intent[];
    shifts: Shift[];
    staff: Staff[];
    approvals: Approval[];
    audit: Audit[];
}
export type Action = {
    type: 'start';
    tableId: number;
    minutes: number;
    policy: Policy;
    method: Method;
    tendered: number;
} | {
    type: 'extend';
    tableId: number;
    minutes: number;
    prepaid: boolean;
    method: Method;
    tendered: number;
} | {
    type: 'order';
    tableId: number;
    productId: string;
    quantity: number;
} | {
    type: 'payment';
    tableId: number;
    method: Method;
    amount: number;
    tendered: number;
} | {
    type: 'settle' | 'cancel-intent';
    intentId: string;
} | {
    type: 'checkout' | 'ready';
    tableId: number;
} | {
    type: 'price';
    productId: string;
    price: number;
    cost: number;
} | {
    type: 'stock';
    productId: string;
    delta: number;
    reason: string;
} | {
    type: 'catalog';
    product: Product;
} | {
    type: 'toggle-product';
    productId: string;
} | {
    type: 'rate';
    kind: 'Standard';
    price: number;
} | {
    type: 'approval';
    id: string;
    decision: 'approved' | 'rejected';
} | {
    type: 'request-approval';
    kind: 'Refund' | 'Void';
    tableId: number;
    amount: number;
    reason: string;
} | {
    type: 'staff';
    staff: Staff;
} | {
    type: 'shift-open';
    opening: number;
} | {
    type: 'shift-close';
    counted: number;
} | {
    type: 'print';
    label: string;
};
const id = () => crypto.randomUUID();
export const money = (n: number) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(n);
export const time = (n: number) => new Date(n).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Jakarta' });
export const date = (n: number) => new Date(n).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'Asia/Jakarta' });
export const localDay = (n: number) => new Date(n).toLocaleDateString('en-CA', { timeZone: 'Asia/Jakarta' });
export const total = (s: Pick<Session, 'charges'> | null) => s?.charges.reduce((sum, c) => sum + c.amount, 0) ?? 0;
export const paid = (s: Pick<Session, 'payments'> | null) => s?.payments.reduce((sum, p) => sum + p.amount, 0) ?? 0;
export const due = (s: Session | null) => Math.max(0, total(s) - paid(s));
export const status = (t: Table, now: number): TableStatus => t.state === 'active' && t.session && t.session.expires <= now ? 'expired' : t.state;
export const countdown = (expires: number, now: number) => {
    const seconds = Math.max(0, Math.ceil((expires - now) / 1000));
    return [Math.floor(seconds / 3600), Math.floor(seconds % 3600 / 60), seconds % 60].map(n => String(n).padStart(2, '0')).join(':');
};
export const openShift = (s: State) => s.shifts.find(x => x.closed === null);
export const payments = (s: State) => [...s.records.flatMap(r => r.payments), ...s.tables.flatMap(t => t.session?.payments ?? [])];
export const pendingFor = (s: State, tableId: number) => s.intents.filter(i => i.tableId === tableId && i.status === 'pending');
export const drawer = (s: State, shift: Shift) => shift.opening + payments(s).filter(p => p.shiftId === shift.id && p.method === 'cash').reduce((sum, p) => sum + p.amount, 0);
export function report(s: State, day: string) {
    const records = s.records.filter(r => localDay(r.at) === day);
    const charges = records.flatMap(r => r.charges);
    const collected = payments(s).filter(p => localDay(p.at) === day);
    const rental = charges.filter(c => c.kind !== 'fnb').reduce((v, c) => v + c.amount, 0);
    const fnb = charges.filter(c => c.kind === 'fnb').reduce((v, c) => v + c.amount, 0);
    const cost = charges.reduce((v, c) => v + c.cost, 0);
    return { rental, fnb, sales: rental + fnb, cost, profit: rental + fnb - cost,
        cash: collected.filter(p => p.method === 'cash').reduce((v, p) => v + p.amount, 0),
        qris: collected.filter(p => p.method === 'qris').reduce((v, p) => v + p.amount, 0),
        transfer: collected.filter(p => p.method === 'transfer').reduce((v, p) => v + p.amount, 0),
        collected: collected.reduce((v, p) => v + p.amount, 0), outstanding: s.tables.reduce((v, t) => v + due(t.session), 0), records };
}
function check(ok: unknown, message: string): asserts ok { if (!ok)
    throw new Error(message); }
function integer(n: number, min = 0) { return Number.isSafeInteger(n) && n >= min && n <= 100000000; }
function createSession(table: Table, rate: number, minutes: number, policy: Policy, now: number): Session {
    check(integer(rate * minutes / 60), 'Total sewa melebihi batas nominal demo.');
    return { id: id(), started: now, expires: now + minutes * 60000, duration: minutes, rate, policy,
        charges: [{ id: id(), kind: 'rental', label: `Sewa ${minutes / 60} jam · ${table.kind}`, amount: rate * minutes / 60, cost: 0 }], payments: [] };
}
export function seed(now = Date.now()): State {
    const products: Product[] = [
        ['Air Mineral 600ml', 'Minuman', 8000, 3500, 36, 'water'],
        ['Coca-Cola Kaleng', 'Minuman', 12000, 6500, 5, 'drink'],
        ['Es Teh Manis', 'Minuman', 10000, 3000, 23, 'tea'],
        ['Kopi Americano', 'Minuman', 18000, 6000, 28, 'coffee'],
        ['Kentang Goreng', 'Snack', 25000, 10000, 9, 'snack'],
        ['Keripik Kentang', 'Snack', 15000, 7000, 3, 'snack'],
        ['Kacang Panggang', 'Snack', 12000, 5000, 18, 'snack'],
        ['Roti Bakar', 'Snack', 22000, 9000, 12, 'snack'],
    ].map((p, i) => ({ id: `p${i + 1}`, name: String(p[0]), category: p[1] as Category, price: Number(p[2]), cost: Number(p[3]), stock: Number(p[4]), icon: String(p[5]), min: 5, active: true }));
    const shift: Shift = { id: 'shift-demo', staff: 'Rina Putri', opened: now - 3 * 3600000, closed: null, opening: 300000, counted: null };
    const tables: Table[] = Array.from({ length: 5 }, (_, i) => ({ id: i + 1, kind: 'Standard', state: 'available', session: null }));
    for (const [tableId, minutes, offset, policy] of [[1, 120, 82, 'mixed'], [2, 180, 135, 'postpaid'], [4, 120, 48, 'postpaid'], [5, 120, 127, 'postpaid']] as const) {
        const t = tables[tableId - 1];
        t.state = 'active';
        t.session = createSession(t, 80000, minutes, policy, now - offset * 60000);
        if (tableId === 1)
            t.session.payments.push({ id: id(), method: 'cash', amount: 160000, at: t.session.started, shiftId: shift.id });
    }
    const records: Record[] = Array.from({ length: 14 }, (_, i) => {
        const at = now - Math.floor(i / 2) * 86400000 - (i % 2 ? 45 : 90) * 60000;
        const charges: Charge[] = [{ id: id(), kind: 'rental', label: `Sewa ${i % 3 ? 2 : 3} jam · Standard`, amount: i % 3 ? 160000 : 240000, cost: 0 },
            { id: id(), kind: 'fnb', label: 'Kopi Americano × 2', amount: 36000, cost: 12000, productId: 'p4', quantity: 2, unitPrice: 18000 }];
        return { id: `GH-DEMO-${String(i + 1).padStart(3, '0')}`, tableId: i % 5 + 1, at, charges,
            payments: [{ id: id(), method: i % 3 === 0 ? 'qris' : 'cash', amount: charges.reduce((v, c) => v + c.amount, 0), at, shiftId: localDay(at) === localDay(now) ? shift.id : 'shift-history' }] };
    });
    return { version: 2, revision: 0, tables, products, rates: { Standard: 80000 }, records, intents: [], shifts: [shift],
        staff: [{ id: 'owner', name: 'Owner', role: 'owner', active: true }, { id: 'rina', name: 'Rina Putri', role: 'cashier', active: true }, { id: 'ayu', name: 'Ayu Pratama', role: 'cashier', active: true }],
        approvals: [{ id: 'approval-demo', kind: 'Refund', tableId: 2, amount: 12000, reason: 'Minuman salah input — permintaan contoh', staff: 'Rina Putri', status: 'pending', at: now - 1200000 }],
        audit: [{ id: id(), at: now, actor: 'System', title: 'Data contoh Phase 1 dibuat · tepat 5 meja' }] };
}
export function transition(current: State, action: Action, role: Role, now = Date.now()): State {
    const s = structuredClone(current);
    const ownerActions = ['price', 'stock', 'catalog', 'toggle-product', 'rate', 'approval', 'staff'];
    if (ownerActions.includes(action.type))
        check(role === 'owner', 'Hanya owner yang dapat mengubah pengaturan ini.');
    if (['start', 'extend', 'order', 'payment', 'settle', 'checkout', 'shift-close'].includes(action.type))
        check(openShift(s), 'Buka shift kasir sebelum mencatat transaksi.');
    const t = 'tableId' in action ? s.tables.find(t => t.id === action.tableId) : undefined;
    if ('tableId' in action)
        check(t, 'Meja tidak ditemukan.');
    const product = 'productId' in action ? s.products.find(p => p.id === action.productId) : undefined;
    if ('productId' in action)
        check(product, 'Produk tidak ditemukan.');
    const addPayment = (session: Session, method: Method, amount: number) => {
        const shift = openShift(s);
        check(shift, 'Shift belum dibuka.');
        session.payments.push({ id: id(), method, amount, at: now, shiftId: shift.id });
    };
    const extend = (table: Table, minutes: number) => {
        const session = table.session;
        check(session, 'Sesi tidak ditemukan.');
        check(integer(session.rate * minutes / 60), 'Biaya extend melebihi batas nominal demo.');
        session.expires = Math.max(now, session.expires) + minutes * 60000;
        session.duration += minutes;
        session.charges.push({ id: id(), kind: 'extension', label: `Extend +${minutes} menit`, amount: session.rate * minutes / 60, cost: 0 });
    };
    const intent = (table: Table, kind: Intent['kind'], method: 'qris' | 'transfer', amount: number, minutes?: number, policy?: Policy) => {
        check(integer(amount, 1), 'Nominal melebihi batas demo.');
        check(pendingFor(s, table.id).length === 0, 'Selesaikan atau batalkan pembayaran pending terlebih dahulu.');
        s.intents.push({ id: id(), tableId: table.id, sessionId: table.session?.id ?? null, kind, method, amount, minutes, policy, status: 'pending', at: now });
    };
    let message: string = action.type;
    switch (action.type) {
        case 'start': {
            check(t && t.state === 'available' && !t.session, 'Meja belum tersedia.');
            check(pendingFor(s, t.id).length === 0, 'Pembayaran awal masih pending.');
            check([60, 120, 180, 240].includes(action.minutes), 'Durasi awal tidak valid.');
            check(['prepaid', 'postpaid', 'mixed'].includes(action.policy), 'Skema pembayaran tidak valid.');
            check(['cash', 'qris', 'transfer'].includes(action.method), 'Metode pembayaran tidak valid.');
            const amount = s.rates[t.kind] * action.minutes / 60;
            if (action.policy !== 'postpaid' && action.method !== 'cash')
                intent(t, 'start', action.method, amount, action.minutes, action.policy);
            else {
                if (action.policy !== 'postpaid')
                    check(integer(action.tendered) && action.tendered >= amount, 'Uang diterima kurang dari biaya sewa.');
                t.session = createSession(t, s.rates[t.kind], action.minutes, action.policy, now);
                t.state = 'active';
                if (action.policy !== 'postpaid')
                    addPayment(t.session, 'cash', amount);
            }
            message = `Mulai Meja ${t.id} · ${action.policy}`;
            break;
        }
        case 'extend': {
            check(t?.session && t.state === 'active', 'Meja tidak memiliki sesi terbuka.');
            check(pendingFor(s, t.id).length === 0, 'Selesaikan pembayaran pending terlebih dahulu.');
            check([30, 60, 120].includes(action.minutes), 'Durasi extend tidak valid.');
            check(['cash', 'qris', 'transfer'].includes(action.method), 'Metode pembayaran tidak valid.');
            const amount = t.session.rate * action.minutes / 60;
            if (action.prepaid && action.method !== 'cash')
                intent(t, 'extend', action.method, amount, action.minutes);
            else {
                if (action.prepaid)
                    check(integer(action.tendered) && action.tendered >= amount, 'Uang diterima kurang dari biaya extend.');
                extend(t, action.minutes);
                if (action.prepaid)
                    addPayment(t.session, 'cash', amount);
            }
            message = `Extend Meja ${t.id} · ${action.minutes} menit`;
            break;
        }
        case 'order': {
            check(t?.session && status(t, now) === 'active', 'F&B hanya dapat ditambahkan pada sesi aktif.');
            check(product?.active && integer(action.quantity, 1) && action.quantity <= product.stock, 'Jumlah tidak valid atau stok tidak cukup.');
            check(integer(product.price * action.quantity, 1) && integer(product.cost * action.quantity), 'Total pesanan melebihi batas nominal demo.');
            product.stock -= action.quantity;
            t.session.charges.push({ id: id(), kind: 'fnb', label: `${product.name} × ${action.quantity}`, amount: product.price * action.quantity,
                cost: product.cost * action.quantity, productId: product.id, quantity: action.quantity, unitPrice: product.price });
            message = `Pesanan Meja ${t.id} · ${product.name} × ${action.quantity}`;
            break;
        }
        case 'payment': {
            check(t?.session && t.state === 'active', 'Sesi tidak ditemukan.');
            check(pendingFor(s, t.id).length === 0, 'Selesaikan pembayaran pending terlebih dahulu.');
            check(integer(action.amount, 1) && action.amount <= due(t.session), 'Nominal harus positif dan tidak melebihi saldo.');
            check(['cash', 'qris', 'transfer'].includes(action.method), 'Metode pembayaran tidak valid.');
            if (action.method === 'cash') {
                check(integer(action.tendered) && action.tendered >= action.amount, 'Uang diterima tidak cukup.');
                addPayment(t.session, 'cash', action.amount);
            }
            else
                intent(t, 'payment', action.method, action.amount);
            message = `Pembayaran Meja ${t.id} · ${action.method} · ${money(action.amount)}`;
            break;
        }
        case 'settle':
        case 'cancel-intent': {
            const i = s.intents.find(i => i.id === action.intentId);
            check(i?.status === 'pending', 'Pembayaran sudah diproses.');
            if (action.type === 'cancel-intent') {
                i.status = 'cancelled';
                message = `Batalkan pending ${i.id}`;
                break;
            }
            const table = s.tables.find(t => t.id === i.tableId);
            check(table, 'Meja tidak ditemukan.');
            if (i.kind === 'start') {
                check(table.state === 'available' && !table.session && i.minutes && i.policy, 'Sesi awal tidak valid.');
                // Pending intent retains quoted amount even after an owner rate change.
                table.session = createSession(table, i.amount * 60 / i.minutes, i.minutes, i.policy, now);
                table.state = 'active';
            }
            else {
                check(table.session?.id === i.sessionId && table.state === 'active', 'Sesi pembayaran sudah berubah.');
                if (i.kind === 'extend') {
                    check(i.minutes, 'Durasi tidak valid.');
                    extend(table, i.minutes);
                }
                else
                    check(i.amount <= due(table.session), 'Nominal pending melebihi saldo saat ini.');
            }
            check(table.session, 'Sesi tidak ditemukan.');
            addPayment(table.session, i.method, i.amount);
            i.status = 'settled';
            message = `SIMULASI settlement ${i.method} · Meja ${table.id}`;
            break;
        }
        case 'checkout':
            check(t?.session && due(t.session) === 0 && pendingFor(s, t.id).length === 0, 'Tagihan harus lunas dan tidak ada pembayaran pending.');
            s.records.unshift({ id: t.session.id, tableId: t.id, at: now, charges: t.session.charges, payments: t.session.payments });
            t.state = 'cleaning';
            t.session = null;
            message = `Checkout Meja ${t.id} · lanjut cleaning`;
            break;
        case 'ready':
            check(t?.state === 'cleaning', 'Meja tidak sedang cleaning.');
            t.state = 'available';
            message = `Meja ${t.id} selesai dibersihkan`;
            break;
        case 'price':
            check(product && integer(action.price, 1) && integer(action.cost), 'Harga atau HPP tidak valid.');
            product.price = action.price;
            product.cost = action.cost;
            message = `Harga ${product.name} → ${money(action.price)} · HPP ${money(action.cost)}`;
            break;
        case 'stock':
            check(product && Number.isSafeInteger(action.delta) && action.delta !== 0 && integer(product.stock + action.delta) && action.reason.trim().length >= 3, 'Jumlah stok atau alasan tidak valid.');
            product.stock += action.delta;
            message = `Stok ${product.name} ${action.delta > 0 ? '+' : ''}${action.delta} · ${action.reason.trim()}`;
            break;
        case 'catalog': {
            const p = action.product;
            check(p.name.trim().length >= 2 && p.name.length <= 100 && ['Minuman', 'Snack'].includes(p.category) && integer(p.price, 1) && integer(p.cost) && integer(p.stock) && integer(p.min), 'Data produk tidak valid.');
            check(!s.products.some(x => x.id === p.id || x.name.toLowerCase() === p.name.trim().toLowerCase()), 'Produk sudah ada.');
            s.products.push({ ...p, id: id(), name: p.name.trim(), active: true });
            message = `Tambah produk ${p.name}`;
            break;
        }
        case 'toggle-product':
            check(product, 'Produk tidak ditemukan.');
            product.active = !product.active;
            message = `${product.active ? 'Aktifkan' : 'Arsipkan'} ${product.name}`;
            break;
        case 'rate':
            check(action.kind === 'Standard' && integer(action.price, 1) && action.price % 2 === 0, 'Tarif Standard harus rupiah bulat genap untuk extend 30 menit.');
            s.rates[action.kind] = action.price;
            message = `Tarif ${action.kind} → ${money(action.price)}/jam`;
            break;
        case 'approval': {
            const a = s.approvals.find(a => a.id === action.id);
            check(a?.status === 'pending' && ['approved', 'rejected'].includes(action.decision), 'Approval sudah diproses.');
            a.status = action.decision;
            message = `SIMULASI ${a.kind} ${action.decision} · ${money(a.amount)} · tidak mengubah ledger`;
            break;
        }
        case 'request-approval':
            check(t && integer(action.amount, 1) && action.reason.trim().length >= 3 && ['Refund', 'Void'].includes(action.kind), 'Nominal atau alasan tidak valid.');
            s.approvals.unshift({ id: id(), kind: action.kind, tableId: t.id, amount: action.amount, reason: action.reason.trim(), staff: openShift(s)?.staff ?? 'Kasir Demo', status: 'pending', at: now });
            message = `Permintaan ${action.kind} · Meja ${t.id}`;
            break;
        case 'staff': {
            const f = action.staff;
            check(f.name.trim().length >= 2 && f.name.length <= 80 && ['owner', 'cashier'].includes(f.role), 'Data staf tidak valid.');
            const existing = s.staff.find(x => x.id === f.id);
            if (existing?.role === 'owner' && existing.active && (f.role !== 'owner' || !f.active))
                check(s.staff.some(x => x.id !== f.id && x.role === 'owner' && x.active), 'Minimal satu owner aktif diperlukan.');
            if (existing)
                Object.assign(existing, { ...f, name: f.name.trim() });
            else
                s.staff.push({ ...f, id: id(), name: f.name.trim() });
            message = `Staf ${f.name} · ${f.role} · ${f.active ? 'aktif' : 'nonaktif'}`;
            break;
        }
        case 'shift-open':
            check(!openShift(s) && integer(action.opening), 'Shift sudah terbuka atau modal kas tidak valid.');
            s.shifts.unshift({ id: id(), staff: 'Rina Putri', opened: now, closed: null, opening: action.opening, counted: null });
            message = 'Buka shift kasir';
            break;
        case 'shift-close': {
            const shift = openShift(s);
            check(shift && integer(action.counted), 'Kas aktual tidak valid.');
            check(!s.intents.some(i => i.status === 'pending'), 'Selesaikan pembayaran pending sebelum menutup shift.');
            shift.closed = now;
            shift.counted = action.counted;
            message = `Tutup shift · selisih ${money(action.counted - drawer(s, shift))}`;
            break;
        }
        case 'print':
            message = `Permintaan cetak browser · ${action.label}`;
            break;
    }
    s.revision += 1;
    s.audit.unshift({ id: id(), at: now, actor: role === 'owner' ? 'Owner Demo' : 'Kasir Demo', title: message });
    return s;
}
/** Reject malformed local data instead of silently replacing users' stored transactions. */
type LegacyState = Omit<State, 'version' | 'tables' | 'rates'> & {
    version: 1;
    tables: (Omit<Table, 'kind'> & { kind: 'Standard' | 'VIP' })[];
    rates: { Standard: number; VIP: number };
};
function validateStoredState(value: unknown, legacy: boolean): boolean {
    try {
        const s = value as State | LegacyState;
        if (!s || s.version !== (legacy ? 1 : 2) || !integer(s.revision) || !Array.isArray(s.tables) || s.tables.length !== 5)
            return false;
        const numeric = (n: number) => Number.isFinite(n) && n >= 0;
        const charge = (c: Charge) => typeof c.id === 'string' && typeof c.label === 'string' && ['rental', 'extension', 'fnb'].includes(c.kind) && integer(c.amount) && integer(c.cost);
        const payment = (p: Payment) => typeof p.id === 'string' && ['cash', 'qris', 'transfer'].includes(p.method) && integer(p.amount, 1) && numeric(p.at) && typeof p.shiftId === 'string';
        if (!s.tables.every((t, i) => t.id === i + 1 && (legacy ? ['Standard', 'VIP'].includes(t.kind) : t.kind === 'Standard') && ['available', 'active', 'cleaning'].includes(t.state) && (t.state === 'active' ? t.session && typeof t.session.id === 'string' && numeric(t.session.started) && numeric(t.session.expires) && integer(t.session.rate, 1) && integer(t.session.duration, 1) && ['prepaid', 'postpaid', 'mixed'].includes(t.session.policy) && t.session.charges.every(charge) && t.session.payments.every(payment) && paid(t.session) <= total(t.session) : t.session === null)))
            return false;
        if (!integer(s.rates.Standard, 1) || s.rates.Standard % 2 !== 0 || (legacy ? !integer((s as LegacyState).rates.VIP, 1) || (s as LegacyState).rates.VIP % 2 !== 0 : Object.keys(s.rates).length !== 1))
            return false;
        if (!Array.isArray(s.products) || !s.products.every(p => typeof p.id === 'string' && typeof p.name === 'string' && typeof p.icon === 'string' && typeof p.active === 'boolean' && ['Snack', 'Minuman'].includes(p.category) && integer(p.price, 1) && integer(p.cost) && integer(p.stock) && integer(p.min)))
            return false;
        if (!Array.isArray(s.records) || !s.records.every(r => typeof r.id === 'string' && r.tableId >= 1 && r.tableId <= 5 && numeric(r.at) && r.charges.every(charge) && r.payments.every(payment)))
            return false;
        if (!Array.isArray(s.intents) || !s.intents.every(i => typeof i.id === 'string' && i.tableId >= 1 && i.tableId <= 5 && ['start', 'extend', 'payment'].includes(i.kind) && ['qris', 'transfer'].includes(i.method) && integer(i.amount, 1) && ['pending', 'settled', 'cancelled'].includes(i.status) && numeric(i.at)))
            return false;
        if (!Array.isArray(s.shifts) || !s.shifts.every(x => typeof x.id === 'string' && typeof x.staff === 'string' && numeric(x.opened) && (x.closed === null || numeric(x.closed)) && integer(x.opening) && (x.counted === null || integer(x.counted))))
            return false;
        if (!Array.isArray(s.staff) || !s.staff.every(f => typeof f.id === 'string' && typeof f.name === 'string' && ['owner', 'cashier'].includes(f.role) && typeof f.active === 'boolean'))
            return false;
        if (!Array.isArray(s.approvals) || !s.approvals.every(a => typeof a.id === 'string' && ['Refund', 'Void'].includes(a.kind) && integer(a.amount, 1) && typeof a.reason === 'string' && typeof a.staff === 'string' && ['pending', 'approved', 'rejected'].includes(a.status) && numeric(a.at)))
            return false;
        return Array.isArray(s.audit) && s.audit.every(a => typeof a.id === 'string' && numeric(a.at) && typeof a.actor === 'string' && typeof a.title === 'string');
    }
    catch {
        return false;
    }
}
export function validateState(value: unknown): value is State {
    return validateStoredState(value, false);
}
/** Upgrade table configuration only. Never reprice an existing bill or pending quote. */
export function migrateState(value: unknown, now = Date.now()): State {
    if (validateState(value)) return value;
    check(validateStoredState(value, true), 'Data demo tersimpan tidak valid. Ekspor data sebelum mereset demo.');
    const previous = structuredClone(value) as LegacyState;
    const next: State = {
        ...previous,
        version: 2,
        revision: previous.revision + 1,
        tables: previous.tables.map(table => ({ ...table, kind: 'Standard' })),
        rates: { Standard: previous.rates.Standard },
        audit: [{ id: id(), at: now, actor: 'System', title: 'Konfigurasi diperbarui: lima meja Standard; tagihan lama dipertahankan' }, ...previous.audit],
    };
    check(validateState(next), 'Migrasi demo gagal. Data lama tetap tersimpan.');
    return next;
}
