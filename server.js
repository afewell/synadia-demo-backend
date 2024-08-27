require('dotenv').config();
const express = require('express');
const { connect, StringCodec } = require('nats');
const app = express();
const port = process.env.PORT || 3000;

let nc, js, kv; // Declare NATS, JetStream, and KV store variables
const sc = StringCodec();

// Function to connect to NATS and set up JetStream and Key-Value store
const natsConnection = async () => {
  nc = await connect({ servers: "localhost:4222" });
  console.log('Connected to NATS server');

  // Set up JetStream context
  js = nc.jetstream();

  // Check if the bucket exists, and create it if not
  try {
    kv = await js.views.kv('demo_bucket');
    console.log('JetStream Key-Value store initialized');
  } catch (err) {
    console.log('Error initializing Key-Value store:', err.message);
  }
};

// Initialize NATS connection
natsConnection().catch(console.error);

app.get('/', (req, res) => {
  res.send('Hello, Synadia Demo!');
});

// Publish a message to NATS
app.get('/send', (req, res) => {
  if (!nc) {
    return res.status(500).send('NATS connection not established');
  }

  setTimeout(() => {
    nc.publish('demo.subject', sc.encode('Hello from Node.js!'));
    res.send('Message sent to NATS!');
  }, 1000); // 1 second delay before publishing the message
});

// Set a key-value pair in JetStream
app.get('/set', async (req, res) => {
  if (!kv) {
    return res.status(500).send('JetStream Key-Value store not initialized');
  }

  const key = 'greeting';
  const value = 'Hello, JetStream!';

  try {
    await kv.put(key, sc.encode(value));
    res.send(`Key "${key}" set to "${value}" in the Key-Value store.`);
  } catch (error) {
    res.status(500).send('Error setting key in JetStream: ' + error.message);
  }
});

// Get a key-value pair from JetStream
app.get('/get', async (req, res) => {
  if (!kv) {
    return res.status(500).send('JetStream Key-Value store not initialized');
  }

  const key = 'greeting';

  try {
    const entry = await kv.get(key);
    res.send(`Key "${key}" retrieved with value "${sc.decode(entry.value)}".`);
  } catch (error) {
    res.status(500).send('Error retrieving key from JetStream: ' + error.message);
  }
});

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
