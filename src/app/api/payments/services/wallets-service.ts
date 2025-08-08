

// src/app/api/payments/services/wallets-service.ts
// Domain-only Wallet service (pure functions; no file I/O). Use repos/controllers to persist.

export type UserType = 'freelancer' | 'commissioner';

export interface Wallet {
  userId: number;
  userType: UserType;
  currency: string;          // e.g. 'USD'
  availableBalance: number;  // funds ready to withdraw
  pendingWithdrawals: number;// on hold, requested but not yet paid out
  lifetimeEarnings: number;  // total ever credited
  totalWithdrawn: number;    // total ever paid out
  updatedAt: string;         // ISO timestamp
}

export type Result<T = void> = { ok: true; data?: T } | { ok: false; reason: string };

const now = () => new Date().toISOString();

export const WalletsService = {
  /** Create a new default wallet (does not persist). */
  init(userId: number, userType: UserType, currency: string = 'USD'): Wallet {
    return {
      userId,
      userType,
      currency,
      availableBalance: 0,
      pendingWithdrawals: 0,
      lifetimeEarnings: 0,
      totalWithdrawn: 0,
      updatedAt: now(),
    };
  },

  /** Credit earnings into a wallet (e.g., when an invoice is paid). */
  credit(wallet: Wallet, amount: number): Result<Wallet> {
    if (amount <= 0) return { ok: false, reason: 'Amount must be > 0' };
    const w: Wallet = { ...wallet };
    w.availableBalance = Number(w.availableBalance) + Number(amount);
    w.lifetimeEarnings = Number(w.lifetimeEarnings) + Number(amount);
    w.updatedAt = now();
    return { ok: true, data: w };
  },

  /** Hold funds for a withdrawal request: available → pending. */
  holdWithdrawal(wallet: Wallet, amount: number): Result<Wallet> {
    if (amount <= 0) return { ok: false, reason: 'Withdrawal amount must be > 0' };
    if (wallet.availableBalance < amount) return { ok: false, reason: 'Insufficient available balance' };
    const w: Wallet = { ...wallet };
    w.availableBalance = Number(w.availableBalance) - Number(amount);
    w.pendingWithdrawals = Number(w.pendingWithdrawals) + Number(amount);
    w.updatedAt = now();
    return { ok: true, data: w };
  },

  /** Reverse a hold (e.g., withdrawal rejected/cancelled): pending → available. */
  releaseHold(wallet: Wallet, amount: number): Result<Wallet> {
    if (amount <= 0) return { ok: false, reason: 'Release amount must be > 0' };
    if (wallet.pendingWithdrawals < amount) return { ok: false, reason: 'Insufficient pending to release' };
    const w: Wallet = { ...wallet };
    w.pendingWithdrawals = Number(w.pendingWithdrawals) - Number(amount);
    w.availableBalance = Number(w.availableBalance) + Number(amount);
    w.updatedAt = now();
    return { ok: true, data: w };
  },

  /** Finalize a withdrawal payout: pending → totalWithdrawn. */
  finalizeWithdrawal(wallet: Wallet, amount: number): Result<Wallet> {
    if (amount <= 0) return { ok: false, reason: 'Finalize amount must be > 0' };
    if (wallet.pendingWithdrawals < amount) return { ok: false, reason: 'Insufficient pending withdrawals' };
    const w: Wallet = { ...wallet };
    w.pendingWithdrawals = Number(w.pendingWithdrawals) - Number(amount);
    w.totalWithdrawn = Number(w.totalWithdrawn) + Number(amount);
    w.updatedAt = now();
    return { ok: true, data: w };
  },

  /** Utility: compute snapshot metrics without mutating the wallet. */
  computeSnapshot(wallet: Wallet) {
    const gross = Number(wallet.lifetimeEarnings) || 0;
    const withdrawn = Number(wallet.totalWithdrawn) || 0;
    const available = Number(wallet.availableBalance) || 0;
    const pending = Number(wallet.pendingWithdrawals) || 0;
    const heldTotal = pending; // clarity
    const net = available + pending + withdrawn; // should equal gross if earnings-only system
    return { gross, withdrawn, available, pending, heldTotal, net };
  },
};