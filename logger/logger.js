const {format, createLogger, transports} = require("winston");
const {timestamp, combine, printf} = format;
const logFormat = printf(({level, message, timestamp }) => {
    return `${timestamp} ${level}: ${message}`;
})

const logger = createLogger({
    level: "info",
    format: combine(
        format.colorize(),
        timestamp({format: 'YYYY-MM-DD HH:mm:ss'}),
        logFormat
    ),
    transports: [new transports.Console()],
});

module.exports = logger;