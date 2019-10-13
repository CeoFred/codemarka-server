import winston from "winston";

// const options: LoggerOptions = {
//     transports: [
//         new transports.Console({
//             level: process.env.NODE_ENV === "production" ? "error" : "debug"
//         }),
//         new transports.File({ filename: "debug.log", level: "debug" })
//     ]
// };

// const logger = new Logger(options);

// if (process.env.NODE_ENV !== "production") {
//     logger.debug("Logging initialized at debug level");
// }

// export default logger;


const logger = winston.createLogger({
    level: "info",
    format: winston.format.json(),
    defaultMeta: { service: "user-service" },
    transports: [
        //
        // - Write to all logs with level `info` and below to `combined.log` 
        // - Write all logs error (and below) to `error.log`.
        //
        new winston.transports.File({ filename: "debug.log", level: "debug" }),
    ]
});

//
// If we're not in production then log to the `console` with the format:
// `${info.level}: ${info.message} JSON.stringify({ ...rest }) `
// 
if (process.env.NODE_ENV !== "production") {
    logger.add(new winston.transports.Console({
        format: winston.format.simple()
    }));
}

export default logger;