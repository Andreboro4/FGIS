# api/webhook.py
# Serverless-функция для Vercel — обрабатывает webhook от Telegram

import os
import json
import asyncio
from http.server import BaseHTTPRequestHandler

from aiogram import Bot, Dispatcher, Router, types
from aiogram.filters import CommandStart, Command
from aiogram.types import WebAppInfo, InlineKeyboardMarkup, InlineKeyboardButton
from aiogram.enums import ParseMode

BOT_TOKEN = os.getenv("BOT_TOKEN")
WEBAPP_URL = os.getenv("WEBAPP_URL", "https://your-domain.com")

bot = Bot(token=BOT_TOKEN, parse_mode=ParseMode.HTML)
dp = Dispatcher()
router = Router()

@router.message(CommandStart())
async def cmd_start(message: types.Message):
    kb = InlineKeyboardMarkup(inline_keyboard=[
        [InlineKeyboardButton(
            text="🌾 Открыть РуГрейн",
            web_app=WebAppInfo(url=WEBAPP_URL)
        )]
    ])
    await message.answer(
        "👋 <b>Добро пожаловать в РуГрейн!</b>\n\n"
        "🌾 ФГИС Помощник для аграриев\n"
        "📋 Задачи, маршруты, документы и AI-консультант\n\n"
        "Нажмите кнопку ниже, чтобы открыть приложение:",
        reply_markup=kb
    )

@router.message(Command("help"))
async def cmd_help(message: types.Message):
    await message.answer("📖 /start — открыть Mini App\n/help — справка\n/about — о проекте")

@router.message(Command("about"))
async def cmd_about(message: types.Message):
    await message.answer("🌾 РуГрейн — ФГИС Помощник для аграриев. Версия 1.0.0")

dp.include_router(router)

class handler(BaseHTTPRequestHandler):
    def do_POST(self):
        content_length = int(self.headers.get('Content-Length', 0))
        body = self.rfile.read(content_length)
        data = json.loads(body)

        asyncio.run(self.process_update(data))

        self.send_response(200)
        self.send_header('Content-type', 'application/json')
        self.end_headers()
        self.wfile.write(json.dumps({"ok": True}).encode())

    async def process_update(self, data):
        update = types.Update(**data)
        await dp.feed_update(bot, update)

    def do_GET(self):
        self.send_response(200)
        self.send_header('Content-type', 'text/plain')
        self.end_headers()
        self.wfile.write(b"Rugrein Bot Webhook OK")
