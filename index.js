const express = require('express');
const app = express();
const cors = require('cors');
const port = process.env.PORT || 5000;
require('dotenv').config();
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');

//* middleware
app.use(cors());
app.use(express.json());

app.get('/', (req, res) => {
    res.send('E-Buy server is running!')
})

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASSWORD}@cluster0.drjbcpx.mongodb.net/?retryWrites=true&w=majority`;
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 });

async function run() {
    try {
        const productsCategoriesCollection = client.db('E-Buy').collection('productCategories');
        const productsCollection = client.db('E-Buy').collection('products');
        const usersCollection = client.db('E-Buy').collection('users');
        const bookingsCollection = client.db('E-Buy').collection('bookings');

        //* get product Categories
        app.get('/productCategories', async (req, res) => {
            const query = {};
            const productCategories = await productsCategoriesCollection.find(query).toArray();
            res.send(productCategories);
        })

        //?-------------------products------------------
        
        //* add a new products to the database
        app.post('/products', async (req, res) => {
            const email = req.query.email;
            const query = { email: email };
            const seller = await usersCollection.findOne(query);
            if (seller.role !== 'seller') {
                return res.status(403).send({ message: 'Forbidden access' })
            };
            const product = req.body;
            const result = await productsCollection.insertOne(product);
            res.send(result);
        })
        
        //* get all products based on product name
        app.get('/products/:name', async (req, res) => {
            const name = req.params.name;
            const query = { name: name }
            const allProducts = await productsCollection.find(query).toArray();
            res.send(allProducts)
        })
        
        //* get all products based on email
        app.get('/products', async (req, res) => {
            const email = req.query.email;
            const query = { sellerEmail: email };
            const products = await productsCollection.find(query).toArray();
            res.send(products);
        })
        
        //* delete a product
        app.delete('/products/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: ObjectId(id) };
            const result = await productsCollection.deleteOne(query);
            res.json(result);
        })

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
        })

        //* isAdmin
        app.get('/users/admin/:email', async (req, res) => {
            const email = req.params.email;
            const query = { email: email };
            const user = await usersCollection.findOne(query);
            res.send({ isAdmin: user?.role === 'admin' });
        })

        //* load all sellers by role
        app.get('/users/sellers', async (req, res) => {
            const seller = req.query.user;
            const query = { role: seller };
            const result = await usersCollection.find(query).toArray();
            res.send(result);
        })

        //* load all buyers by role
        app.get('/users/buyers', async (req, res) => {
            const buyer = req.query.user;
            const query = { role: buyer };
            const result = await usersCollection.find(query).toArray();
            res.send(result);
        })

        //* delete an user
        app.delete('/users/sellers/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: ObjectId(id) };
            const result = await usersCollection.deleteOne(query);
            res.json(result);
        })

        //?------------Bookings-----------
        
        //* store booked product to the database
        app.post('/bookings', async (req, res) => {
            const booking = req.body;
            const result = await bookingsCollection.insertOne(booking);
            res.send(result);
        })
        
        app.get('/bookings', async (req, res) => {
            const email = req.query.email;
            const query = { email: email };
            const orders = await bookingsCollection.find(query).toArray();
            res.send(orders);
        })
        

    }
    finally {

    }
}
run().catch(err => console.log(err))


app.listen(port, () => {
    console.log(`E-Buy server is running on ${port} port`)
})