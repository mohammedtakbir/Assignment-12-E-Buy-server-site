const express = require('express');
const app = express();
const cors = require('cors');
const port = process.env.PORT || 5000;
require('dotenv').config();
const { MongoClient, ServerApiVersion } = require('mongodb');

//* middleware
app.use(cors());
app.use(express());

const productCategories = require('./data/productCategory.json');
const products = require('./data/products.json');

app.get('/', (req, res) => {
    res.send('E-Buy server is running!')
})

/* app.get('/productCategories', (req, res) => {
    res.send(productCategories);
}) */

app.get('/products/:brandId', (req, res) => {
    const brandId = req.params.brandId;
    const productsCategory = products.filter(product => product.category_id === brandId)
    res.send(productsCategory);
})


const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASSWORD}@cluster0.drjbcpx.mongodb.net/?retryWrites=true&w=majority`;
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 });

async function run() {
    try {
        const productsCategoriesCollection = client.db('E-Buy').collection('productCategories');
        const productsCollection = client.db('E-Buy').collection('products');

        app.get('/productCategories', async (req, res) => {
            const query = {};
            const productCategories = await productsCategoriesCollection.find(query).toArray();
            res.send(productCategories);
        })

        /* app.get('/products/:name', async(req, res) => {
            const name = req.params.name;
            const allProducts = await 
        })
 */

    }
    finally {

    }
}
run().catch(err => console.log(err))


app.listen(port, () => {
    console.log(`E-Buy server is running on ${port} port`)
})