const express = require('express');
const app = express();
const cors = require('cors');
const port = process.env.PORT || 5000;
require('dotenv').config();

//* middleware
app.use(cors());
app.use(express());

app.get('/', (req, res) => {
    res.send('E-Buy server is running!')
})

app.listen(port, () => {
    console.log(`E-Buy server is running on ${port} port`)
})