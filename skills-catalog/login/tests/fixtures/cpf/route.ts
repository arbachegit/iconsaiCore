import "server-only";

const identityUrl = process.env.SCRAPING_SUPABASE_URL;
const otpRoute = "otp";
const token_hash = "sha256(session)";
const authorization = "Bearer memoryOnlySession";
const responseHeaders = { "cache-control": "no-store" };
export { identityUrl, otpRoute, token_hash, authorization, responseHeaders };
