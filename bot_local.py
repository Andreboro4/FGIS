#!/usr/bin/env python3
# -*- coding: utf-8 -*-
# Помощник по ФГИС — Telegram-бот (локальный запуск)

import asyncio
import json

from aiogram import Bot, Dispatcher, Router, types
from aiogram.filters import CommandStart, Command
from aiogram.types import WebAppInfo, InlineKeyboardMarkup, InlineKeyboardButton
from aiogram.enums import ParseMode
from aiogram.client.default import DefaultBotProperties

# ========== ВСТАВЬ СВОИ ДАННЫЕ ==========
# ВАЖНО: никогда не публикуйте и не заливайте в открытый репозиторий реальный токен бота.
# Получить токен: @BotFather -> /newbot (или /token для существующего бота).
BOT_TOKEN = "8819615980:AAGEe-LYqEIB4j5gJnHj6q_fYZBb1KHM1pY"
WEBAPP_URL = "https://your-domain.example"
# ========================================

bot = Bot(
    token=BOT_TOKEN,
    default=DefaultBotProperties(parse_mode=ParseMode.HTML)
)
dp = Dispatcher()
router = Router()


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
        "🌾 Помощник по системам ЕФГИС ЗСН, ФГИС «Зерно», «Семеноводство» и «Сатурн» для аграриев.\n\n"
        "Нажмите кнопку ниже, чтобы открыть приложение:",
        reply_markup=kb
    )


@router.message(Command("help"))
async def cmd_help(message: types.Message):
    await message.answer(
        "<b>📖 Справка по Помощнику по ФГИС</b>\n\n"
        "/start — открыть Mini App\n"
        "/help — эта справка\n"
        "/about — о проекте"
    )


@router.message(Command("about"))
async def cmd_about(message: types.Message):
    await message.answer("<b>🌾 Помощник по ФГИС</b>\nВерсия: 1.0.0")


@router.message()
async def web_app_data_handler(message: types.Message):
    if message.web_app_data:
        try:
            data = json.loads(message.web_app_data.data)
            action = data.get("action")
            if action == "task_done":
                await message.answer("✅ Задача отмечена выполненной!")
            elif action == "new_org":
                await message.answer(f"🏢 Добавлена организация: <b>{data.get('name')}</b>")
            else:
                await message.answer("📨 Получены данные из Mini App")
        except Exception:
            pass


dp.include_router(router)


async def main():
    print("=" * 40)
    print("Помощник по ФГИС — бот запущен!")
    print("=" * 40)
    print("URL:", WEBAPP_URL)
    print("Ctrl+C для остановки")
    print("=" * 40)
    await bot.delete_webhook(drop_pending_updates=True)
    await dp.start_polling(bot)


if __name__ == "__main__":
    asyncio.run(main())
