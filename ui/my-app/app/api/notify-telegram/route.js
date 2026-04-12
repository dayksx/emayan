import { NextResponse } from "next/server";

/**
 * Normalize user input into a Telegram sendMessage chat_id (numeric id, or @username).
 */
function normalizeChatId(raw) {
  const s = typeof raw === "string" ? raw.trim() : "";
  if (!s) return s;

  const link = s.match(/(?:https?:\/\/)?t\.me\/([a-zA-Z0-9_]+)/i);
  if (link) return `@${link[1]}`;

  if (/^-?\d+$/.test(s)) return s;

  const name = s.replace(/^@+/, "");
  if (!name) return s;
  return `@${name}`;
}

async function sendTelegramMessage(token, chat_id, text) {
  const url = `https://api.telegram.org/bot${token}/sendMessage`;
  const res = await fetch(url, {
    method: "POST",
    cache: "no-store",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      chat_id,
      text: text.slice(0, 4096),
      disable_web_page_preview: true,
    }),
  });

  let data;
  try {
    data = await res.json();
  } catch {
    return {
      ok: false,
      chat_id,
      error: "telegram_response_not_json",
    };
  }

  if (!data.ok) {
    return {
      ok: false,
      chat_id,
      error: data.description || "telegram_send_failed",
      telegram_error_code: data.error_code,
    };
  }

  return { ok: true, chat_id };
}

/**
 * POST: send grievance text to the form’s chat, and optionally to TELEGRAM_NOTIFY_CHAT_ID (your chat).
 * GET: verify token with getMe (no message sent).
 *
 * Requires TELEGRAM_BOT_TOKEN. Recipients must have started the bot (/start) before DMs work.
 */
export async function GET() {
  const token = process.env.TELEGRAM_BOT_TOKEN?.trim();
  if (!token) {
    return NextResponse.json(
      { ok: false, error: "TELEGRAM_BOT_TOKEN not set" },
      { status: 503 }
    );
  }

  try {
    const res = await fetch(
      `https://api.telegram.org/bot${token}/getMe`,
      { cache: "no-store" }
    );
    const data = await res.json();
    if (!data.ok) {
      return NextResponse.json(
        { ok: false, error: data.description || "getMe failed" },
        { status: 502 }
      );
    }
    return NextResponse.json({
      ok: true,
      botUsername: data.result?.username ?? null,
      botId: data.result?.id ?? null,
    });
  } catch (e) {
    return NextResponse.json(
      { ok: false, error: e instanceof Error ? e.message : "unknown" },
      { status: 500 }
    );
  }
}

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

    const token = process.env.TELEGRAM_BOT_TOKEN?.trim();
    if (!token) {
      return NextResponse.json({
        ok: false,
        skipped: true,
        reason: "telegram_bot_token_not_set",
      });
    }

    const primary = normalizeChatId(raw);
    const extraRaw = process.env.TELEGRAM_NOTIFY_CHAT_ID?.trim();
    const extra = extraRaw ? normalizeChatId(extraRaw) : "";

    /** @type {{ chat_id: string }[]} */
    const targets = [{ chat_id: primary }];
    if (extra && extra !== primary) {
      targets.push({ chat_id: extra });
    }

    const results = await Promise.all(
      targets.map((t) => sendTelegramMessage(token, t.chat_id, text))
    );

    const oks = results.filter((r) => r.ok);
    const fails = results.filter((r) => !r.ok);

    if (oks.length === 0) {
      const msg = fails.map((f) => `${f.chat_id}: ${f.error}`).join(" | ");
      return NextResponse.json(
        {
          ok: false,
          error: msg || "telegram_send_failed",
          failures: fails,
        },
        { status: 502 }
      );
    }

    return NextResponse.json({
      ok: true,
      partial: fails.length > 0,
      failures: fails.length > 0 ? fails : undefined,
    });
  } catch (e) {
    return NextResponse.json(
      { ok: false, error: e instanceof Error ? e.message : "unknown" },
      { status: 500 }
    );
  }
}
