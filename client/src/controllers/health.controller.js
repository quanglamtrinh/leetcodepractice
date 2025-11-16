const pool = require("../db/pool");

const getHealth = async (req, res) => {
  try {
    await pool.query("SELECT NOW()");
    res.json({
      status: "ok",
      timestamp: new Date().toISOString(),
      database: "connected"
    });
  } catch (error) {
    console.error("Health check failed:", error);
    res.status(503).json({
      status: "error",
      timestamp: new Date().toISOString(),
      database: "disconnected",
      error: error.message
    });
  }
};

module.exports = { getHealth };
