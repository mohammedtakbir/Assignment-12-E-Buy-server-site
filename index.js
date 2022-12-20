const express = require('express');
const app = express();
const cors = require('cors');
const port = process.env.PORT || 5000;
require('dotenv').config();
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const jwt = require('jsonwebtoken');
const stripe = require('stripe')(process.env.STRIPE_SK);

//* middleware
app.use(cors());
app.use(express.json());

app.get('/', (req, res) => {
    res.send('E-Buy server is running!')
})

function verifyJWT(req, res, next) {
    const authToken = req.headers.authorization

    if (!authToken) {
        return res.status(401).send({ message: 'unauthorized access' })
    }
    const token = authToken.split(' ')[1];
    jwt.verify(token, process.env.ACCESS_TOKEN, function (err, decoded) {
        if (err) {
            return res.status(403).send({ message: 'forbidden access' })
        }
        req.decoded = decoded
        next();
    })
}

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASSWORD}@cluster0.drjbcpx.mongodb.net/?retryWrites=true&w=majority`;
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 });

async function run() {
    try {
        const productsCategoriesCollection = client.db('E-Buy').collection('productCategories');
        const productsCollection = client.db('E-Buy').collection('products');
        const usersCollection = client.db('E-Buy').collection('users');
        const bookingsCollection = client.db('E-Buy').collection('bookings');
        const paymentsCollection = client.db('E-Buy').collection('payments');
        const advertiseItemsCollection = client.db('E-Buy').collection('advertiseItems');
        const reportedItemsCollection = client.db('E-Buy').collection('reportedItems');
        const newArrivalProductsCollection = client.db('E-Buy').collection('newArrivalProducts');

        //* verify seller
        const verifySeller = async (req, res, next) => {
            const decodedEmail = req.decoded.email;
            const query = { email: decodedEmail };
            const seller = await usersCollection.findOne(query);
            if (seller.role !== 'seller') {
                return res.status(403).send({ message: 'Forbidden access' })
            };
            next();
        }

        //* verify admin
        const verifyAdmin = async (req, res, next) => {
            const decodedEmail = req.decoded.email;
            const query = { email: decodedEmail };
            const admin = await usersCollection.findOne(query);
            if (admin.role !== 'admin') {
                return res.status(403).send({ message: 'Forbidden access' })
            };
            next();
        }

        //* get product Categories
        app.get('/productCategories', async (req, res) => {
            const query = {};
            const productCategories = await productsCategoriesCollection.find(query).toArray();
            res.send(productCategories);
        });

        //* jwt
        app.get('/jwt', async (req, res) => {
            const email = req.query.email;
            const token = jwt.sign({ email }, process.env.ACCESS_TOKEN, { expiresIn: '1d' })
            res.send({ token });
        });

        //* users verify
        app.get('/users/verify', async (req, res) => {
            const email = req.query.email;
            const query = { email: email };
            const user = await usersCollection.findOne(query);
            res.send({ isVerified: user?.seller_verify === true })
        });

        //?-------------------products------------------

        //* 
        app.put('/products', verifyJWT, verifyAdmin, async (req, res) => {
            const email = req.query.email;
            const id = req.query.id;

            const filter = { _id: ObjectId(id) };
            const options = { upsert: true };
            const updatedDoc = {
                $set: {
                    seller_verify: true
                }
            };
            const result = await usersCollection.updateOne(filter, updatedDoc, options);

            const filter2 = { sellerEmail: email };
            const options2 = { upsert: true };
            const updatedDoc2 = {
                $set: {
                    seller_verify: true
                }
            };
            const result2 = await productsCollection.updateOne(filter2, updatedDoc2, options2);
            res.send(result);
        });

        //* add a new products to the database
        app.post('/products', verifyJWT, verifySeller, async (req, res) => {
            const product = req.body;
            const result = await productsCollection.insertOne(product);
            res.send(result);
        });

        //* get all products based on product name
        app.get('/products/:name', verifyJWT, async (req, res) => {
            const name = req.params.name;
            const query = { name: name }
            const allProducts = await productsCollection.find(query).toArray();
            const remainingProducts = allProducts.filter(product => product.status !== 'sold');
            res.send(remainingProducts);
        });

        //* get all products based on email
        app.get('/products', verifyJWT, verifySeller, async (req, res) => {
            const email = req.query.email;
            const query = { sellerEmail: email };
            const products = await productsCollection.find(query).toArray();
            res.send(products);
        });

        //* delete a product
        app.delete('/products/:id', verifyJWT, verifySeller, async (req, res) => {
            const id = req.params.id;
            const query = { _id: ObjectId(id) };
            const query2 = { _id: id };
            const deletingFromAdvertiseItems = await advertiseItemsCollection.deleteOne(query2);
            const result = await productsCollection.deleteOne(query);
            res.json(result);
        });

        //?-------------------users------------------

        //* store users info
        app.post('/users', async (req, res) => {
            const user = req.body;
            const result = await usersCollection.insertOne(user);
            res.send(result);
        });

        //* isSeller
        app.get('/users/sellers/:email', async (req, res) => {
            const email = req.params.email;
            const query = { email: email };
            const user = await usersCollection.findOne(query);
            res.send({ isSeller: user?.role === 'seller' });
        });

        //* isAdmin
        app.get('/users/admin/:email', async (req, res) => {
            const email = req.params.email;
            const query = { email: email };
            const user = await usersCollection.findOne(query);
            res.send({ isAdmin: user?.role === 'admin' });
        });

        //* load all sellers by role
        app.get('/users/sellers', verifyJWT, verifyAdmin, async (req, res) => {
            const seller = req.query.user;
            const query = { role: seller };
            const result = await usersCollection.find(query).toArray();
            res.send(result);
        });

        //* load all buyers by role
        app.get('/users/buyers', verifyJWT, verifyAdmin, async (req, res) => {
            const buyer = req.query.user;
            const query = { role: buyer };
            const result = await usersCollection.find(query).toArray();
            res.send(result);
        });

        //* delete an user
        app.delete('/users/sellers/:id', verifyJWT, verifyAdmin, async (req, res) => {
            const id = req.params.id;
            const query = { _id: ObjectId(id) };
            const result = await usersCollection.deleteOne(query);
            res.json(result);
        });

        //?------------Bookings-----------

        //* store booked product to the database
        app.post('/bookings', async (req, res) => {
            const booking = req.body;
            const result = await bookingsCollection.insertOne(booking);
            res.send(result);
        });

        //! wrong naming convention

        app.get('/bookings', verifyJWT, async (req, res) => {
            const decodedEmail = req.decoded.email;
            const email = req.query.email;
            if (decodedEmail !== email) {
                return res.status(403).send({ message: 'forbidden access' })
            }
            const query = { email: email };
            const orders = await bookingsCollection.find(query).toArray();
            res.send(orders);
        });

        //?------------payment-----------

        //* load payment order
        app.get('/payment/:id', verifyJWT, async (req, res) => {
            const id = req.params.id;
            const query = { _id: ObjectId(id) };
            const order = await bookingsCollection.findOne(query);
            res.send(order);
        });

        //* payment intent
        app.post('/create-payment-intent', verifyJWT, async (req, res) => {
            const order = req.body;
            const price = order.price;
            const amount = price * 100;
            const paymentIntent = await stripe.paymentIntents.create({
                amount: amount,
                currency: "usd",
                "payment_method_types": [
                    "card"
                ],
            });
            res.send({
                clientSecret: paymentIntent.client_secret
            })
        });

        app.post('/payments/:productId', verifyJWT, async (req, res) => {
            const payment = req.body;
            //* update product when it paid
            const productId = req.params.productId
            const filter1 = { _id: ObjectId(productId) };

            const updatedDoc1 = {
                $set: {
                    status: 'sold',
                    transactionId: payment.transactionId
                }
            };
            const soldProduct1 = await productsCollection.updateOne(filter1, updatedDoc1);

            const filter2 = { _id: productId }
            const soldProduct2 = await advertiseItemsCollection.updateOne(filter2, updatedDoc1);

            //* store payment & update order when product paid 
            const filter3 = { _id: ObjectId(payment.orderId) };
            const updatedDoc2 = {
                $set: {
                    paid: true,
                    transactionId: payment.transactionId
                }
            };
            const paidOrder = await bookingsCollection.updateOne(filter3, updatedDoc2);
            const result = await paymentsCollection.insertOne(payment);
            res.send(result);
        });

        //?------------Advertise-----------

        //* store advertise item
        app.post('/advertise', verifyJWT, verifySeller, async (req, res) => {
            const advertiseItem = req.body;
            const result = await advertiseItemsCollection.insertOne(advertiseItem);
            res.send(result);
        });

        //* load advertise item
        app.get('/advertise', async (req, res) => {
            const query = {};
            const advertiseItems = await advertiseItemsCollection.find(query).toArray();
            const remainingAdvertiseItems = advertiseItems.filter(product => product.status !== 'sold');
            res.send(remainingAdvertiseItems);
        });

        //?------------Reported Items-----------

        //* store reported item
        app.post('/reportedItems', verifyJWT, async (req, res) => {
            const reportedItem = req.body;
            const result = await reportedItemsCollection.insertOne(reportedItem);
            res.send(result);
        })

        //* load reported items
        app.get('/reportedItems', verifyJWT, verifyAdmin, async (req, res) => {
            const query = {};
            const result = await reportedItemsCollection.find(query).toArray();
            res.send(result);
        })

        //* get reported items by ID
        app.get('/reportedItems/:id', async(req, res) => {
            const id = req.params.id;
            const query = {_id: id};
            const reportedItem = await reportedItemsCollection.findOne(query);
            res.send({reportedStatus: reportedItem?.status});
        })

        //* Delete reported item
        app.delete('/reportedItems/:id', verifyJWT, verifyAdmin, async (req, res) => {
            const id = req.params.id;
            const reportedQuery = { _id: id };
            const productsQuery = { _id: ObjectId(id) };
            const deletedFromProduct = await productsCollection.deleteOne(productsQuery);
            const deletedFromAdvertiseItems = await advertiseItemsCollection.deleteOne(reportedQuery);
            const deletedFromReportedItems = await reportedItemsCollection.deleteOne(reportedQuery);
            res.send(deletedFromReportedItems);
        })

        //* load new arrival products
        app.get('/newArrivalProducts', async (req, res) => {
            const query = {};
            const result = await newArrivalProductsCollection.find(query).toArray();
            res.send(result);
        })
    }
    finally {

    }
}
run().catch(err => console.log(err));

app.listen(port, () => {
    console.log(`E-Buy server is running on ${port} port`)
})