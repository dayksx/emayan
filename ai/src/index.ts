import "dotenv/config";
import { ChatOpenAI } from "@langchain/openai";
import {
  AIMessage,
  BaseMessage,
  HumanMessage,
  SystemMessage,
} from "@langchain/core/messages";
import {
  END,
  GraphNode,
  MemorySaver,
  MessagesValue,
  START,
  StateGraph,
  StateSchema,
} from "@langchain/langgraph";
import { Telegraf } from "telegraf";
import { loadPettyLedgerReadme } from "./readmeContext.js";

const LLM_KEY = process.env.LLM_API_KEY ?? process.env.OPENAI_API_KEY;
const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;

if (!LLM_KEY) {
  console.error("❌ Missing LLM_API_KEY or OPENAI_API_KEY in environment.");
  process.exit(1);
}
if (!TELEGRAM_BOT_TOKEN) {
  console.error("❌ Missing TELEGRAM_BOT_TOKEN in environment.");
  process.exit(1);
}
console.log("✅ Environment variables look good (LLM + Telegram).");

const pettyLedgerReadme = loadPettyLedgerReadme();

const systemPrompt = `You are the **Petty Ledger** guide for Telegram (project codename Emayan). Help users understand and use the grievance ledger on the XRP Ledger: filing types, memos, optional stakes, Telegram cards, Type 4 escrow/magic links, and how the UI and chain fit together.

Rules:
- Ground answers in the specification below; if something is not covered, say you are not sure.
- Be concise. Users sign transactions in their own wallet (client-side); you explain steps and concepts—you do not execute chain actions for them.
- When relevant, point to the \`petty_ledger\` smart contract and repo layout described in the spec.

--- Petty Ledger technical specification (README.md) ---
${pettyLedgerReadme}
---`;

const State = new StateSchema({
  messages: MessagesValue,
});

const model = new ChatOpenAI({
  apiKey: LLM_KEY,
  model: "gpt-4o-mini",
  temperature: 0.7,
});
console.log("🤖 ChatOpenAI initialized (model: gpt-4o-mini).");

const callModel: GraphNode<typeof State> = async (state) => {
  console.log(
    `🔮 Graph node "model" — calling OpenAI (thread has ${state.messages.length} message(s) in state)`
  );
  const messagesWithSystem = [
    new SystemMessage(systemPrompt),
    ...state.messages,
  ];
  const response = await model.invoke(messagesWithSystem);
  console.log("✨ OpenAI returned a reply.");
  return { messages: [response] };
};

/** Persists graph state per `thread_id` (Telegram chat). In-memory only; lost on process restart. */
const checkpointer = new MemorySaver();

const graph = new StateGraph(State)
  .addNode("model", callModel)
  .addEdge(START, "model")
  .addEdge("model", END)
  .compile({ checkpointer });

console.log("🧠 LangGraph compiled with MemorySaver checkpointer.");

function getReplyText(messages: BaseMessage[]): string {
  const last = messages.at(-1);
  if (last instanceof AIMessage) {
    const c = last.content;
    return typeof c === "string" ? c : JSON.stringify(c);
  }
  return "";
}

const bot = new Telegraf(TELEGRAM_BOT_TOKEN);

bot.start(async (ctx) => {
  const from = ctx.from?.username
    ? `@${ctx.from.username}`
    : `user ${ctx.from?.id ?? "?"}`;
  console.log(`👋 /start from ${from} (chat ${ctx.chat?.id})`);
  await ctx.reply(
    "Ask me about Petty Ledger — filing types, XRPL, Telegram cards, escrow. /clear resets this chat."
  );
});

bot.command("clear", async (ctx) => {
  const threadId = String(ctx.chat?.id);
  console.log(`🧹 /clear — wiping checkpoints for thread ${threadId}`);
  await checkpointer.deleteThread(threadId);
  await ctx.reply("Conversation cleared for this chat.");
});

bot.on("text", async (ctx) => {
  const chatId = String(ctx.chat.id);
  const text = ctx.message.text;
  if (text.startsWith("/")) return;

  const preview =
    text.length > 80 ? `${text.slice(0, 80)}…` : text;
  console.log(`💬 Message [chat ${chatId}]: ${preview}`);

  await ctx.sendChatAction("typing");

  try {
    console.log(`⚙️  Invoking LangGraph (thread_id=${chatId})…`);
    const result = await graph.invoke(
      { messages: [new HumanMessage(text)] },
      { configurable: { thread_id: chatId } }
    );
    const reply = getReplyText(result.messages);
    await ctx.reply(reply || "(empty reply)");
    console.log(`📤 Reply sent to chat ${chatId} (${reply.length} chars)`);
  } catch (err) {
    console.error("❌ Graph / OpenAI error:", err);
    await ctx.reply("Something went wrong. Try again later.");
  }
});

bot.catch((err, ctx) => {
  console.error("❌ Telegraf error:", err);
  void ctx.reply("Bot error.");
});

void bot.launch().then(() => {
  console.log("🚀 Telegram bot is live — polling for updates. (Ctrl+C to stop)");
});

process.once("SIGINT", () => {
  console.log("👋 SIGINT — stopping bot…");
  bot.stop("SIGINT");
});
process.once("SIGTERM", () => {
  console.log("👋 SIGTERM — stopping bot…");
  bot.stop("SIGTERM");
});
