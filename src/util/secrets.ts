import logger from "./logger";
import dotenv from "dotenv";
import fs from "fs";

// 
// if (fs.existsSync(".env")) {
//     logger.debug("Using .env file to supply config environment variables");
//     dotenv.config({ path:".env" });
// } else {
//     logger.debug("Using .env.example file to supply config environment variables");
//     dotenv.config({ path: ".env.example" });  // you can delete this after you create your own .env file!
// }
// export const ENVIRONMENT = process.env.NODE_ENV;
// const prod = ENVIRONMENT === "production"; // Anything else is treated as 'dev'
// export const MONGODB_URI = prod ? process.env["MONGODB_URI"] : process.env["MONGODB_URI_LOCAL"];

// // 

// if (!MONGODB_URI) {
//     if (prod) {
//         logger.error("No mongo connection string. Set MONGODB_URI environment variable.");
//     } else {
//         logger.error("No mongo connection string. Set MONGODB_URI_LOCAL environment variable.");
//     }
//     process.exit(1);
// }
export const SESS_NAME = "CODEMARKA_SESS";
export const SESS_SECRET = "secret!session0O!!SECRETTIII";
export const SESS_LIFETIME = 1000 * 60 * 60 * 2;