const express = require('express');
const cors = require('cors');
// ... other requires ...

const app = express();

// Add CORS middleware as the first middleware
app.use(cors({
    origin: 'http://localhost:5173',
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    exposedHeaders: ['Content-Disposition'],
    credentials: true
}));

// ... rest of your app.js configuration ...