const express = require('express')
const cors = require('cors')
const { MongoClient, ServerApiVersion } = require('mongodb');
require('dotenv').config()
const app = express()
const port =process.env.PORT || 5000

// middleware
app.use(cors())
app.use(express.json())



const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.blfnlbm.mongodb.net/?retryWrites=true&w=majority`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});

async function run() {
  try {
    
    await client.connect();
    const surveyCollection = client.db("surveyDB").collection("survey");
  
    app.get('/survey', async(req, res) =>{
        const result = await  surveyCollection.find().toArray();
        res.send(result);
    })

    app.post('/survey', async(req, res) =>{

      const job = req.body;
      console.log(job)
      const result = await surveyCollection.insertOne(job)
      res.send(result)
     })

    await client.db("admin").command({ ping: 1 });
    console.log("Pinged your deployment. You successfully connected to MongoDB!");
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);


app.get('/', (req, res) => {
    res.send('food restaurant is available')
  })
  
  app.listen(port, () => {
    console.log(`food restaurant is running on port ${port}`)
  })