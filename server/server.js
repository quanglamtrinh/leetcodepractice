const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const { requestLogger, consoleLogger, errorLogger } = require('./middleware/logger');
const { errorHandler, notFoundHandler } = require('./middleware/errorHandler');

const app = express();
const PORT = process.env.PORT || 3001;

// Logging middleware
app.use(requestLogger); // Log to file
if (process.env.NODE_ENV === 'development') {
  app.use(consoleLogger); // Log to console in dev
}

// Body parsing middleware
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.static('.'));

// Routes
const apiRoutes = require('./routes');
app.use('/api', apiRoutes);

// 404 handler
app.use(notFoundHandler);

// Error logging middleware
app.use(errorLogger);

// Error handling middleware
app.use(errorHandler);

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
  console.log(`📊 API available at http://localhost:${PORT}/api`);
  console.log(`🌐 Frontend available at http://localhost:${PORT}`);
  console.log(`📝 Logs directory: logs/`);
});
