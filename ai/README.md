# Petty Ledger — Telegram AI agent

This package runs a **Telegram bot** that answers questions about **Petty Ledger** (Emayan) using **OpenAI**, **LangGraph**, and the same product context as the main repository.

## What it does

- Receives messages on Telegram (long-polling).
- Maintains **per-chat** conversation state with a LangGraph **MemorySaver** checkpointer (`thread_id` = Telegram `chat.id`).
- Injects **two Markdown sources** into the system prompt on every model call:
  1. **Repository root `README.md`** — full hackathon / product / XRPL / Telegram spec.
  2. **`ai/README.md` (this file)** — how *this* agent is built and operated.

Commands:

| Command   | Action                                      |
|----------|---------------------------------------------|
| `/start` | Short intro                                 |
| `/clear` | Deletes checkpointed thread state for chat |

## Requirements

- **Node.js** ≥ 20  
- **pnpm** (see `packageManager` in `package.json`)

## Configuration

Copy `.env.example` to `.env` and set:

| Variable | Description |
|----------|-------------|
| `LLM_API_KEY` | OpenAI API key (or use `OPENAI_API_KEY`) |
| `TELEGRAM_BOT_TOKEN` | From [@BotFather](https://t.me/BotFather) |
| `PETTY_LEDGER_README_PATH` | *Optional.* Path to the **root** spec `README.md` file. If you point at a **directory** (e.g. repo root), `README.md` inside it is used. |

## Run

```bash
cd ai
pnpm install
pnpm dev          # tsx, loads .env via dotenv
# or
pnpm build && pnpm start
```

Run `pnpm build && pnpm start` from the **`ai/`** directory so default paths resolve to `../README.md` and `./README.md`.

## Stack

- **telegraf** — Telegram Bot API  
- **@langchain/langgraph** — state graph + **MemorySaver** checkpointing  
- **@langchain/openai** — `gpt-4o-mini` (configurable in `src/index.ts`)

## Product reference

Authoritative product and chain details live in the **[root README](../README.md)**. This agent does not submit XRPL transactions; it only explains how users can use the app and the ledger.
