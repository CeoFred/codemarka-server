/* eslint-disable @typescript-eslint/camelcase */
/* eslint-disable @typescript-eslint/no-unused-vars */
import {NextFunction, Response, Request} from "express";
import crypto from "crypto";
import qs from "qs";
export const check = (req: Request, res: Response, next: NextFunction): void | object => {
    let slackSignature = String(req.headers["x-slack-signature"]);
    let requestBody = qs.stringify(req.body,{ format:"RFC1738" });
    let timestamp = Number(req.headers["x-slack-request-timestamp"]);

    let sigBasestring = "v0:" + timestamp + ":" + requestBody;
    const slackSigningSecret = process.env.SLACK_SIGNING_SECRET || "7f4b3676a5aeee58ee34f94a7201ec6b";
    
    let mySignature = "v0=" + 
                   crypto.createHmac("sha256", slackSigningSecret)
                       .update(sigBasestring, "utf8")
                       .digest("hex");

    if (crypto.timingSafeEqual(
        Buffer.from(mySignature, "utf8"),
        Buffer.from(slackSignature, "utf8"))) {
          
        next();
    } else {
        return res.status(400).send("Verification failed");
    }
    const time = Math.floor(new Date().getTime()/1000);
    if (Math.abs(time - timestamp) > 300) {
        return res.status(400).send("Ignore this request.");
    }
    // hmac_.
};
