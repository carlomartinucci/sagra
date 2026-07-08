import { aggregate, latestResetMsFor } from './Resoconto';

// Helper: a timestamp on a given Rome-time summer day (UTC+2 in July, so
// 10:00 UTC is 12:00 in Rome, comfortably inside the same calendar day).
const romeDayMs = (iso: string, hourUTC = 10) => {
  const [y, m, d] = iso.split('-').map((s) => parseInt(s, 10));
  return Date.UTC(y, m - 1, d, hourUTC, 0, 0);
};

describe('latestResetMsFor', () => {
  it('returns 0 when there are no resets', () => {
    expect(latestResetMsFor('2026-07-20', [])).toBe(0);
  });

  it('applies a reset earlier in the same year', () => {
    const reset = romeDayMs('2026-07-17');
    expect(latestResetMsFor('2026-07-20', [reset])).toBe(reset);
  });

  it('applies a reset that happened on the selected day itself', () => {
    const reset = romeDayMs('2026-07-17');
    expect(latestResetMsFor('2026-07-17', [reset])).toBe(reset);
  });

  it('ignores resets after the selected day', () => {
    const reset = romeDayMs('2026-07-17');
    expect(latestResetMsFor('2026-07-10', [reset])).toBe(0);
  });

  it('ignores resets from previous years (the year is already a boundary)', () => {
    const reset2025 = romeDayMs('2025-07-18');
    expect(latestResetMsFor('2026-07-20', [reset2025])).toBe(0);
  });

  it('picks the latest applicable reset when there are several', () => {
    const prove = romeDayMs('2026-07-08');
    const inizioSagra = romeDayMs('2026-07-17');
    const dopo = romeDayMs('2026-07-25');
    expect(latestResetMsFor('2026-07-20', [prove, dopo, inizioSagra])).toBe(inizioSagra);
  });
});

describe('aggregate', () => {
  it('sums quantities, revenue and per-mode totals', () => {
    const orders = [
      {
        createdMs: romeDayMs('2026-07-17'),
        products: [{ name: 'Tordelli', quantity: 2, euroCents: 800 }],
        euroCents: 1600,
        mode: 'cash',
      },
      {
        createdMs: romeDayMs('2026-07-17', 12),
        products: [
          { name: 'Tordelli', quantity: 1, euroCents: 800 },
          { name: 'Panigacci', quantity: 3, euroCents: 500 },
        ],
        euroCents: 2300,
        mode: 'bancomat',
      },
    ];
    const agg = aggregate(orders);
    expect(agg.products['Tordelli']).toEqual({ quantity: 3, euroCents: 2400 });
    expect(agg.products['Panigacci']).toEqual({ quantity: 3, euroCents: 1500 });
    expect(agg.totalsEuroCents).toBe(3900);
    expect(agg.totalsByMode.cash).toBe(1600);
    expect(agg.totalsByMode.bancomat).toBe(2300);
  });

  it('keeps counting legacy POS orders', () => {
    const agg = aggregate([
      { createdMs: romeDayMs('2025-07-19'), products: [], euroCents: 1000, mode: 'POS' },
    ]);
    expect(agg.totalsByMode.POS).toBe(1000);
  });
});
