const { format, createLogger, transports } = require("winston");
require("winston-daily-rotate-file");
const { timestamp, combine, printf } = format;
const logFormat = printf(({ level, message, timestamp }) => {
  return `${timestamp} ${level}: ${message}`;
});

const logger = createLogger({
  level: "debug",
  format: combine(timestamp({ format: "YYYY-MM-DD HH:mm:ss" }), logFormat),
  transports: [
    new transports.DailyRotateFile({
      filename: "logs/info-%DATE%.log",
      level: "debug",
      maxFiles: "14d",
    }),
  ],
});

module.exports = logger;
