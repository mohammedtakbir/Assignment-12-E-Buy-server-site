const express = require('express');
const app = express();
const cors = require('cors');
const port = process.env.PORT || 5000;
require('dotenv').config();
const { MongoClient, ServerApiVersion } = require('mongodb');

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
        const sellersCollection = client.db('E-Buy').collection('sellers');
        const buyersCollection = client.db('E-Buy').collection('buyers');

        //* get product Categories
        app.get('/productCategories', async (req, res) => {
            const query = {};
            const productCategories = await productsCategoriesCollection.find(query).toArray();
            res.send(productCategories);
        })

        //* get all products based on product name
        app.get('/products/:name', async (req, res) => {
            const name = req.params.name;
            const query = { name: name }
            const allProducts = await productsCollection.find(query).toArray();
            res.send(allProducts)
        })

        //* store seller info
        app.post('/sellers', async (req, res) => {
            const seller = req.body;
            const result = await sellersCollection.insertOne(seller);
            res.send(result);
        });

        //* store buyer info
        app.post('/buyers', async (req, res) => {
            const buyer = req.body;
            const result = await buyersCollection.insertOne(buyer);
            res.send(result);
        });

    }
    finally {

    }
}
run().catch(err => console.log(err))


app.listen(port, () => {
    console.log(`E-Buy server is running on ${port} port`)
})