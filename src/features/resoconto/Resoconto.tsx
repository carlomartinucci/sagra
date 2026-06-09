import React, { useEffect, useState, useCallback } from 'react';
import { collection, getDocs } from '@firebase/firestore/lite';
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
  totalsByMode: Record<string, number>; // cash, POS, servizio
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

function emptyAgg(): AggregatedDay {
  return { products: {}, totalsEuroCents: 0, totalsByMode: { cash: 0, POS: 0, servizio: 0 } };
}

// Aggregate a set of raw orders into product totals and per-mode money totals.
function aggregate(orders: RawOrder[]): AggregatedDay {
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
      setRefreshedAt(Date.now());
      window.localStorage.setItem(cacheKey, JSON.stringify({ timestamp: Date.now(), orders: raw }));
    } finally {
      setLoading(false);
    }
  }, [firestore]);

  useEffect(() => {
    fetchAndAggregate();
  }, [fetchAndAggregate]);

  // Per-day aggregation (Italian calendar day) derived from raw orders.
  const aggregatedByDate: Record<string, AggregatedDay> = (() => {
    const byDate: Record<string, RawOrder[]> = {};
    for (const order of orders) {
      const dateISO = formatDate(new Date(order.createdMs));
      (byDate[dateISO] ||= []).push(order);
    }
    const result: Record<string, AggregatedDay> = {};
    for (const [d, list] of Object.entries(byDate)) {
      result[d] = aggregate(list);
    }
    return result;
  })();

  // Keep the day-tabs in sync with the data.
  useEffect(() => {
    const keys = Object.keys(aggregatedByDate);
    const sorted = keys.length ? keys.sort().reverse() : [today];
    setDates(sorted);
    if (!keys.includes(selectedDate) && sorted.length) {
      setSelectedDate(sorted[0]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orders]);

  const displayEuro = (euroCents: number) =>
    (euroCents / 100).toLocaleString('it-IT', { minimumFractionDigits: 2, style: 'currency', currency: 'EUR' });

  // ---- "Ultime N ore" (serata) view ----
  const windowStartMs = refreshedAt - hoursBack * 60 * 60 * 1000;
  const serataAgg = aggregate(orders.filter((o) => o.createdMs >= windowStartMs));
  const serataProducts = Object.entries(serataAgg.products).filter(([, info]) => info.quantity > 0);

  // ---- "Per giornata" view ----
  const dayAgg = aggregatedByDate[selectedDate];
  const progressiveAgg: AggregatedDay | null = (() => {
    if (!dayAgg) return null;
    const sorted = Object.keys(aggregatedByDate).sort();
    const progressive = emptyAgg();
    for (const d of sorted) {
      if (d > selectedDate) break;
      const current = aggregatedByDate[d];
      Object.entries(current.products).forEach(([name, info]) => {
        if (!progressive.products[name]) progressive.products[name] = { quantity: 0, euroCents: 0 };
        progressive.products[name].quantity += info.quantity;
        progressive.products[name].euroCents += info.euroCents;
      });
      progressive.totalsEuroCents += current.totalsEuroCents;
      Object.entries(current.totalsByMode).forEach(([mode, euro]) => {
        if (!progressive.totalsByMode[mode]) progressive.totalsByMode[mode] = 0;
        progressive.totalsByMode[mode] += euro;
      });
    }
    return progressive;
  })();

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
            Ultime {hoursBack} ore — dalle {formatDateTime(new Date(windowStartMs))} a ora
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

              <Table bordered className="mt-4" style={{ maxWidth: 400, margin: '0 auto' }}>
                <tbody>
                  <tr className="table-primary fw-bold">
                    <td>TOTALE PERIODO</td>
                    <td className="text-end">{displayEuro(serataAgg.totalsEuroCents)}</td>
                  </tr>
                  <tr><td className="ps-4">di cui contanti</td><td className="text-end">{displayEuro(serataAgg.totalsByMode.cash || 0)}</td></tr>
                  <tr><td className="ps-4">di cui POS</td><td className="text-end">{displayEuro(serataAgg.totalsByMode.POS || 0)}</td></tr>
                  <tr><td className="ps-4">di cui gratuiti</td><td className="text-end">{displayEuro(serataAgg.totalsByMode.servizio || 0)}</td></tr>
                </tbody>
              </Table>
            </>
          ) : (
            <p className="text-center">{loading ? 'Caricamento…' : `Nessun ordine nelle ultime ${hoursBack} ore.`}</p>
          )}
        </>
      ) : (
        <>
          <div className="d-flex justify-content-center my-3">
            <Nav variant="pills" activeKey={selectedDate} onSelect={(k) => k && setSelectedDate(k)}>
              {dates.map((d) => (
                <Nav.Item key={d}>
                  <Nav.Link eventKey={d}>{d === today ? `${d} (oggi)` : d}</Nav.Link>
                </Nav.Item>
              ))}
            </Nav>
          </div>

          {dayAgg && progressiveAgg && (
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

              <Table bordered className="mt-4" style={{ maxWidth: 400, margin: '0 auto' }}>
                <tbody>
                  <tr className="table-primary fw-bold">
                    <td>SUBTOTALE GIORNATA</td>
                    <td>{displayEuro(dayAgg.totalsEuroCents)}</td>
                    <td>{displayEuro(progressiveAgg.totalsEuroCents)}</td>
                  </tr>
                  <tr>
                    <td className="ps-4">di cui contanti</td>
                    <td>{displayEuro(dayAgg.totalsByMode.cash || 0)}</td>
                    <td>{displayEuro(progressiveAgg.totalsByMode.cash || 0)}</td>
                  </tr>
                  <tr>
                    <td className="ps-4">di cui POS</td>
                    <td>{displayEuro(dayAgg.totalsByMode.POS || 0)}</td>
                    <td>{displayEuro(progressiveAgg.totalsByMode.POS || 0)}</td>
                  </tr>
                  <tr>
                    <td className="ps-4">di cui gratuiti</td>
                    <td>{displayEuro(dayAgg.totalsByMode.servizio || 0)}</td>
                    <td>{displayEuro(progressiveAgg.totalsByMode.servizio || 0)}</td>
                  </tr>
                </tbody>
              </Table>
            </>
          )}

          {!dayAgg && !loading && <p className="text-center">Nessun dato disponibile per questa data.</p>}
        </>
      )}
    </div>
  );
};

export default Resoconto;
