import { defineTool, type ToolContext } from "@lovable.dev/mcp-js";
import { supabaseForUser } from "../supabaseForUser";

export default defineTool({
  name: "get_my_coins",
  title: "Get my coins",
  description:
    "Return the signed-in user's current coin balance and their most recent coin transactions.",
  inputSchema: {},
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async (_input, ctx: ToolContext) => {
    if (!ctx.isAuthenticated()) {
      return { content: [{ type: "text", text: "Not authenticated" }], isError: true };
    }
    const supabase = supabaseForUser(ctx);
    const userId = ctx.getUserId();

    const { data: balance, error: balanceError } = await supabase.rpc(
      "get_user_coin_balance",
      { p_user_id: userId },
    );
    if (balanceError) {
      return { content: [{ type: "text", text: balanceError.message }], isError: true };
    }

    const { data: txns, error: txnError } = await supabase
      .from("coin_transactions")
      .select("amount, reason, created_at")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(20);
    if (txnError) {
      return { content: [{ type: "text", text: txnError.message }], isError: true };
    }

    const result = { balance: (balance as number) ?? 0, transactions: txns ?? [] };
    return {
      content: [{ type: "text", text: JSON.stringify(result) }],
      structuredContent: result,
    };
  },
});
