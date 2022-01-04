import mongoose from "mongoose";
import bluebird from "bluebird";
import chalk from "chalk";
import logger from "../util/logger";
// import { MONGODB_URI } from "../util/secrets";

export const ENVIRONMENT = process.env.NODE_ENV;
const prod = ENVIRONMENT === "production" || ENVIRONMENT === "staging"; // Anything else is treated as 'dev'
export const MONGODB_URI = prod ? process.env["MONGODB_URI"] : process.env["MONGODB_URI_LOCAL"];

// 

if (!MONGODB_URI) {
    if (prod) {
        logger.error("No mongo connection string. Set MONGODB_URI environment variable.");
    } else {
        logger.error("No mongo connection string. Set MONGODB_URI_LOCAL environment variable.");
    }
    process.exit(1);
}
// // Connect to MongoDB
const mongoUrl = MONGODB_URI;
mongoose.Promise = bluebird;
mongoose.set("useFindAndModify", false);
mongoose.set("useCreateIndex", true);
mongoose.set("useNewUrlParser", true);
mongoose.set("useUnifiedTopology", true);
mongoose.connect( mongoUrl , { useNewUrlParser: true,useUnifiedTopology:true} ).then(
    () => { 
        
        logger.info(chalk.green("MongoDB connection successful."));
    },
).catch(() => {
    console.error("Could Not Connect to MongoDB");
    // process.exit();
});
const db = mongoose.connection;

db.on("error", (err) => {
    // debug(`MongoDB connection error ${config.database.url} \nPlease make sure MongoDB is running.`);
    console.error(err);
  
    process.exit();
});

db.once("open", () => {
    // debug("MongoDB connection with database succeeded.");
});

process.on("SIGINT", () => {
    db.close(() => {
        // debug("MongoDB connection disconnected through app termination.");
        process.exit();
    });
});

export default  db;
