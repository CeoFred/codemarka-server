import sgMail  from "@sendgrid/mail";

sgMail.setApiKey(process.env.SENDGRID_API_KEY);

export const sendMail = (html: string,subject: string,from: string,to: string): any => {
    const msg = {
        to,
        from: from ? from : "Codemarka@codemarka.co",
        subject,
        html,
    };
    return sgMail.send(msg,true);
};