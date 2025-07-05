import React, { useEffect, useState, useCallback } from 'react';
import { collection, getDocs } from '@firebase/firestore/lite';
import Nav from 'react-bootstrap/Nav';
import Table from 'react-bootstrap/Table';

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

function formatDate(date: Date): string {
  // Returns YYYY-MM-DD
  return date.toISOString().split('T')[0];
}

function getTodayISO(): string {
  return formatDate(new Date());
}

const Resoconto: React.FC<ResocontoProps> = ({ firestore }) => {
  const today = getTodayISO();

  const [selectedDate, setSelectedDate] = useState<string>(today);
  const [dates, setDates] = useState<string[]>([today]);

  const [aggregatedByDate, setAggregatedByDate] = useState<Record<string, AggregatedDay>>({});
  const [loading, setLoading] = useState<boolean>(false);

  // Fetch and aggregate all orders once (cached)
  const fetchAndAggregate = useCallback(async () => {
    if (!firestore) return;

    const cacheKey = `${CACHE_PREFIX}all`; // store aggregation for all dates
    const cachedRaw = window.localStorage.getItem(cacheKey);
    if (cachedRaw) {
      try {
        const cached = JSON.parse(cachedRaw);
        const isTodayStale = (Date.now() - cached.timestamp) >= CACHE_TTL_MS_TODAY;
        if (!isTodayStale) {
          setAggregatedByDate(cached.data);
          setDates(Object.keys(cached.data).sort().reverse());
          return;
        }
      } catch (e) {
        console.error('Error parsing cached resoconto data', e);
        window.localStorage.removeItem(cacheKey);
      }
    }

    setLoading(true);
    try {
      const snapshot = await getDocs(collection(firestore, `sagre/${process.env.REACT_APP_SAGRA_ID}/orderHistory`));

      const aggregations: Record<string, AggregatedDay> = {};

      snapshot.forEach((docSnap: any) => {
        const data = docSnap.data() as OrderHistoryDoc;
        if (!data.created) return;
        const createdDate: Date = data.created.toDate();
        const dateISO = formatDate(createdDate);

        if (!aggregations[dateISO]) {
          aggregations[dateISO] = {
            products: {},
            totalsEuroCents: 0,
            totalsByMode: { cash: 0, POS: 0, servizio: 0 }
          };
        }

        const dayAgg = aggregations[dateISO];

        data.products.forEach((product) => {
          if (!dayAgg.products[product.name]) {
            dayAgg.products[product.name] = { quantity: 0, euroCents: 0 };
          }
          dayAgg.products[product.name].quantity += product.quantity;
          if (product.euroCents) {
            const productTotal = product.euroCents * product.quantity;
            dayAgg.products[product.name].euroCents += productTotal;
            dayAgg.totalsEuroCents += productTotal;
          }
        });

        // Totals by payment mode
        const mode = (data as any).mode || 'cash';
        if (!dayAgg.totalsByMode[mode]) {
          dayAgg.totalsByMode[mode] = 0;
        }
        dayAgg.totalsByMode[mode] += data.cachedEuroCents ?? dayAgg.totalsEuroCents; // fallback for old docs
      });

      setAggregatedByDate(aggregations);
      setDates(Object.keys(aggregations).sort().reverse());

      window.localStorage.setItem(cacheKey, JSON.stringify({ timestamp: Date.now(), data: aggregations }));
    } finally {
      setLoading(false);
    }
  }, [firestore]);

  // Fetch once on mount & whenever firestore changes
  useEffect(() => {
    fetchAndAggregate();
  }, [fetchAndAggregate]);

  // Compute parziale & progressivo
  const dayAgg = aggregatedByDate[selectedDate];

  // Progressive: sum over all dates >= firstDate && <= selectedDate chronologically
  const progressiveAgg: AggregatedDay | null = (() => {
    if (!dayAgg) return null;
    const sorted = Object.keys(aggregatedByDate).sort();
    const progressive: AggregatedDay = { products: {}, totalsEuroCents: 0, totalsByMode: { cash: 0, POS: 0, servizio: 0 } };
    for (const d of sorted) {
      if (d > selectedDate) break;
      const current = aggregatedByDate[d];
      // products
      Object.entries(current.products).forEach(([name, info]) => {
        if (!progressive.products[name]) {
          progressive.products[name] = { quantity: 0, euroCents: 0 };
        }
        progressive.products[name].quantity += info.quantity;
        progressive.products[name].euroCents += info.euroCents;
      });
      // totals
      progressive.totalsEuroCents += current.totalsEuroCents;
      Object.entries(current.totalsByMode).forEach(([mode, euro]) => {
        if (!progressive.totalsByMode[mode]) progressive.totalsByMode[mode] = 0;
        progressive.totalsByMode[mode] += euro;
      });
    }
    return progressive;
  })();

  const displayEuro = (euroCents: number) => (euroCents / 100).toLocaleString('it-IT', { minimumFractionDigits: 2, style: 'currency', currency: 'EUR' });

  return (
    <div className="container my-4">
      <h1 className="text-center">Resoconto</h1>

      <div className="d-flex justify-content-center my-3">
        {/* Tab navigation using react-bootstrap Nav */}
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
                <th>Parziale serata</th>
                <th>Subtotale progressivo</th>
              </tr>
            </thead>
            <tbody>
              {Object.entries(progressiveAgg.products).map(([name, progInfo]) => {
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

          {/* Summary section */}
          <Table bordered className="mt-4" style={{ maxWidth: 400, margin: '0 auto' }}>
            <tbody>
              <tr className="table-primary fw-bold">
                <td>SUBTOTALE SERATA</td>
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
    </div>
  );
};

export default Resoconto; 