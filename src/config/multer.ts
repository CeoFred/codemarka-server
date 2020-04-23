import multer from "multer";

var storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, "../public/uploads");
    },
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1E9);
        cb(null, file.fieldname + "-" + uniqueSuffix);
    }
});

const multerUploads = multer({ storage }).single("file");

// eslint-disable-next-line @typescript-eslint/explicit-function-return-type
export { multerUploads };