import { auth, defineMcp } from "@lovable.dev/mcp-js";
import getMyProfile from "./tools/get-my-profile";
import getMyCoins from "./tools/get-my-coins";
import listMyHomework from "./tools/list-my-homework";

// The OAuth issuer MUST be the direct Supabase host built from the project ref.
// Never derive it from SUPABASE_URL (that can be a proxy host). VITE_SUPABASE_PROJECT_ID
// is inlined by Vite at build time, keeping this module import-safe.
const projectRef = import.meta.env.VITE_SUPABASE_PROJECT_ID ?? "project-ref-unset";

export default defineMcp({
  name: "kemp-club-mcp",
  title: "КЭМП Club MCP",
  version: "0.1.0",
  instructions:
    "Tools for the КЭМП Club member area. Each caller connects as a signed-in user and can read their own profile, coin balance and homework.",
  auth: auth.oauth.issuer({
    issuer: `https://${projectRef}.supabase.co/auth/v1`,
    acceptedAudiences: "authenticated",
  }),
  tools: [getMyProfile, getMyCoins, listMyHomework],
});
