/** Device boundaries. No bank SDK, card processing or native transport is connected here. */
export type PrinterTransport = 'usb' | 'bluetooth-classic' | 'bluetooth-le' | 'tcp';
export type PrinterProfile = {
    id: string;
    paperWidthMm: 80;
    columns: number;
    widthDots: number;
    codePage: number;
    cut: 'none' | 'partial' | 'full';
};
export const escPos80: PrinterProfile = {
    id: 'escpos-80mm-48', paperWidthMm: 80, columns: 48, widthDots: 576, codePage: 0, cut: 'none',
};
export type ReceiptDocument = {
    id: string;
    table: number;
    timestamp: string;
    settled: boolean;
    rows: { label: string; amount: string }[];
    total: string;
    payments: { label: string; amount: string }[];
    outstanding: string;
    demo: boolean;
    logo?: { width: number; height: number; rgba: Uint8Array };
};
export type PrintJob = { id: string; bytes: Uint8Array; paperWidthMm: 80 };
export type PrinterDelivery = { jobId: string; status: 'submitted'; paperConfirmed: false };
export interface ThermalPrinterAdapter {
    readonly id: string;
    readonly transport: PrinterTransport;
    supports(profile: PrinterProfile): boolean;
    submit(job: PrintJob): Promise<PrinterDelivery>;
}

function requireProfile(profile: PrinterProfile): void {
    if (profile.paperWidthMm !== 80 || !Number.isInteger(profile.columns) || profile.columns < 24 || profile.columns > 64 ||
        !Number.isInteger(profile.widthDots) || profile.widthDots < 192 || profile.widthDots > 832 ||
        !Number.isInteger(profile.codePage) || profile.codePage < 0 || profile.codePage > 255 ||
        !['none', 'partial', 'full'].includes(profile.cut)) throw new Error('Profil printer 80 mm tidak valid.');
}
function ascii(value: string): string {
    // Text must not inject printer controls; non-ASCII printing needs a model-specific profile.
    return value.normalize('NFKD').replace(/[\u0300-\u036f]/g, '').replace(/[\u2010-\u2015]/g, '-')
        .replace(/\u00a0/g, ' ').replace(/[^\x20-\x7e]/g, '?');
}
function wrap(value: string, columns: number): string[] {
    const text = ascii(value);
    return text ? Array.from({ length: Math.ceil(text.length / columns) }, (_, i) => text.slice(i * columns, (i + 1) * columns)) : [''];
}
function lineItem(label: string, amount: string, columns: number): string[] {
    const price = ascii(amount);
    if (price.length >= columns) throw new Error('Nominal terlalu panjang untuk profil printer.');
    const labels = wrap(label, columns);
    const last = labels.pop()!;
    return last.length + price.length + 1 <= columns
        ? [...labels, last + ' '.repeat(columns - last.length - price.length) + price]
        : [...labels, last, ' '.repeat(columns - price.length) + price];
}
export function monochromeRaster(width: number, height: number, rgba: Uint8Array): Uint8Array {
    if (!Number.isInteger(width) || width < 1 || width > 832 || !Number.isInteger(height) || height < 1 || height > 1024 || rgba.length !== width * height * 4) {
        throw new Error('Raster logo tidak valid.');
    }
    const rowBytes = Math.ceil(width / 8);
    const bytes = new Uint8Array(rowBytes * height);
    for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
        const i = (y * width + x) * 4, alpha = rgba[i + 3] / 255;
        const brightness = (0.299 * rgba[i] + 0.587 * rgba[i + 1] + 0.114 * rgba[i + 2]) * alpha + 255 * (1 - alpha);
        if (brightness < 160) bytes[y * rowBytes + (x >> 3)] |= 0x80 >> (x % 8);
    }
    return bytes;
}
export function buildEscPosReceipt(receipt: ReceiptDocument, profile: PrinterProfile = escPos80): Uint8Array {
    requireProfile(profile);
    if (!receipt.id || !Number.isInteger(receipt.table) || receipt.table < 1 || receipt.table > 5) throw new Error('Identitas bill tidak valid.');
    const chunks: number[][] = [[0x1b, 0x40], [0x1b, 0x74, profile.codePage]];
    const text = (lines: string[]) => chunks.push([...new TextEncoder().encode(lines.join('\n') + '\n')]);
    if (receipt.logo) {
        const { width, height, rgba } = receipt.logo;
        if (width > profile.widthDots) throw new Error('Logo melebihi lebar cetak; skalakan dengan rasio asli sebelum encoding.');
        const bitmap = monochromeRaster(width, height, rgba), rowBytes = Math.ceil(width / 8);
        // GS v 0 is a legacy compatibility profile; newer models may require GS ( L.
        chunks.push([0x1b, 0x61, 1], [0x1d, 0x76, 0x30, 0, rowBytes & 255, rowBytes >> 8, height & 255, height >> 8, ...bitmap], [0x0a]);
    }
    chunks.push([0x1b, 0x61, 1]);
    text(['GOLDEN HAND MAHJONG', receipt.settled ? 'RECEIPT - LUNAS' : 'BILL - BELUM LUNAS', ...(receipt.demo ? ['DEMO - BUKAN TRANSAKSI NYATA'] : []), ...wrap(`ID ${receipt.id}`, profile.columns), `Meja ${String(receipt.table).padStart(2, '0')}`, ...wrap(receipt.timestamp, profile.columns)]);
    chunks.push([0x1b, 0x61, 0]);
    text(['-'.repeat(profile.columns), ...receipt.rows.flatMap(row => lineItem(row.label, row.amount, profile.columns)), '-'.repeat(profile.columns), ...lineItem('Total', receipt.total, profile.columns), ...receipt.payments.flatMap(row => lineItem(row.label, row.amount, profile.columns)), ...lineItem('Sisa bayar', receipt.outstanding, profile.columns)]);
    chunks.push([0x1b, 0x61, 1]);text(['Terima kasih atas kunjungan Anda.', receipt.demo ? 'Preview / salinan demo' : 'Salinan', '', '', '']);
    if (profile.cut !== 'none') chunks.push([0x1d, 0x56, profile.cut === 'partial' ? 1 : 0]);
    return new Uint8Array(chunks.flat());
}
export class PrinterAdapters {
    private readonly adapters = new Map<string, ThermalPrinterAdapter>();
    register(adapter: ThermalPrinterAdapter): void {
        if (!adapter.id || this.adapters.has(adapter.id)) throw new Error('Adapter printer sudah terdaftar atau tidak valid.');
        this.adapters.set(adapter.id, adapter);
    }
    async print(adapterId: string, jobId: string, receipt: ReceiptDocument, profile: PrinterProfile = escPos80): Promise<PrinterDelivery> {
        const adapter = this.adapters.get(adapterId);
        if (!adapter) throw new Error('Printer belum terhubung. Pasang adapter sesuai model dan koneksi perangkat.');
        requireProfile(profile);
        if (!jobId || !adapter.supports(profile)) throw new Error('Adapter tidak mendukung profil printer ini.');
        const delivery = await adapter.submit({ id: jobId, bytes: buildEscPosReceipt(receipt, profile), paperWidthMm: 80 });
        if (delivery.jobId !== jobId || delivery.status !== 'submitted' || delivery.paperConfirmed !== false) throw new Error('Respons adapter printer tidak valid.');
        return delivery;
    }
}

export type TerminalRequest = { requestId: string; billId: string; amount: number; currency: 'IDR' };
export type TerminalResult =
    { status: 'approved'; requestId: string; amount: number; currency: 'IDR'; reference: string } |
    { status: 'declined'; requestId: string; reason: string } |
    { status: 'unknown'; requestId: string; reason: string };
export interface EdcAdapter {
    readonly id: string;
    purchase(request: TerminalRequest): Promise<TerminalResult>;
    lookup(request: TerminalRequest): Promise<TerminalResult>;
}
function validRequest(request: TerminalRequest): void {
    if (!request.requestId || !request.billId || request.currency !== 'IDR' || !Number.isSafeInteger(request.amount) || request.amount < 1 || request.amount > 9999999999) throw new Error('Permintaan EDC tidak valid.');
}
function fingerprint(request: TerminalRequest): string {
    return JSON.stringify([request.requestId, request.billId, request.amount, request.currency]);
}
function checkedResult(result: TerminalResult, request: TerminalRequest): TerminalResult {
    if (result.requestId !== request.requestId || !['approved', 'declined', 'unknown'].includes(result.status) ||
        (result.status === 'approved' && (result.amount !== request.amount || result.currency !== 'IDR' || !result.reference?.trim()))) {
        return { status: 'unknown', requestId: request.requestId, reason: 'Respons terminal tidak cocok dengan tagihan. Periksa hasil sebelum mencoba lagi.' };
    }
    return result;
}
/** In-process duplicate protection only; a server and durable idempotency are required in production. */
export class EdcCoordinator {
    private readonly attempts = new Map<string, { fingerprint: string; result: Promise<TerminalResult> }>();
    private readonly adapter: EdcAdapter;
    constructor(adapter: EdcAdapter) { this.adapter = adapter; }
    purchase(request: TerminalRequest): Promise<TerminalResult> {
        validRequest(request);
        const input = { ...request }, signature = fingerprint(input), old = this.attempts.get(input.requestId);
        if (old) {
            if (old.fingerprint !== signature) throw new Error('ID transaksi EDC digunakan untuk tagihan berbeda.');
            return old.result;
        }
        const result = Promise.resolve().then(() => this.adapter.purchase(input))
            .then(value => checkedResult(value, input))
            .catch((): TerminalResult => ({ status: 'unknown', requestId: input.requestId, reason: 'Hasil EDC belum diketahui. Periksa hasil sebelum mencoba lagi.' }));
        this.attempts.set(input.requestId, { fingerprint: signature, result });
        return result;
    }
    async reconcile(request: TerminalRequest): Promise<TerminalResult> {
        validRequest(request);
        const input = { ...request }, old = this.attempts.get(input.requestId);
        if (!old || old.fingerprint !== fingerprint(input)) throw new Error('Transaksi EDC belum dimulai atau tagihan berubah.');
        // Serialize lookups for the same attempt; reconciliation never initiates another purchase.
        const result = old.result.then(async previous => {
            if (previous.status !== 'unknown') return previous;
            try { return checkedResult(await this.adapter.lookup(input), input); }
            catch { return { status: 'unknown', requestId: input.requestId, reason: 'Rekonsiliasi EDC belum berhasil.' } as TerminalResult; }
        });
        this.attempts.set(input.requestId, { ...old, result });
        return result;
    }
}
