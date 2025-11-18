const fs = require('fs');
const path = require('path');
const morgan = require('morgan');

// Create logs directory if it doesn't exist
const logsDir = path.join(__dirname, '../../logs');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

// Access log stream
const accessLogStream = fs.createWriteStream(
  path.join(logsDir, 'access.log'),
  { flags: 'a' }
);

// Error log stream
const errorLogStream = fs.createWriteStream(
  path.join(logsDir, 'error.log'),
  { flags: 'a' }
);

// Custom token for response time in ms
morgan.token('response-time-ms', (req, res) => {
  if (!req._startAt || !res._startAt) return '';
  const ms = (res._startAt[0] - req._startAt[0]) * 1e3 +
    (res._startAt[1] - req._startAt[1]) * 1e-6;
  return ms.toFixed(3);
});

// HTTP request logger
const requestLogger = morgan(
  ':remote-addr - :remote-user [:date[clf]] ":method :url HTTP/:http-version" :status :res[content-length] ":referrer" ":user-agent" :response-time-ms ms',
  { stream: accessLogStream }
);

// Console logger for development
const consoleLogger = morgan('dev');

// Error logger middleware
const errorLogger = (err, req, res, next) => {
  const timestamp = new Date().toISOString();
  const errorLog = {
    timestamp,
    method: req.method,
    url: req.url,
    ip: req.ip,
    error: {
      message: err.message,
      stack: err.stack,
      status: err.status || 500
    }
  };

  // Write to error log file
  errorLogStream.write(JSON.stringify(errorLog) + '\n');

  // Log to console in development
  if (process.env.NODE_ENV === 'development') {
    console.error('❌ Error:', err.message);
    console.error(err.stack);
  }

  next(err);
};

// Request logger that logs to console in dev
const logRequest = (req, res, next) => {
  if (process.env.NODE_ENV === 'development') {
    console.log(`${req.method} ${req.url}`);
  }
  next();
};

module.exports = {
  requestLogger,
  consoleLogger,
  errorLogger,
  logRequest
};
