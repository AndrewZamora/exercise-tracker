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

app.post('/api/exercise/add', async (req, res) => {
  const { userId, description, duration, date } = req.body;
  const exerciseLog = await ExerciseLog.findById(userId);
  const updatedLog = [...exerciseLog.log, { description, duration, date }];
  const updatedCount = updatedLog.length;
  const result = await ExerciseLog.findByIdAndUpdate(userId, { log: updatedLog, count: updatedCount }, { new: true }).catch(err => { console.log(err) });
  res.json(result);
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
