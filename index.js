const express = require('express')
const cors = require('cors')
const cookieParser = require('cookie-parser')
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
require('dotenv').config()
const jwt = require('jsonwebtoken')
const app = express()
const port = process.env.PORT || 5050
app.use(cors({
  origin: ['http://localhost:5173', "https://rakib-job-site.netlify.app"],
  credentials: true
}))
app.use(express.json())
app.use(cookieParser())

const admin = require("firebase-admin");
const decoded = Buffer.from(process.env.FB_secret, 'base64').toString('utf8')
const serviceAccount = JSON.parse(decoded);

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

// custom 
const verifyToken = (req, res, next) => {
  const token = req?.cookies.token
  if (!token) {
    return res.status(401).send({ massage: "🥱🥱" })
  }
  jwt.verify(token, process.env.JWT_ACCESS_TOKEN, (err, decoded) => {
    if (err) {
      return res.status(401).send({ massage: "🥱🥱" })
    }
    req.decoded = decoded
    next()
  })
}

const firebaseToken = async (req, res, next) => {
  const token = req.headers.authorization
  if (!token || !token.startsWith("Bearer ")) {

    return res.status(401).send({ message: '😏🙄 forbidden access' })
  }
  try {
    const token = req.headers.authorization.split(' ')[1]
    const decoded = await admin.auth().verifyIdToken(token)
    req.decoded = decoded
    next()
  } catch (e) {
    return res.status(401).send({ message: '😏🙄 Unauthorize access' })
  }
}

const verifyEmail = async (req, res, next) => {
  if (req.query.e !== req.decoded.email) {
    return res.status(403).send({ message: 'forbidden access' })
  }
  next()
}



const uri = "mongodb+srv://job-hunter:mGpEvusjQDMi3o3k@cluster0.616qrpo.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0";

const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});

async function run() {
  try {

    const jobCollection = client.db('allJobs').collection('jobs')
    const ApplicationsCollection = client.db('allJobs').collection('applications')



    app.post('/jwt', async (req, res) => {
      const user = req.body
      const token = jwt.sign(user, process.env.JWT_ACCESS_TOKEN, { expiresIn: '1d' })
      res.cookie('token', token, {
        httpOnly: true,
        secure: false
      })
      res.send({ token, success: true })
    })

    app.get('/jobs/application', firebaseToken, async (req, res) => {
      const email = req.query.email
      if (email !== req.decoded.email) {
        return res.status(403).send({ massage: "🥱🥱 forbidden access" })
      }
      const query = { hr_email: email }
      const jobs = await jobCollection.find(query).toArray()
      // should aggregate
      for (const job of jobs) {
        const application = { jobId: job._id.toString() }
        const application_count = await ApplicationsCollection.countDocuments(application)
        job.application_count = application_count
      }
      res.send(jobs)
    })

    app.get('/all-jobs', async (req, res) => {
      const query = {}
      if (req.query.email) { query.hr_email = req.query.email }
      res.send(await jobCollection.find(query).toArray())
    })

    app.post('/job', async (req, res) => {
      res.send(await jobCollection.insertOne(req.body))
    })

    app.get('/job/:id', async (req, res) => {
      res.send(await jobCollection.findOne({ _id: new ObjectId(req.params.id) }))
    })

    app.get('/applications/job/:id', async (req, res) => {
      res.send(await ApplicationsCollection.find({ JobId: req.params.id }).toArray())
    })

    app.get('/applications', firebaseToken, async (req, res) => {

      const result = await ApplicationsCollection.find({ applicantEmail: req.query.e }).toArray()
      for (const application of result) {
        const job = await jobCollection.findOne({ _id: new ObjectId(application.JobId) })
        application.Company = job.company
      }
      res.send(result)
    })



    //post 
    app.post('/Application', async (req, res) => {
      res.send(await ApplicationsCollection.insertOne(req.body))
    })

    app.patch('/application/:id', async (req, res) => {
      res.send(await ApplicationsCollection.updateOne({ _id: new ObjectId(req.params.id) }, { $set: { status: req.body.status } }))
    })

  } finally { }
}
run();


app.get('/', async (_, res) => {
  res.send("hi I'm RAK!B")
});
