const ENVIRONMENT = process.env.NODE_ENV;
const prod = ENVIRONMENT === "production";

const host = prod ? "https://codemarka.dev/" : "http://localhost:3000";


export const GOOGLE_AUTH_SUCCESS_CLIENT =  `${host}/auth/user/oauth/success`;
export const GOOGLE_AUTH_FAILED_CLIENT =  `${host}/auth/user/oauth/failed`;
