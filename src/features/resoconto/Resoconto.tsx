import React, { useEffect, useState, useCallback } from 'react';
import { collection, getDocs, doc, getDoc, setDoc, arrayUnion } from '@firebase/firestore/lite';
import Nav from 'react-bootstrap/Nav';
import Table from 'react-bootstrap/Table';
import ButtonGroup from 'react-bootstrap/ButtonGroup';
import Button from 'react-bootstrap/Button';
import { useAppSelector } from '../../app/hooks';
import { selectProducts } from '../order/orderSlice';

interface OrderProduct {
  name: string;
  quantity: number;
  euroCents?: number;
}

interface OrderHistoryDoc {
  created: any; // Firestore timestamp
  products: OrderProduct[];
  cachedEuroCents?: number;
  cachedQuantity?: number;
}

// A flattened order, kept so we can re-aggregate over arbitrary time windows
// (e.g. "last N hours") without re-reading Firebase.
interface RawOrder {
  createdMs: number;
  products: OrderProduct[];
  euroCents: number;
  mode: string;
}

interface AggregatedReport {
  [productName: string]: {
    quantity: number;
    euroCents: number;
  };
}

interface AggregatedDay {
  products: AggregatedReport;
  totalsEuroCents: number;
  totalsByMode: Record<string, number>; // cash, bancomat, carta, servizio (+ legacy POS)
}

interface ResocontoProps {
  firestore: any;
}

const SAGRA_ID = process.env.REACT_APP_SAGRA_ID || 'default';
const CACHE_PREFIX = `resoconto_cache_${SAGRA_ID}_`;
const CACHE_TTL_MS_TODAY = process.env.NODE_ENV === 'development' ? 10 * 1000 : 10 * 60 * 1000; // 10s dev, 10m prod

const HOURS_OPTIONS = [4, 6, 8, 12, 24];
const DEFAULT_HOURS_BACK = 8; // a typical sagra serata is ~18:00–02:00

function formatDate(date: Date): string {
  // Returns YYYY-MM-DD in Italian time, consistent with the rest of the app
  // (daily portions, order grouping). Using UTC here would misattribute orders
  // placed around midnight to the wrong day.
  return date.toLocaleDateString('sv-SE', { timeZone: 'Europe/Rome' });
}

function formatDateTime(date: Date): string {
  return date.toLocaleString('it-IT', {
    timeZone: 'Europe/Rome',
    day: '2-digit', month: '2-digit',
    hour: '2-digit', minute: '2-digit'
  });
}

function getTodayISO(): string {
  return formatDate(new Date());
}

// --- Azzeramento totali ------------------------------------------------------
// The operator can "azzerare" the running totals at the start of the real sagra
// (after the test orders): a reset timestamp is appended to `resocontoResets`
// on the sagra doc in Firestore, so it applies to every till at once. History
// is never deleted — old days/years stay browsable — but progressive totals
// and the "serata" view only count orders after the latest applicable reset.
// Together with the solar year, resets define the boundaries of a "period".
//
// Latest reset (ms) that applies to the given Rome-time day: it must fall in
// the same year (year changes are already boundaries on their own) and not
// after the selected day. Returns 0 when no reset applies.
export function latestResetMsFor(dateISO: string, resets: number[]): number {
  let latest = 0;
  for (const resetMs of resets) {
    const resetDate = formatDate(new Date(resetMs));
    if (resetDate.slice(0, 4) === dateISO.slice(0, 4) && resetDate <= dateISO && resetMs > latest) {
      latest = resetMs;
    }
  }
  return latest;
}

function emptyAgg(): AggregatedDay {
  return { products: {}, totalsEuroCents: 0, totalsByMode: { cash: 0, bancomat: 0, carta: 0, POS: 0, servizio: 0 } };
}

// Merchant fees withheld by the payment provider: 0.6% on bancomat (debit),
// 0.9% on carta (credit). Estimated HERE ONLY, for the internal report — the
// customer always pays full price and no fee ever appears in the cash flow UI
// or on receipts. Legacy "POS" orders predate the bancomat/carta split, so we
// can't know which rate applies and they are left out of the estimate.
const FEE_BANCOMAT = 0.006;
const FEE_CARTA = 0.009;
const estimatedFeeCents = (totalsByMode: Record<string, number>): number =>
  Math.round((totalsByMode.bancomat || 0) * FEE_BANCOMAT) +
  Math.round((totalsByMode.carta || 0) * FEE_CARTA);

// Aggregate a set of raw orders into product totals and per-mode money totals.
export function aggregate(orders: RawOrder[]): AggregatedDay {
  const agg = emptyAgg();
  for (const order of orders) {
    for (const product of order.products) {
      if (!agg.products[product.name]) {
        agg.products[product.name] = { quantity: 0, euroCents: 0 };
      }
      agg.products[product.name].quantity += product.quantity;
      if (product.euroCents) {
        agg.products[product.name].euroCents += product.euroCents * product.quantity;
      }
    }
    agg.totalsEuroCents += order.euroCents;
    if (!agg.totalsByMode[order.mode]) agg.totalsByMode[order.mode] = 0;
    agg.totalsByMode[order.mode] += order.euroCents;
  }
  return agg;
}

const Resoconto: React.FC<ResocontoProps> = ({ firestore }) => {
  const today = getTodayISO();

  // The menu (with its `order` field) lives in the store; use it so the report
  // lists dishes in the same order as the menu instead of by quantity or by the
  // order they first appeared in the history. Products no longer in the menu
  // (e.g. renamed) fall to the bottom, alphabetically.
  const menuProducts = useAppSelector(selectProducts);
  const menuRank = (name: string): number => {
    const p = menuProducts[name];
    return p && typeof p.order === 'number' && !Number.isNaN(p.order) ? p.order : Number.MAX_SAFE_INTEGER;
  };
  const byMenuOrder = (
    a: [string, { quantity: number; euroCents: number }],
    b: [string, { quantity: number; euroCents: number }]
  ): number => {
    const diff = menuRank(a[0]) - menuRank(b[0]);
    return diff !== 0 ? diff : a[0].localeCompare(b[0]);
  };

  const [viewMode, setViewMode] = useState<'serata' | 'giornata'>('serata');
  const [hoursBack, setHoursBack] = useState<number>(DEFAULT_HOURS_BACK);

  const [selectedDate, setSelectedDate] = useState<string>(today);
  const [dates, setDates] = useState<string[]>([today]);

  const [orders, setOrders] = useState<RawOrder[]>([]);
  const [resets, setResets] = useState<number[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  // Bumped after every successful fetch so "ultime N ore" recomputes against now.
  const [refreshedAt, setRefreshedAt] = useState<number>(Date.now());

  // Fetch all orders once (cached). Re-aggregation is done in render from the
  // raw orders, so both the per-day and the last-N-hours views stay in sync.
  const fetchAndAggregate = useCallback(async (force = false) => {
    if (!firestore) return;

    const cacheKey = `${CACHE_PREFIX}orders`;
    if (!force) {
      const cachedRaw = window.localStorage.getItem(cacheKey);
      if (cachedRaw) {
        try {
          const cached = JSON.parse(cachedRaw);
          const isStale = (Date.now() - cached.timestamp) >= CACHE_TTL_MS_TODAY;
          if (!isStale && Array.isArray(cached.orders)) {
            setOrders(cached.orders);
            setResets(Array.isArray(cached.resets) ? cached.resets : []);
            setRefreshedAt(Date.now());
            return;
          }
        } catch (e) {
          console.error('Error parsing cached resoconto data', e);
          window.localStorage.removeItem(cacheKey);
        }
      }
    }

    setLoading(true);
    try {
      const snapshot = await getDocs(collection(firestore, `sagre/${process.env.REACT_APP_SAGRA_ID}/orderHistory`));

      // The reset timestamps live on the sagra doc itself (same doc as the
      // order counter — merged writes only, never overwrite `count`).
      const sagraSnap = await getDoc(doc(firestore, `sagre/${process.env.REACT_APP_SAGRA_ID}`));
      const sagraData: any = sagraSnap.exists() ? sagraSnap.data() : {};
      const fetchedResets: number[] = Array.isArray(sagraData.resocontoResets) ? sagraData.resocontoResets : [];

      const raw: RawOrder[] = [];
      snapshot.forEach((docSnap: any) => {
        const data = docSnap.data() as OrderHistoryDoc;
        if (!data.created) return;
        const createdMs: number = data.created.toDate().getTime();

        const orderEuroCents = (data.products || []).reduce(
          (sum, p) => sum + (p.euroCents ? p.euroCents * p.quantity : 0), 0
        );

        raw.push({
          createdMs,
          products: data.products || [],
          // Prefer the cached total written at order time; fall back to the sum
          // of this order's own products for legacy docs.
          euroCents: data.cachedEuroCents ?? orderEuroCents,
          mode: (data as any).mode || 'cash'
        });
      });

      setOrders(raw);
      setResets(fetchedResets);
      setRefreshedAt(Date.now());
      window.localStorage.setItem(cacheKey, JSON.stringify({ timestamp: Date.now(), orders: raw, resets: fetchedResets }));
    } finally {
      setLoading(false);
    }
  }, [firestore]);

  useEffect(() => {
    fetchAndAggregate();
  }, [fetchAndAggregate]);

  // "Azzera totali": append a reset timestamp on the sagra doc. History stays;
  // progressive totals and the serata view restart from this moment on every till.
  const handleAzzeraTotali = async () => {
    if (!firestore) return;
    const ok = window.confirm(
      'Azzerare i totali da questo momento?\n\n' +
      'Lo storico NON si perde: i giorni e gli anni precedenti restano consultabili. ' +
      'Ma i subtotali progressivi e la vista "serata" ripartono da zero, su tutte le casse.\n\n' +
      "Da usare all'inizio della sagra vera, per escludere gli ordini di prova."
    );
    if (!ok) return;
    const nowMs = Date.now();
    try {
      await setDoc(
        doc(firestore, `sagre/${process.env.REACT_APP_SAGRA_ID}`),
        { resocontoResets: arrayUnion(nowMs) },
        { merge: true }
      );
      const newResets = [...resets, nowMs];
      setResets(newResets);
      setRefreshedAt(Date.now());
      // Keep the localStorage cache coherent so a reload within the TTL
      // doesn't resurrect the pre-reset totals.
      const cacheKey = `${CACHE_PREFIX}orders`;
      const cachedRaw = window.localStorage.getItem(cacheKey);
      if (cachedRaw) {
        try {
          const cached = JSON.parse(cachedRaw);
          cached.resets = newResets;
          window.localStorage.setItem(cacheKey, JSON.stringify(cached));
        } catch (e) {
          window.localStorage.removeItem(cacheKey);
        }
      }
    } catch (e) {
      console.error('Errore durante l\'azzeramento dei totali', e);
      window.alert('Errore nel salvataggio dell\'azzeramento: controlla la connessione e riprova.');
    }
  };

  // Keep the day-tabs in sync with the data.
  useEffect(() => {
    const keys = Array.from(new Set(orders.map((o) => formatDate(new Date(o.createdMs)))));
    const sorted = keys.length ? keys.sort().reverse() : [today];
    setDates(sorted);
    if (!keys.includes(selectedDate) && sorted.length) {
      setSelectedDate(sorted[0]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orders]);

  // Days are grouped by (solar) year so last year's history stays browsable
  // without inflating this year's progressive totals.
  const years = Array.from(new Set(dates.map((d) => d.slice(0, 4)))).sort().reverse();
  const selectedYear = selectedDate.slice(0, 4);
  const datesOfYear = dates.filter((d) => d.startsWith(selectedYear));

  const displayEuro = (euroCents: number) =>
    (euroCents / 100).toLocaleString('it-IT', { minimumFractionDigits: 2, style: 'currency', currency: 'EUR' });

  // ---- "Ultime N ore" (serata) view ----
  // An "azzera" done inside the window clamps it: pre-reset (test) orders
  // must not pollute the live totals either.
  const latestResetMs = resets.length ? Math.max(...resets) : 0;
  const windowStartMs = refreshedAt - hoursBack * 60 * 60 * 1000;
  const serataStartMs = Math.max(windowStartMs, latestResetMs);
  const serataAgg = aggregate(orders.filter((o) => o.createdMs >= serataStartMs));
  const serataProducts = Object.entries(serataAgg.products).filter(([, info]) => info.quantity > 0);
  const serataFee = estimatedFeeCents(serataAgg.totalsByMode);

  // ---- "Per giornata" view ----
  // Parziale and progressivo both start at the latest reset applicable to the
  // selected day (0 = none): the progressivo restarts at every "azzera" and at
  // every year change; the parziale is only affected when the reset happened
  // on the selected day itself (its pre-reset test orders stay out).
  const dayResetMs = latestResetMsFor(selectedDate, resets);
  const hasOrdersOnDay = orders.some((o) => formatDate(new Date(o.createdMs)) === selectedDate);
  const dayAgg: AggregatedDay = aggregate(orders.filter((o) =>
    formatDate(new Date(o.createdMs)) === selectedDate && o.createdMs >= dayResetMs
  ));
  const progressiveAgg: AggregatedDay = aggregate(orders.filter((o) => {
    const d = formatDate(new Date(o.createdMs));
    return d.slice(0, 4) === selectedYear && d <= selectedDate && o.createdMs >= dayResetMs;
  }));

  const dayFee = estimatedFeeCents(dayAgg.totalsByMode);
  const progFee = estimatedFeeCents(progressiveAgg.totalsByMode);

  return (
    <div className="container my-4">
      <h1 className="text-center">Resoconto</h1>

      <div className="d-flex justify-content-center align-items-center gap-2 my-3 flex-wrap">
        <ButtonGroup>
          <Button variant={viewMode === 'serata' ? 'primary' : 'outline-primary'} onClick={() => setViewMode('serata')}>
            Serata (ultime ore)
          </Button>
          <Button variant={viewMode === 'giornata' ? 'primary' : 'outline-primary'} onClick={() => setViewMode('giornata')}>
            Per giornata
          </Button>
        </ButtonGroup>
        <Button variant="outline-secondary" disabled={loading} onClick={() => fetchAndAggregate(true)}>
          {loading ? 'Aggiorno…' : '↻ Aggiorna'}
        </Button>
        <Button variant="outline-danger" disabled={loading} onClick={handleAzzeraTotali}>
          Azzera totali (inizio sagra)
        </Button>
      </div>

      {viewMode === 'serata' ? (
        <>
          <div className="d-flex justify-content-center my-3">
            <ButtonGroup>
              {HOURS_OPTIONS.map((h) => (
                <Button key={h} variant={hoursBack === h ? 'secondary' : 'outline-secondary'} onClick={() => setHoursBack(h)}>
                  {h}h
                </Button>
              ))}
            </ButtonGroup>
          </div>
          <p className="text-center text-muted small">
            Ultime {hoursBack} ore — dalle {formatDateTime(new Date(serataStartMs))} a ora
            {latestResetMs > windowStartMs &&
              ' (totali azzerati in questo intervallo: gli ordini precedenti non contano)'}
          </p>

          {serataProducts.length > 0 ? (
            <>
              <Table striped bordered hover size="sm">
                <thead>
                  <tr>
                    <th>Prodotto</th>
                    <th className="text-end">Venduti</th>
                    <th className="text-end">Incasso</th>
                  </tr>
                </thead>
                <tbody>
                  {serataProducts
                    .sort(byMenuOrder)
                    .map(([name, info]) => (
                      <tr key={name}>
                        <td>{name}</td>
                        <td className="text-end">{info.quantity}</td>
                        <td className="text-end">{displayEuro(info.euroCents)}</td>
                      </tr>
                    ))}
                </tbody>
              </Table>

              <Table bordered className="mt-4" style={{ maxWidth: 460, margin: '0 auto' }}>
                <tbody>
                  <tr className="table-primary fw-bold">
                    <td>{serataFee > 0 ? 'TOTALE PERIODO (lordo)' : 'TOTALE PERIODO'}</td>
                    <td className="text-end">{displayEuro(serataAgg.totalsEuroCents)}</td>
                  </tr>
                  <tr><td className="ps-4">di cui contanti</td><td className="text-end">{displayEuro(serataAgg.totalsByMode.cash || 0)}</td></tr>
                  <tr><td className="ps-4">di cui bancomat</td><td className="text-end">{displayEuro(serataAgg.totalsByMode.bancomat || 0)}</td></tr>
                  <tr><td className="ps-4">di cui carta</td><td className="text-end">{displayEuro(serataAgg.totalsByMode.carta || 0)}</td></tr>
                  {(serataAgg.totalsByMode.POS || 0) > 0 && (
                    <tr><td className="ps-4">di cui POS (storico)</td><td className="text-end">{displayEuro(serataAgg.totalsByMode.POS || 0)}</td></tr>
                  )}
                  <tr><td className="ps-4">di cui gratuiti</td><td className="text-end">{displayEuro(serataAgg.totalsByMode.servizio || 0)}</td></tr>
                  {serataFee > 0 && (
                    <>
                      <tr className="text-muted">
                        <td className="ps-4">commissioni stimate (0,6% bancomat, 0,9% carta)</td>
                        <td className="text-end">{displayEuro(-serataFee)}</td>
                      </tr>
                      <tr className="table-success fw-bold">
                        <td>TOTALE NETTO STIMATO</td>
                        <td className="text-end">{displayEuro(serataAgg.totalsEuroCents - serataFee)}</td>
                      </tr>
                    </>
                  )}
                </tbody>
              </Table>
            </>
          ) : (
            <p className="text-center">{loading ? 'Caricamento…' : `Nessun ordine nelle ultime ${hoursBack} ore.`}</p>
          )}
        </>
      ) : (
        <>
          {years.length > 1 && (
            <div className="d-flex justify-content-center my-3">
              <Nav
                variant="pills"
                activeKey={selectedYear}
                onSelect={(y) => {
                  // Jump to the most recent day of that year (dates are sorted desc).
                  const first = y && dates.find((d) => d.startsWith(y));
                  if (first) setSelectedDate(first);
                }}
              >
                {years.map((y) => (
                  <Nav.Item key={y}>
                    <Nav.Link eventKey={y}>{y}</Nav.Link>
                  </Nav.Item>
                ))}
              </Nav>
            </div>
          )}

          <div className="d-flex justify-content-center my-3">
            <Nav variant="pills" activeKey={selectedDate} onSelect={(k) => k && setSelectedDate(k)}>
              {datesOfYear.map((d) => (
                <Nav.Item key={d}>
                  <Nav.Link eventKey={d}>{d === today ? `${d} (oggi)` : d}</Nav.Link>
                </Nav.Item>
              ))}
            </Nav>
          </div>

          {dayResetMs > 0 && (
            <p className="text-center text-muted small">
              Totali azzerati il {formatDateTime(new Date(dayResetMs))}: gli ordini precedenti
              restano nello storico ma non contano nel progressivo.
            </p>
          )}

          {hasOrdersOnDay && (
            <>
              <Table striped bordered hover size="sm">
                <thead>
                  <tr>
                    <th>Prodotto</th>
                    <th>Parziale giornata</th>
                    <th>Subtotale progressivo</th>
                  </tr>
                </thead>
                <tbody>
                  {Object.entries(progressiveAgg.products).sort(byMenuOrder).map(([name, progInfo]) => {
                    const dayQty = dayAgg.products[name]?.quantity || 0;
                    return (
                      <tr key={name}>
                        <td>{name}</td>
                        <td>{dayQty}</td>
                        <td>{progInfo.quantity}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </Table>

              <Table bordered className="mt-4" style={{ maxWidth: 460, margin: '0 auto' }}>
                <tbody>
                  <tr className="table-primary fw-bold">
                    <td>{progFee > 0 ? 'SUBTOTALE GIORNATA (lordo)' : 'SUBTOTALE GIORNATA'}</td>
                    <td>{displayEuro(dayAgg.totalsEuroCents)}</td>
                    <td>{displayEuro(progressiveAgg.totalsEuroCents)}</td>
                  </tr>
                  <tr>
                    <td className="ps-4">di cui contanti</td>
                    <td>{displayEuro(dayAgg.totalsByMode.cash || 0)}</td>
                    <td>{displayEuro(progressiveAgg.totalsByMode.cash || 0)}</td>
                  </tr>
                  <tr>
                    <td className="ps-4">di cui bancomat</td>
                    <td>{displayEuro(dayAgg.totalsByMode.bancomat || 0)}</td>
                    <td>{displayEuro(progressiveAgg.totalsByMode.bancomat || 0)}</td>
                  </tr>
                  <tr>
                    <td className="ps-4">di cui carta</td>
                    <td>{displayEuro(dayAgg.totalsByMode.carta || 0)}</td>
                    <td>{displayEuro(progressiveAgg.totalsByMode.carta || 0)}</td>
                  </tr>
                  {(progressiveAgg.totalsByMode.POS || 0) > 0 && (
                    <tr>
                      <td className="ps-4">di cui POS (storico)</td>
                      <td>{displayEuro(dayAgg.totalsByMode.POS || 0)}</td>
                      <td>{displayEuro(progressiveAgg.totalsByMode.POS || 0)}</td>
                    </tr>
                  )}
                  <tr>
                    <td className="ps-4">di cui gratuiti</td>
                    <td>{displayEuro(dayAgg.totalsByMode.servizio || 0)}</td>
                    <td>{displayEuro(progressiveAgg.totalsByMode.servizio || 0)}</td>
                  </tr>
                  {progFee > 0 && (
                    <>
                      <tr className="text-muted">
                        <td className="ps-4">commissioni stimate (0,6% bancomat, 0,9% carta)</td>
                        <td>{displayEuro(-dayFee)}</td>
                        <td>{displayEuro(-progFee)}</td>
                      </tr>
                      <tr className="table-success fw-bold">
                        <td>TOTALE NETTO STIMATO</td>
                        <td>{displayEuro(dayAgg.totalsEuroCents - dayFee)}</td>
                        <td>{displayEuro(progressiveAgg.totalsEuroCents - progFee)}</td>
                      </tr>
                    </>
                  )}
                </tbody>
              </Table>
            </>
          )}

          {!hasOrdersOnDay && !loading && <p className="text-center">Nessun dato disponibile per questa data.</p>}
        </>
      )}
    </div>
  );
};

export default Resoconto;
