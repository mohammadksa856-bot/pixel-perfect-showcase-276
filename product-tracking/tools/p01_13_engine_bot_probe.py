"""P01-13: run the engine's Telegram command layer offline (no token, no network).

    python3 -I p01_13_engine_bot_probe.py <engine_repo> <db_copy>

Calls finengine.telegram.answer_command directly; TelegramBot is never built,
so nothing reaches Telegram or the live bot.
"""
import json
import sys

engine, db_path = sys.argv[1:3]
sys.path.insert(0, engine + "/src")
from finengine.database import Database  # noqa: E402
from finengine.telegram import answer_command  # noqa: E402

Database(db_path)  # migrate the copy
COMMANDS = [
    "/start", "/help", "/list", "/sector", "/watch 2222", "/mywatch", "/request x", "/language",
    "أرامكو", "2222", "Al Rajhi",
    "/company SA 2222", "/company SA 1120", "/company SA 4190",
    "/profile SA 2222", "/profile SA 1120",
    "/metric SA 1120 dividends_per_share", "/metric SA 1120 free_cash_flow",
    "/metric SA 1120 cost_to_income_ratio", "/metric SA 2222 revenue 3",
    "/snapshot SA 1120", "/coverage SA 1120",
]
json.dump({c: answer_command(db_path, c) for c in COMMANDS}, sys.stdout, ensure_ascii=False, indent=1)
