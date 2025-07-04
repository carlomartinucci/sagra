import React, { useRef, useState, useEffect, useCallback } from 'react';
import { useReactToPrint } from 'react-to-print';
import useWakeLock from './useWakeLock';
import useDetectKeypress from './useDetectKeypress';
import logOrder from './logOrder';
// import logOrder, { download } from './logOrder';

import Button from 'react-bootstrap/Button';
import ButtonGroup from 'react-bootstrap/ButtonGroup';
import Nav from 'react-bootstrap/Nav';
import Navbar from 'react-bootstrap/Navbar';
import Container from 'react-bootstrap/Container';
import Row from 'react-bootstrap/Row';
import Col from 'react-bootstrap/Col';
import Modal from 'react-bootstrap/Modal';

import { Order } from './features/order/Order';
import { RecapOrder, PrintableOrder, Total } from './features/order/PrintableOrder';
import { useAppSelector, useAppDispatch } from './app/hooks';
import { store } from './app/store';
import {
  selectCount,
  getCount,
  increment,
  useCountPrefix,
  reset as resetCount
} from './features/counter/counterSlice';

import {
  selectProducts,
  selectDailyPortions,
  reset as resetOrder,
  getMenu,
  getDailyPortions,
  decrementPortion,
  decrementPortionLocal,
  forceReloadDailyPortions,
  updatePortionManually,
  resetSinglePortion
} from './features/order/orderSlice';

function App({ firestore }: { firestore: any }) {
  const [navigation, setNavigation] = useState("pre")
  const [orderId, setOrderId] = useState(null)
  const [altCountPrefix, setAltCountPrefix] = useCountPrefix()
  const [showAdminModal, setShowAdminModal] = useState(false)
  const [showCancelModal, setShowCancelModal] = useState(false)
  
  const [given, setGiven] = useState(0)
  const [mode, setMode] = useState("cash")
  const count = getCount(useAppSelector(selectCount), altCountPrefix)
  const products = useAppSelector(selectProducts)
  const dailyPortions = useAppSelector(selectDailyPortions)
  const dispatch = useAppDispatch();
  const wakeLock = useWakeLock() as any;
  const [coperti, setCoperti] = useState("");
  const [tavolo, setTavolo] = useState("");

  useDetectKeypress("alpaca", useCallback(() => { setAltCountPrefix("") }, [setAltCountPrefix]))
  useDetectKeypress("pizza", useCallback(() => { 
    console.log("🍕 Pizza shortcut triggered - opening admin panel...");
    setShowAdminModal(true);
  }, []))
  // useDetectKeypress("down", useCallback(() => { download(firestore) }, [firestore]))

  const componentRef = useRef(null);
  const handlePrint = useReactToPrint({
    content: () => componentRef.current
  });

  const handleConfirm = async () => {
    if (!count) {
      await dispatch(increment(firestore))
    }
    handlePrint()

    // Decrement daily portions for ordered products
    const orderedProducts = Object.values(products).filter(product => product.quantity > 0);
    for (const product of orderedProducts) {
      // Optimistically update local state
      dispatch(decrementPortionLocal({ productName: product.name, quantity: product.quantity }));
      
      // Attempt to update Firebase (will queue for offline sync if needed)
      dispatch(decrementPortion({ firestore, productName: product.name, quantity: product.quantity }));
    }

    const newOrderId = await logOrder(firestore, {
      id: orderId,
      count: store.getState().counter.value,
      prefix: altCountPrefix,
      products: orderedProducts,
      mode: mode
    })
    setOrderId(newOrderId)
    setNavigation("done")
  }

  const handleNewOrder = () => {
    setCoperti("")
    setTavolo("")
    setGiven(0)
    setMode("cash")
    setOrderId(null)
    dispatch(resetCount())
    dispatch(resetOrder())
    setNavigation("pre")
    
    // Reload daily portions to check for updates/new day
    dispatch(getDailyPortions(firestore))
  }

  useEffect(() => {
    dispatch(getMenu())
  }, [dispatch])

  useEffect(() => {
    // Load daily portions after menu is loaded
    dispatch(getDailyPortions(firestore))
  }, [dispatch, firestore])

  const handleForceReload = async () => {
    console.log("🔄 Force reloading all portions from Google Sheets...");
    await dispatch(forceReloadDailyPortions(firestore));
    setShowAdminModal(false);
  }

  const handleResetSinglePortion = async (productName: string) => {
    console.log(`🔄 Resetting ${productName} to Google Sheets values...`);
    await dispatch(resetSinglePortion({ firestore, productName }));
  }

  const handleUpdatePortion = (productName: string, change: number) => {
    const currentPortion = dailyPortions[productName];
    if (currentPortion) {
      const newQuantity = currentPortion.remaining + change;
      dispatch(updatePortionManually({ productName, newQuantity }));
      
      // Also update Firebase
      dispatch(decrementPortion({ 
        firestore, 
        productName, 
        quantity: -change // negative to increase
      }));
    }
  }

  return (
    <>
    <div className="d-print-none mb-5">
      <Navbar bg="dark" variant="dark">
        <Container fluid>
          <Navbar.Brand onClick={() => setNavigation("pre")}>
            {wakeLock && !wakeLock.released ? '💡' : '📺'} { count ? `Ordine #${count}` : "Ordine ..." }
          </Navbar.Brand>
          <Nav className="me-auto">
            <Nav.Link active={navigation === "order"} disabled={["pre"].includes(navigation)} onClick={() => setNavigation("order")}>
              &gt; Menu
            </Nav.Link>
            <Nav.Link active={navigation === "recap"} disabled={["pre", "order"].includes(navigation)} onClick={() => setNavigation("recap")}>
              &gt; Riepilogo
            </Nav.Link>
            <Nav.Link active={navigation === "pay"} disabled={["pre", "order", "recap"].includes(navigation)} onClick={() => setNavigation("pay")}>
              &gt; Paga
            </Nav.Link>
            <Nav.Link active={navigation === "done"} disabled={["pre", "order", "recap", "pay"].includes(navigation)} onClick={() => setNavigation("done")}>
              &gt; Fatto
            </Nav.Link>
          </Nav>
          <Button variant="outline-danger" className="ms-auto" disabled={["pre", "done"].includes(navigation)} onClick={() => setShowCancelModal(true)}>
            Annulla ordine
          </Button>
        </Container>
      </Navbar>

      {
        !altCountPrefix ?
          <main>
            <Container className="text-center">
              <p>Scegli il prefisso per i numeri di ordine nel caso in cui venga meno la connessione internet</p>
              <Button
                style={{ marginBottom: 10 }}
                variant="secondary"
                size="lg"
                onClick={() => { setAltCountPrefix("A") }}
              >A</Button><br/>
              <Button style={{ marginBottom: 10 }} variant="secondary" size="lg" onClick={() => { setAltCountPrefix("B") }}>B</Button><br/>
              <Button style={{ marginBottom: 10 }} variant="secondary" size="lg" onClick={() => { setAltCountPrefix("C") }}>C</Button><br/>
            </Container>
          </main> :
        navigation === "pre" ?
          <main>
            <Pre coperti={coperti} setCoperti={setCoperti} tavolo={tavolo} setTavolo={setTavolo} />

            <Container className="text-center">
              <Button size="lg" autoFocus disabled={coperti===""} onClick={() => { setNavigation("order") }}>Procedi al menù</Button>
              { coperti==="" && <p className="text-danger">
                Inserisci il numero di coperti per continuare
              </p> }
            </Container>
          </main> :
        navigation === "order" ?
          <main>
            <Order tavolo={tavolo} coperti={displayCoperti(coperti)} />

            <Container className="text-center">
              <Button style={{ marginBottom: 10 }} variant="link" size="sm" onClick={() => { setNavigation("pre") }}>Torna indietro</Button><br/>
              <Button size="lg" autoFocus disabled={Object.values(products).every(product => product.quantity === 0)} onClick={() => { setNavigation("recap") }}>Procedi al riepilogo</Button>
            </Container>
          </main> :
        navigation === "recap" ?
          <main>
            <RecapOrder tavolo={tavolo} coperti={displayCoperti(coperti)} />

            <Container className="text-center">
              <Button style={{ marginBottom: 10 }} variant="link" size="sm" onClick={() => { setNavigation("order") }}>Torna indietro</Button><br/>
              <Button size="lg" autoFocus onClick={() => { setNavigation("pay") }}>Procedi al pagamento</Button>
            </Container>
          </main> :
        navigation === "pay" ?
          <main>
            <Total onBack={() => { setNavigation("recap") }} onConfirm={handleConfirm} given={given} setGiven={setGiven} mode={mode} setMode={setMode} />
          </main> :
        navigation === "done" ?
          <main>
            <Container className="text-center">
            { count
              ? <p style={{ marginTop: 10 }}>Ordine #{count} concluso! Se c'è stato qualche problema, torna indietro o stampa di nuovo. Altrimenti, procedi con un nuovo ordine.</p>
              : <h2 style={{ marginTop: 10 }}>Ordine concluso. Non è stato possibile inserire il numero dell'ordine: ricorda di scriverlo a mano sia sul foglio del cliente sia su quello della cucina! Se c'è stato qualche problema, torna indietro o stampa di nuovo. Altrimenti, procedi con un nuovo ordine.</h2>
            }
              <Button autoFocus style={{ marginBottom: 20 }} size="lg" onClick={handleNewOrder}>Nuovo ordine</Button><br/>
              <Button variant="link" size="sm" onClick={() => { setNavigation("pay") }}>Torna indietro</Button>
              <Button variant="secondary" size="sm" onClick={() => { handlePrint() }}>Stampa di nuovo</Button>
            </Container>
          </main> :
          <div>Questo non dovrebbe mai succedere. Se vedi questa schermata, ricordati la parola "{navigation}" e aggiorna la pagina. Grazie.</div>
      }
    </div>

    <div className="d-none d-print-block" ref={componentRef}>
      <PrintableOrder count={count} tavolo={tavolo} coperti={displayCoperti(coperti)} given={given} mode={mode} />
    </div>

    {/* Admin Modal */}
    <AdminModal 
      show={showAdminModal}
      onHide={() => setShowAdminModal(false)}
      dailyPortions={dailyPortions}
      onUpdatePortion={handleUpdatePortion}
      onResetSingle={handleResetSinglePortion}
      onForceReload={handleForceReload}
    />

    {/* Cancel Order Modal */}
    <Modal
      show={showCancelModal}
      onHide={() => setShowCancelModal(false)}
      centered
    >
      <Modal.Header closeButton>
        <Modal.Title>Annulla ordine</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        {count ? (
          <div>
            <p className="h5 text-danger">
              ❗ L'ordine #{count} risulta già pagato, confermato e stampato, la cucina potrebbe averlo già ricevuto.
              Se vuoi annullarlo assicurati di coordinarti con la cucina e controllare la cassa.
            </p>
            <p className="mt-3">Vuoi comunque annullare l'ordine corrente e ricominciare da capo?</p>
          </div>
        ) : (
          <>Vuoi annullare l'ordine corrente e ricominciare da capo?</>
        )}
      </Modal.Body>
      <Modal.Footer>
        <Button variant="secondary" onClick={() => setShowCancelModal(false)}>
          No, chiudi questa finestra
        </Button>
        <Button variant="danger" onClick={() => {
          handleNewOrder();
          setShowCancelModal(false);
        }}>
          Sì, annulla l'ordine
        </Button>
      </Modal.Footer>
    </Modal>
    </>
  );
}

interface PreProps {
  coperti: string,
  setCoperti: React.Dispatch<React.SetStateAction<string>>,
  tavolo: string,
  setTavolo: React.Dispatch<React.SetStateAction<string>>
}

const displayCoperti = (coperti: string): string => {
  if (coperti === "") return "..."
  if (coperti === "1") return "1 coperto"
  if (/^\d+$/.test(coperti)) return `${coperti} coperti`
  return coperti
}

function Pre({coperti, setCoperti, tavolo, setTavolo} : PreProps) {
  const handleTapAsporto = () => {
    setCoperti("Da asporto")
    setTavolo("")
  }
  const handleTapAggiunta = () => { setCoperti("Aggiunta") }
  const handleTastierinoClick = () => {
    if (coperti === "Aggiunta") return
    setCoperti(coperti => coperti.replace(/\D/g,''))
  }
  const shouldShowTavoloTastierino = false

  return <Container className="my-5 text-center">
    <Row>
      <Col xs={12}>
        <h2>Quanti coperti?</h2>
        <h1>{displayCoperti(coperti)}</h1>
        <Tastierino value={coperti} setValue={setCoperti} onClick={() => setCoperti(coperti => coperti.replace(/\D/g,''))} />
        <br/>
        <Button size="lg" className="mt-3" onClick={handleTapAsporto}>Da asporto</Button>
        <Button size="lg" className="mt-3 mx-3" onClick={handleTapAggiunta}>Aggiunta</Button>
      </Col>

      {shouldShowTavoloTastierino && <Col xs={6}>
        <h2>Numero del tavolo</h2>
        <h1>{tavolo || "..."}</h1>
        <Tastierino value={tavolo} setValue={setTavolo} onClick={handleTastierinoClick} />
      </Col>}
    </Row>
  </Container>
}

function Tastierino({ value, setValue, onClick }: { value: string, setValue: React.Dispatch<React.SetStateAction<string>>, onClick?: () => void }) {
  const handleClick = (asd: number) => () => {
    onClick && onClick()
    setValue(value => `${value}${asd}`)
  }
  const handleCanc = () => {
    onClick && onClick()
    setValue(value => "")
  }
  const handleDel = () => {
    onClick && onClick()
    setValue(value => value.slice(0,-1))
  }

  return <ButtonGroup vertical>
    <ButtonGroup size={"lg"}>
      <Button onClick={ handleClick(1) } variant="primary">1</Button>
      <Button onClick={ handleClick(2) } variant="primary">2</Button>
      <Button onClick={ handleClick(3) } variant="primary">3</Button>
    </ButtonGroup>
    <ButtonGroup size={"lg"}>
      <Button onClick={ handleClick(4) } variant="primary">4</Button>
      <Button onClick={ handleClick(5) } variant="primary">5</Button>
      <Button onClick={ handleClick(6) } variant="primary">6</Button>
    </ButtonGroup>
    <ButtonGroup size={"lg"}>
      <Button onClick={ handleClick(7) } variant="primary">7</Button>
      <Button onClick={ handleClick(8) } variant="primary">8</Button>
      <Button onClick={ handleClick(9) } variant="primary">9</Button>
    </ButtonGroup>
    <ButtonGroup size={"lg"}>
      <Button onClick={ handleCanc } variant="outline-primary">🗑</Button>
      <Button onClick={ handleClick(0) } variant="primary">0</Button>
      <Button onClick={ handleDel }variant="outline-primary">⌫</Button>
    </ButtonGroup>
  </ButtonGroup>
}

// AdminModal component
function AdminModal({ show, onHide, dailyPortions, onUpdatePortion, onResetSingle, onForceReload }: {
  show: boolean,
  onHide: () => void,
  dailyPortions: any,
  onUpdatePortion: (productName: string, change: number) => void,
  onResetSingle: (productName: string) => void,
  onForceReload: () => void
}) {
  const products = useAppSelector(selectProducts);

  // Show ALL products, no filtering
  const allPortionItems = Object.entries(products);

  console.log('🍕 Admin Modal Debug:');
  console.log('Total products:', Object.keys(products).length);
  console.log('Showing all products:', allPortionItems.length);
  console.log('All products:', Object.keys(products));

  const getStatusIcon = (remaining: number, threshold: number) => {
    if (remaining === 0) return "❌";
    if (remaining <= 5) return "🔴";
    if (remaining <= threshold) return "⚠️";
    return "✅";
  };

  const getCurrentRemaining = (productName: string) => {
    return dailyPortions[productName]?.remaining ?? 0;
  };

  const getCriticalThreshold = (productName: string) => {
    return dailyPortions[productName]?.criticalThreshold ?? 20;
  };

  const isLimited = (productName: string) => {
    return dailyPortions[productName]?.isLimited ?? false;
  };

  return (
    <Modal show={show} onHide={onHide} size="xl">
      <Modal.Header closeButton>
        <Modal.Title>🍕 Admin - Gestione Porzioni</Modal.Title>
      </Modal.Header>
      <Modal.Body style={{ maxHeight: '70vh', overflowY: 'auto' }}>
        {allPortionItems.length === 0 ? (
          <div>
            <p className="text-muted">Nessun prodotto con colonna 'dailyPortions' configurata in Google Sheets.</p>
            <p className="text-info">Aggiungi una colonna 'dailyPortions' nel tuo Google Sheet per abilitare il controllo porzioni.</p>
          </div>
        ) : (
          <>
            <Row className="mb-2 text-muted small sticky-top bg-white py-2">
              <Col xs={3}><strong>Prodotto</strong></Col>
              <Col xs={2} className="text-center"><strong>Google Sheets</strong></Col>
              <Col xs={2} className="text-center"><strong>Attuale</strong></Col>
              <Col xs={4} className="text-center"><strong>Azioni</strong></Col>
              <Col xs={1} className="text-center"><strong>Reset</strong></Col>
            </Row>
            <hr className="mt-0" />
            {allPortionItems.map(([productName, product]: [string, any]) => {
              const remaining = getCurrentRemaining(productName);
              const threshold = getCriticalThreshold(productName);
              const sheetsValue = product.dailyPortions;
              const sheetsThreshold = product.criticalThreshold;
              const limited = isLimited(productName);
              
              return (
                <Row key={productName} className="mb-3 align-items-center border-bottom pb-2">
                  <Col xs={3}>
                    <strong>{productName}</strong>
                  </Col>
                  <Col xs={2} className="text-center">
                    <div>
                      <span className="badge bg-secondary me-1">
                        {sheetsValue === "" || sheetsValue === undefined ? "∞" : sheetsValue}
                      </span>
                      {(sheetsThreshold !== "" && sheetsThreshold !== undefined) && (
                        <span className="badge bg-info">
                          ⚠️{sheetsThreshold}
                        </span>
                      )}
                    </div>
                  </Col>
                  <Col xs={2} className="text-center">
                    {limited ? (
                      <div>
                        <span style={{ fontSize: '1.2em' }}>
                          {getStatusIcon(remaining, threshold)} {remaining}
                        </span>
                        {(() => {
                          const sheetsThresholdValue = parseInt(sheetsThreshold) || 20;
                          const actualThreshold = threshold;
                          
                          // Show actual threshold if different from sheets
                          if (actualThreshold !== sheetsThresholdValue) {
                            return (
                              <div className="mt-1">
                                <span className="badge bg-warning text-dark small">
                                  ⚠️{actualThreshold} (actual)
                                </span>
                              </div>
                            );
                          }
                          return null;
                        })()}
                      </div>
                    ) : (
                      <span className="text-muted">∞ (illimitato)</span>
                    )}
                  </Col>
                  <Col xs={4} className="text-center">
                    {limited ? (
                      <ButtonGroup size="sm">
                        <Button variant="outline-danger" onClick={() => onUpdatePortion(productName, -1)}>
                          -1
                        </Button>
                        <Button variant="outline-success" onClick={() => onUpdatePortion(productName, 1)}>
                          +1
                        </Button>
                        <Button variant="outline-success" onClick={() => onUpdatePortion(productName, 5)}>
                          +5
                        </Button>
                        <Button variant="outline-success" onClick={() => onUpdatePortion(productName, 10)}>
                          +10
                        </Button>
                      </ButtonGroup>
                    ) : (
                      <span className="text-muted small">Non limitato</span>
                    )}
                  </Col>
                  <Col xs={1} className="text-center">
                    {limited ? (
                      <Button 
                        variant="outline-warning" 
                        size="sm"
                        onClick={() => onResetSingle(productName)}
                        title="Reset ai valori di Google Sheets"
                      >
                        🔄
                      </Button>
                    ) : (
                      <span className="text-muted small">-</span>
                    )}
                  </Col>
                </Row>
              );
            })}
          </>
        )}
      </Modal.Body>
      <Modal.Footer>
        <div className="me-auto small text-muted">
          💡 Usa 🔄 per resettare singoli prodotti o "Reset Tutto" per ricaricare tutto da Google Sheets
        </div>
        <Button variant="warning" onClick={onForceReload}>
          🔄 Reset Tutto da Google Sheets
        </Button>
        <Button variant="secondary" onClick={onHide}>
          Chiudi
        </Button>
      </Modal.Footer>
    </Modal>
  );
}

export default App;
