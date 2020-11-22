/* eslint-disable @typescript-eslint/camelcase */
import cloudinary  from "cloudinary";

const cloudi = cloudinary.v2;

cloudi.config({ 
    cloud_name: process.env.CLOUDINARY_NAME, 
    api_key: process.env.CLOUDINARY_API_KEY, 
    api_secret: process.env.CLOUDINARY_API_SECRET
});

export default cloudi;