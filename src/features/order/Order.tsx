import React, {useState} from 'react';

import { useAppSelector, useAppDispatch } from '../../app/hooks';
import {
  increment,
  decrement,
  editNotes,
  selectProducts,
  selectDailyPortions,
  displayEuroCents,
} from './orderSlice';
import styles from './Order.module.css';

import { ReactComponent as EditIcon } from './edit.svg';

import Container from 'react-bootstrap/Container';
import Row from 'react-bootstrap/Row';
import Col from 'react-bootstrap/Col';

import Badge from 'react-bootstrap/Badge';

import Button from 'react-bootstrap/Button';
import Form from 'react-bootstrap/Form';
import InputGroup from 'react-bootstrap/InputGroup';

import Modal from 'react-bootstrap/Modal';

export function Order({ coperti, tavolo }: { coperti: string, tavolo: string }) {
  const products = useAppSelector(selectProducts);
  const dailyPortions = useAppSelector(selectDailyPortions);

  const totalEuroCents = Object.values(products).reduce((total, product) => total + product.euroCents * product.quantity, 0)

  return <Container fluid className={styles.order}>
    <Row><Col className="text-center text-bg-info"><h3 className="my-2">{tavolo ? `Tavolo ${tavolo}. ` : ""}{coperti}</h3></Col></Row>
    <Row className="small text-muted">
      <Col className="my-auto">Nome del piatto</Col>
      <Col className="my-auto text-end" xs={2}>Prezzo unitario</Col>
      <Col xs="auto" className="text-center"><span className="d-block" style={{ width: 115 }}>Quantità</span></Col>
      <Col className="my-auto text-end" xs={2}>Subtotale</Col>
    </Row>

    {
      Object.entries(products)
        .map(([key, product]) => <ProductRow key={key} productKey={key} product={product} dailyPortion={dailyPortions[key]} />)
    }

    <Row>
      <Col className="text-end">Totale: euro {displayEuroCents(totalEuroCents)}</Col>
    </Row>
  </Container>
}

function ProductRow(props: any) {
  const dispatch = useAppDispatch();
  const [isEditing, setIsEditing] = useState(false)
  const totalPriceCents = props.product.euroCents * props.product.quantity
  const backgroundColor = props.product.color
  const color = getTextColor(props.product.color)
  
  // Check if we should show portion warning
  const portion = props.dailyPortion;
  const shouldShowWarning = portion && portion.isLimited && portion.remaining <= portion.criticalThreshold;
  const isLowStock = portion && portion.isLimited && portion.remaining <= 5;
  
  return <React.Fragment>
    <Row className={styles.orderRow}>
      {/* Nome del piatto */}
      <Col className="my-auto">
        <Badge pill bg="" style={{backgroundColor, color, fontSize: "1em"}} onClick={() => dispatch(increment(props.productKey))}>
          {showName(props.product.name)}
        </Badge>
        <Button variant="link" onClick={() => setIsEditing(true)}>
          <EditIcon className="mb-1" />
        </Button>
        {shouldShowWarning && (
          <span className="ms-2">
            {isLowStock ? (
              <span style={{ color: '#ff0000', fontWeight: 'bold' }}>🔴 {portion.remaining} rimaste</span>
            ) : (
              <span style={{ color: '#ff6600', fontWeight: 'bold' }}>⚠️ {portion.remaining} rimaste</span>
            )}
          </span>
        )}
      </Col>

      {/* Prezzo unitario */}
      <Col className="my-auto text-end" xs={2}>
        {displayEuroCents(props.product.euroCents)}
      </Col>

      {/* + Quantità - */}
      <Col xs="auto">
        <InputGroup style={{ width: 115 }}>
          <Button style={{backgroundColor, color}} variant="outline-secondary" disabled={props.product.quantity === 0} onClick={() => dispatch(decrement(props.productKey))}>
            -
          </Button>
          <Form.Control readOnly value={props.product.quantity} style={{backgroundColor, color}} />
          <Button style={{backgroundColor, color}} variant="outline-secondary" onClick={() => dispatch(increment(props.productKey))}>
            +
          </Button>
        </InputGroup>
      </Col>

      {/* Subtotale */}
      <Col className="my-auto text-end" xs={2}>{totalPriceCents > 0 ? displayEuroCents(totalPriceCents) : ""}</Col>
    </Row>

    {props.product.notes && <><Row className={styles.notesRow}>
      <Col className="my-auto">
        <Button variant="link" onClick={() => setIsEditing(true)} className="m-0 mb-1 p-0">Note</Button>: {props.product.notes}
        {props.product.quantity === 0 && <span className="text-danger">&nbsp; Attenzione, hai aggiunto una nota ma la quantità è 0. Sei sicuro?</span>}
      </Col>
    </Row><Row/></>}

    <Modal show={isEditing} onHide={() => setIsEditing(false)}>
      <Modal.Header closeButton>
          <Modal.Title>{props.product.name}</Modal.Title>
        </Modal.Header>
        <Modal.Body>

        <Form onSubmit={(event) => { event.preventDefault(); setIsEditing(false) }}>
          <Form.Group className="mb-3" controlId="notes">
            <Form.Label>Aggiungi o modifica le note per la cucina</Form.Label>
            <Form.Control autoFocus value={props.product.notes} onChange={event => dispatch(editNotes({key: props.productKey, notes: event.target.value}))} />
          </Form.Group>
        </Form>

        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setIsEditing(false)}>
            Chiudi
          </Button>
        </Modal.Footer>
    </Modal>
  </React.Fragment>
}

function showName(name: string | string[]): JSX.Element {
  if (typeof name === 'string') {
    return <>{name}</>;
  } else {
    return (
      <>
        {name.map((n, i) => (
          <React.Fragment key={i}>
            {n}
            {i < name.length - 1 && <br />}
          </React.Fragment>
        ))}
      </>
    );
  }
}

function getTextColor(bgColor: string): string {
    let r = parseInt(bgColor.slice(1, 3), 16);
    let g = parseInt(bgColor.slice(3, 5), 16);
    let b = parseInt(bgColor.slice(5, 7), 16);
    let brightness = (r * 299 + g * 587 + b * 114) / 1000;
    return brightness > 128 ? '#000' : '#fff';
}
