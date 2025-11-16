require("dotenv").config({ path: __dirname + "/.env" });
const express = require("express");
const cors = require("cors");

const app = express();
app.use(cors());
app.use(express.json());

// Routes
const healthRoute = require("./routes/health.route");
app.use("/api/health", healthRoute);

// Server start
const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});



const morgan = require('morgan');

app.use(morgan('dev')); // log request ra console
