require('dotenv').config();
const express = require('express');
const app = express();
const bodyParser = require('body-parser');
const cors = require('cors');
const mongoose = require('mongoose');

mongoose.connect(process.env.DB_URI, { useNewUrlParser: true, useUnifiedTopology: true }).catch(err => console.log(err));
const Schema = mongoose.Schema;
const userSchema = new Schema({
  username: String
});
const exerciseLogSchema = new Schema({
  _id: String,
  username: String,
  log: Array,
  count: Number
});
const User = mongoose.model("User", userSchema);
const ExerciseLog = mongoose.model("ExerciseLog", exerciseLogSchema);
app.use(cors());

app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());


app.use(express.static('public'));
app.get('/', (req, res) => {
  res.sendFile(__dirname + '/views/index.html')
});

app.post('/api/exercise/new-user', async (req, res) => {
  const username = req.body.username;
  const newUser = new User({ username });
  const response = await newUser.save().catch(err => { console.log(err) });
  const exerciseLog = {
    _id: response['_id'],
    username: response.username,
    log: [],
    count: 0
  };
  const newExerciseLog = new ExerciseLog(exerciseLog);
  await newExerciseLog.save().catch(err => { console.log(err) });
  res.json({ _id: response['_id'], username: response.username });
});

app.get('/api/exercise/users', (req, res) => {
  User.find({}, (err, docs) => res.json(docs));
});

app.get('/api/exercise/log', async (req, res) => {
  const limit = parseInt(req.query.limit);
  const exerciseLog = await ExerciseLog.findById(req.query.userId);
  if(req.query.from && req.query.to) {
    exerciseLog.from = new Date(req.query.from);
    exerciseLog.to = new Date(req.query.to);
    exerciseLog.log = exerciseLog.log.filter(item => {
      return (item.date.getTime() >=  exerciseLog.from.getTime() && item.date.getTime() <= exerciseLog.to.getTime())
    });
  }
  if(limit) {
    exerciseLog.log = exerciseLog.log.splice(0, limit);
    exerciseLog.count = exerciseLog.log.length;
  }
  res.json(exerciseLog)
});

app.post('/api/exercise/add', async (req, res) => {
  const { userId, description, duration } = req.body;
  const date = req.body.date ? new Date(req.body.date) : new Date();
  const required = [{ input: 'userId', type: 'string' }, { input: 'description', type: 'string' }, { input: 'duration', type: 'number' }];
  const missing = required.filter(item => {
    if (typeof req.body[item.input] === 'number' && req.body[item.input] > 0 || typeof req.body[item.input] === 'string' && req.body[item.input]) {
      return false;
    } else {
      return true;
    }
  });
  if (missing.length > 0) {
    const missingInputs = missing.map(item => item.input).join(', ');
    res.json({
      error: `Please provide the following: ${missingInputs}`
    });
    return;
  }
  const exerciseLog = await ExerciseLog.findById(userId);
  if (exerciseLog) {
    const updatedLog = [...exerciseLog.log, { description, duration, date }];
    const updatedCount = updatedLog.length;
    const result = await ExerciseLog.findByIdAndUpdate(userId, { log: updatedLog, count: updatedCount }, { new: true,  useFindAndModify: false}).catch(err => { console.log(err) });
    res.json({ username: result.username,description, duration: parseInt(duration), _id: userId, date: date.toDateString() });
  } else {
    res.json({ error: "User ID is incorrect or does not exist." });
  }
});

app.use((req, res, next) => {
  return next({ status: 404, message: 'not found' })
})

app.use((err, req, res, next) => {
  let errCode, errMessage

  if (err.errors) {
    // mongoose validation error
    errCode = 400 // bad request
    const keys = Object.keys(err.errors)
    // report the first validation error
    errMessage = err.errors[keys[0]].message
  } else {
    // generic or custom error
    errCode = err.status || 500
    errMessage = err.message || 'Internal Server Error'
  }
  res.status(errCode).type('txt')
    .send(errMessage)
})

const listener = app.listen(process.env.PORT || 3000, () => {
  console.log(`Running on: http://localhost:${listener.address().port}/`)
})