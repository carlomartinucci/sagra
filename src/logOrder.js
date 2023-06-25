import {
  addDoc,
  collection,
  serverTimestamp
} from '@firebase/firestore/lite';

const logOrder = async (firestore, count, products) => {
  const cachedQuantity = products.reduce((total, product) => total + product.quantity, 0)
  const cachedEuroCents = products.reduce((total, product) => total + product.euroCents * product.quantity, 0)

  console.log(products)
  await addDoc(collection(firestore, 'sagre/canevara/orderHistory'), {
    count,
    cachedQuantity,
    cachedEuroCents,
    created: serverTimestamp(),
    products: products.map(product => ({
      euroCents: product.euroCents,
      name: product.name,
      quantity: product.quantity
    }))
  })

  return
}

export default logOrder
