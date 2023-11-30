const express = require('express')
const cors = require('cors')
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
require('dotenv').config()
const jwt = require('jsonwebtoken');

const app = express()
const port = process.env.PORT || 5000

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
    const surveyInfoCollection = client.db("surveyDB").collection("surveyInfo");
    const usersCollection = client.db("surveyDB").collection("users");

     // jwt related api
     app.post('/jwt', async (req, res) => {
      const user = req.body;
      const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, { expiresIn: '1h' });
      res.send({ token });
    })

     // middlewares 
     const verifyToken = (req, res, next) => {
      console.log('inside verify token', req.headers.authorization);
      if (!req.headers.authorization) {
        return res.status(401).send({ message: 'unauthorized access' });
      }
      const token = req.headers.authorization.split(' ')[1];
      jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) => {
        if (err) {
          return res.status(401).send({ message: 'unauthorized access' })
        }
        req.decoded = decoded;
        next();
      })
    }

     // use verify admin after verifyToken
     const verifyAdmin = async (req, res, next) => {
      const email = req.decoded.email;
      const query = { email: email };
      const user = await usersCollection.findOne(query);
      const isAdmin = user?.role === 'admin';
      if (!isAdmin) {
        return res.status(403).send({ message: 'forbidden access' });
      }
      next();
    }

    // users related api 

    app.get('/users',verifyToken,verifyAdmin, async (req, res) => {
      const result = await usersCollection.find().toArray();
      res.send(result);
    })

    app.get('/users/admin/:email', verifyToken, async (req, res) => {
      const email = req.params.email;

      if (email !== req.decoded.email) {
        return res.status(403).send({ message: 'forbidden access' })
      }
      const query = { email: email };
      const user = await usersCollection.findOne(query);
      let admin = false;
      if (user) {
        admin = user?.role === 'admin';
      }
      res.send({ admin });
    })

    app.post('/users', async (req, res) => {

      const user = req.body;
      const query = {email: user.email}
      const extistingUser = await usersCollection.findOne(query)
      if(extistingUser){
        return res.send({message : 'user created', insertedId: null})
      }
      const result = await usersCollection.insertOne(user)
      res.send(result)
    })

    app.patch('/users/admin/:id',verifyToken,verifyAdmin, async (req, res) => {
      const id = req.params.id;
      const filter = { _id: new ObjectId(id) };
      const updatedDoc = {
        $set: {
          role: 'admin'
        }
      }
      const result = await usersCollection.updateOne(filter, updatedDoc);
      res.send(result);
    })

    app.patch('/users/surveyor/:id', async (req, res) => {
      const id = req.params.id;
      const filter = { _id: new ObjectId(id) };
      const updatedDoc = {
        $set: {
          role: 'surveyor'
        }
      }
      const result = await usersCollection.updateOne(filter, updatedDoc);
      res.send(result);
    })

    app.get('/survey', async (req, res) => {
      const result = await surveyCollection.find().toArray();
      res.send(result);
    })

    app.get('/survey/recent', async (req, res) => {
      try {
        const recentSurveys = await surveyCollection
          .find()
          .sort({ createdAt: -1 }) // Sort by creation timestamp in descending order
          .limit(6) // Limit the result to the most recent 6 surveys
          .toArray();
    
        res.json(recentSurveys);
      } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Internal Server Error' });
      }
    });
    

    app.post('/survey', async (req, res) => {

      const job = req.body;
      console.log(job)
      const result = await surveyCollection.insertOne(job)
      res.send(result)
    })

    // surveyInfo

    app.get('/surveyInfo', async (req, res) => {
      const result = await surveyInfoCollection.find().toArray();
      res.send(result);
    })

    app.post('/surveyInfo', async (req, res) => {

      const job = req.body;
      console.log(job)
      const result = await surveyInfoCollection.insertOne(job)
      res.send(result)
    })

    app.patch('/surveyInfo/publish/:id', verifyToken, verifyAdmin, async (req, res) => {
      const id = req.params.id;
      const filter = { _id: new ObjectId(id) };
      const updatedDoc = {
        $set: {
          role: 'publish',
        },
      };
      const result = await surveyCollection.updateOne(filter, updatedDoc);
      res.send(result);
    });
    
    app.patch('/surveyInfo/unpublish/:id', verifyToken, verifyAdmin, async (req, res) => {
      const id = req.params.id;
      const filter = { _id: new ObjectId(id) };
      const updatedDoc = {
        $set: {
          role: 'Unpublish',
        },
      };
      const result = await surveyCollection.updateOne(filter, updatedDoc);
      res.send(result);
    });
    


    // payment side

    

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