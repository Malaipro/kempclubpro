import { defineTool, type ToolContext } from "@lovable.dev/mcp-js";
import { supabaseForUser } from "../supabaseForUser";

export default defineTool({
  name: "list_my_homework",
  title: "List my homework",
  description:
    "Return the signed-in user's homework submissions with status, points and timestamps.",
  inputSchema: {},
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async (_input, ctx: ToolContext) => {
    if (!ctx.isAuthenticated()) {
      return { content: [{ type: "text", text: "Not authenticated" }], isError: true };
    }
    const supabase = supabaseForUser(ctx);
    const { data, error } = await supabase
      .from("homework_submissions")
      .select(
        "id, homework_type, status, points_earned, verified, admin_comment, submitted_at, reviewed_at",
      )
      .eq("user_id", ctx.getUserId())
      .order("submitted_at", { ascending: false })
      .limit(50);
    if (error) {
      return { content: [{ type: "text", text: error.message }], isError: true };
    }
    return {
      content: [{ type: "text", text: JSON.stringify(data ?? []) }],
      structuredContent: { submissions: data ?? [] },
    };
  },
});
