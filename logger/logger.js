const { format, createLogger, transports } = require("winston");
const { timestamp, combine, printf } = format;
const logFormat = printf(({ level, message, timestamp }) => {
  return `${timestamp} ${level}: ${message}`;
});

const logger = createLogger({
  level: "info",
  format: combine(timestamp({ format: "YYYY-MM-DD HH:mm:ss" }), logFormat),
  transports: [
    new transports.File({ filename: "logs/info.log", level: "info" }),
  ],
});

module.exports = logger;
