import React from 'react';

import { useAppSelector, useAppDispatch } from '../../app/hooks';
import {
  increment,
  decrement,
  selectProducts,
  displayEuroCents,
} from './orderSlice';
import styles from './Order.module.css';

import Container from 'react-bootstrap/Container';
import Row from 'react-bootstrap/Row';
import Col from 'react-bootstrap/Col';

import Button from 'react-bootstrap/Button';
import Form from 'react-bootstrap/Form';
import InputGroup from 'react-bootstrap/InputGroup';

export function Order() {
  const products = useAppSelector(selectProducts);
  const dispatch = useAppDispatch();

  const totalEuroCents = Object.values(products).reduce((total, product) => total + product.euroCents * product.quantity, 0)

  return <Container fluid className={styles.order}>
    { Object.entries(products).map(([key, product]) => {
      const totalPriceCents = product.euroCents * product.quantity
      return <Row key={key} className={styles.orderRow}>
        <Col className="my-auto" xs={6}>{product.name}</Col>
        <Col className="my-auto" xs={2}>{displayEuroCents(product.euroCents)}</Col>
        <Col xs={2}>
          <InputGroup>
            <Button disabled={product.quantity === 0} onClick={() => dispatch(decrement(key))}>
              -
            </Button>
            <Form.Control readOnly value={product.quantity}/>
            <Button onClick={() => dispatch(increment(key))}>
              +
            </Button>
          </InputGroup>
        </Col>
        <Col className="my-auto" xs={2}>{totalPriceCents > 0 ? displayEuroCents(totalPriceCents) : ""}</Col>
      </Row>
    })}

    <Row>
      <Col>Totale: euro {displayEuroCents(totalEuroCents)}</Col>
    </Row>
  </Container>
}
