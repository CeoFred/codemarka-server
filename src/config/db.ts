import mongoose from "mongoose";
import bluebird from "bluebird";
import chalk from "chalk";

import { MONGODB_URI } from "../util/secrets";

// // Connect to MongoDB
const mongoUrl = MONGODB_URI;
mongoose.Promise = bluebird;
mongoose.set("useFindAndModify", false);
mongoose.set("useCreateIndex", true);
mongoose.set("useNewUrlParser", true);
mongoose.set("useUnifiedTopology", true);
mongoose.connect( mongoUrl , { useNewUrlParser: true,useUnifiedTopology:true} ).then(
    () => { 
        console.log("Connected to mongo");

    },
).catch(err => {
    console.log("MongoDB connection error. Please make sure MongoDB is running. " + err);
    // process.exit();
});
const db = mongoose.connection;

db.on("error", (err) => {
    // debug(`MongoDB connection error ${config.database.url} \nPlease make sure MongoDB is running.`);
    console.error(err);
    console.log("%s MongoDB connection error. Please make sure MongoDB is running.", chalk.red("✗"));
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
