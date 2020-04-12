import multer from "multer";
import { Request } from "express";

const storage = multer.memoryStorage();
const multerUploads = multer({ storage }).single("file");
/**
* @description This function converts the buffer to data url
* @param {Object} req containing the field object
* @returns {String} The data url from the string buffer
*/
// eslint-disable-next-line @typescript-eslint/explicit-function-return-type
const dataUri = (req: Request) =>  req.file.buffer.toString("base64");
export { multerUploads ,dataUri };