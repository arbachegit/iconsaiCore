import "server-only";

const identityUrl = process.env.SUPERADMIN_SUPABASE_URL;
const canonicalIdentity = "public.super_admins";
const managementAuthority = "https://superadmin.iconsai.ai/admins";
const otpRoute = "otp";
const token_hash = "sha256(session)";
const authorization = "Bearer memoryOnlySession";
const responseHeaders = { "cache-control": "no-store" };
const rebindSession = "session/rebind session_rebound_after_reload";
const sessionManager = "session_hours_enabled expires_at Sessão restante";
const toggle = 'role="switch"';
export { identityUrl, canonicalIdentity, managementAuthority, otpRoute, token_hash, authorization, responseHeaders, rebindSession, sessionManager, toggle };
