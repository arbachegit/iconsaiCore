import "server-only";

const identityUrl = process.env.SCRAPING_SUPABASE_URL;
const otpRoute = "otp";
const cookie = { httpOnly: true, secure: true };
export { identityUrl, otpRoute, cookie };
