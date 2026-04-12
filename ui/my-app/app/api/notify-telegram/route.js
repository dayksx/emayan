import { NextResponse } from "next/server";

/**
 * Sends a message via Telegram Bot API. Requires TELEGRAM_BOT_TOKEN.
 * The culprit usually must have started a chat with the bot (/start) for DMs to work.
 */
export async function POST(request) {
  try {
    const body = await request.json();
    const { chatIdOrUsername, text } = body;

    if (!text || typeof text !== "string") {
      return NextResponse.json({ ok: false, error: "missing_text" }, { status: 400 });
    }

    const raw =
      typeof chatIdOrUsername === "string" ? chatIdOrUsername.trim() : "";
    if (!raw) {
      return NextResponse.json({ ok: false, error: "missing_chat" }, { status: 400 });
    }

    const token = process.env.TELEGRAM_BOT_TOKEN;
    if (!token) {
      return NextResponse.json({
        ok: true,
        skipped: true,
        reason: "telegram_bot_token_not_set",
      });
    }

    let chat_id = raw;
    if (!raw.startsWith("@") && !/^\d+$/.test(raw) && !raw.startsWith("-")) {
      chat_id = `@${raw.replace(/^@/, "")}`;
    }

    const url = `https://api.telegram.org/bot${token}/sendMessage`;
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id,
        text: text.slice(0, 4096),
        disable_web_page_preview: true,
      }),
    });

    const data = await res.json();
    if (!data.ok) {
      return NextResponse.json(
        {
          ok: false,
          error: data.description || "telegram_send_failed",
        },
        { status: 502 }
      );
    }

    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json(
      { ok: false, error: e instanceof Error ? e.message : "unknown" },
      { status: 500 }
    );
  }
}
