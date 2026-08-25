import "server-only";

const identityUrl = process.env.SCRAPING_SUPABASE_URL;
const otpRoute = "otp";
const token_hash = "sha256(session)";
const authorization = "Bearer memoryOnlySession";
const responseHeaders = { "cache-control": "no-store" };
const managementAuthority = "https://superadmin.iconsai.ai/admins";
const rebindSession = "session/rebind session_rebound_after_reload";
const sessionManager = "session_hours_enabled expires_at Sessão restante";
const toggle = 'role="switch"';
export { identityUrl, otpRoute, token_hash, authorization, responseHeaders, managementAuthority, rebindSession, sessionManager, toggle };
