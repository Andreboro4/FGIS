#!/usr/bin/env python3
# ═══════════════════════════════════════════════════════════════
# Помощник по ФГИС — Telegram Bot с Webhook (не засыпает, не нужен сервер)
# ═══════════════════════════════════════════════════════════════
#
# Этот бот работает через webhook + serverless-функции.
# Можно бесплатно разместить на:
#   • Vercel (serverless functions)
#   • Cloudflare Workers
#   • Netlify Functions
#   • AWS Lambda
#
# НИКАКОГО RENDER/СЕРВЕРА НЕ НУЖНО!
#
# ═══════════════════════════════════════════════════════════════

import os
import json
import asyncio
from urllib.parse import parse_qsl

from aiogram import Bot, Dispatcher, Router, types
from aiogram.filters import CommandStart, Command
from aiogram.types import WebAppInfo, InlineKeyboardMarkup, InlineKeyboardButton, MenuButtonWebApp
from aiogram.enums import ParseMode

# ── Config ────────────────────────────────────────────────────
BOT_TOKEN = os.getenv("BOT_TOKEN", "YOUR_BOT_TOKEN_HERE")
WEBAPP_URL = os.getenv("WEBAPP_URL", "https://your-domain.com")

bot = Bot(token=BOT_TOKEN, parse_mode=ParseMode.HTML)
dp = Dispatcher()
router = Router()

# ── Commands ────────────────────────────────────────────────────
@router.message(CommandStart())
async def cmd_start(message: types.Message):
    kb = InlineKeyboardMarkup(inline_keyboard=[
        [InlineKeyboardButton(
            text="🌾 Открыть Помощник по ФГИС",
            web_app=WebAppInfo(url=WEBAPP_URL)
        )]
    ])
    await message.answer(
        "👋 <b>Добро пожаловать в Помощник по ФГИС!</b>\n\n"
        "🌾 Помощник по системам ЕФГИС ЗСН, ФГИС «Зерно», «Семеноводство» и «Сатурн» для аграриев.\n"
        "📋 Задачи, маршрут, документы и AI-консультант — всё в одном месте.\n\n"
        "Нажмите кнопку ниже, чтобы открыть приложение:",
        reply_markup=kb
    )

@router.message(Command("help"))
async def cmd_help(message: types.Message):
    await message.answer(
        "<b>📖 Справка по Помощнику по ФГИС</b>\n\n"
        "/start — открыть Mini App\n"
        "/help — эта справка\n"
        "/about — о проекте\n\n"
        "<b>Возможности:</b>\n"
        "• 🌍 Задачи и сроки по ЕФГИС ЗСН\n"
        "• 🌾 Партии и декларации в ФГИС «Зерно»\n"
        "• 🌱 Апробация и учёт семян в «Семеноводстве»\n"
        "• 🧪 Планы и акты применения ПАТ в «Сатурне»\n"
        "• 🤖 AI-консультант и хранение документов"
    )

@router.message(Command("about"))
async def cmd_about(message: types.Message):
    await message.answer(
        "<b>🌾 Помощник по ФГИС</b>\n\n"
        "Приложение для аграриев, упрощающее работу с ЕФГИС ЗСН, ФГИС «Зерно», "
        "«Семеноводство» и «Сатурн».\n\n"
        "<b>Разработано:</b> 2026\n"
        "<b>Версия:</b> 1.0.0"
    )

# ── Web App Data Handler ──────────────────────────────────────
@router.message()
async def web_app_data_handler(message: types.Message):
    """Обработка данных из Mini App"""
    if message.web_app_data:
        try:
            data = json.loads(message.web_app_data.data)
            action = data.get("action")
            if action == "task_done":
                await message.answer(f"✅ Задача отмечена выполненной!")
            elif action == "new_org":
                await message.answer(
                    f"🏢 Добавлена организация: <b>{data.get('name')}</b>\n"
                    f"ИНН: <code>{data.get('inn')}</code>"
                )
            else:
                await message.answer(f"📨 Получены данные из Mini App")
        except Exception as e:
            pass

# ── Vercel Serverless Handler ─────────────────────────────────
# Эта функция вызывается Vercel при каждом webhook-запросе от Telegram

async def handle_webhook(request_body: dict):
    """Обработчик webhook-запросов от Telegram"""
    update = types.Update(**request_body)
    await dp.feed_update(bot, update)

# Для локального тестирования (polling)
async def main():
    dp.include_router(router)
    await bot.delete_webhook(drop_pending_updates=True)
    await dp.start_polling(bot)

if __name__ == "__main__":
    asyncio.run(main())
