const dotenv = require('dotenv');
dotenv.config({ path: __dirname + '/db/.env' });

const express = require('express');
const cors = require('cors');
const pool = require('./db');
const http = require('http');
const socketIo = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
    cors: {
        origin: process.env.CORS_ORIGIN || "http://localhost:3000",
        methods: ["GET", "POST", "PUT", "DELETE"]
    }
});

// Pass io to all routes
app.use((req, res, next) => {
    req.io = io;
    next();
});

const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());
// Serve static files for image uploads
app.use('/uploads', express.static(__dirname + '/public/uploads'));

// Basic health check endpoint
app.get('/api/health', async (req, res) => {
    try {
        await pool.query('SELECT 1');
        res.json({ status: 'healthy', db: 'connected' });
    } catch (error) {
        console.error('Database connection failed:', error);
        res.status(500).json({ status: 'error', db: 'disconnected' });
    }
});

// Import and use routes
const formsRoutes = require('./routes/forms');
const uploadRoutes = require('./routes/upload');
const optionsRoutes = require('./routes/options');
const formTopicsRoutes = require('./routes/form_topics');
const usersRoutes = require('./routes/users');
const personnelRoutes = require('./routes/personnel');
const devicesRoutes = require('./routes/devices');
const settingsRoutes = require('./routes/settings');
const personnelFormsRoutes = require('./routes/personnel-forms');
const jobTypesRoutes = require('./routes/job-types');

app.use('/api/forms', formsRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/api/option-sets', optionsRoutes);
app.use('/api/form-topics', formTopicsRoutes);
app.use('/api/users', usersRoutes);
app.use('/api/personnel', personnelRoutes);
app.use('/api/devices', devicesRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/personnel-forms', personnelFormsRoutes);
app.use('/api/job-types', jobTypesRoutes);

io.on('connection', (socket) => {
    console.log('New client connected:', socket.id);
    socket.on('disconnect', () => {
        console.log('Client disconnected:', socket.id);
    });
});

server.listen(PORT, () => {
    console.log(`Server & Socket.io running on port ${PORT}`);
});
