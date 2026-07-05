#!/usr/bin/env python3
# ═══════════════════════════════════════════════════════════════
# Помощник по ФГИС — Telegram Bot для Mini App
# ═══════════════════════════════════════════════════════════════

import os
import json
from aiogram import Bot, Dispatcher, Router, types, F
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
    """Приветствие + кнопка открытия Mini App"""
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
@router.message(F.web_app_data)
async def web_app_data(message: types.Message):
    """Обработка данных, отправленных из Mini App"""
    try:
        data = json.loads(message.web_app_data.data)
        action = data.get("action")

        if action == "task_done":
            task_id = data.get("task_id")
            await message.answer(f"✅ Задача <code>{task_id}</code> отмечена выполненной!")

        elif action == "new_org":
            org_name = data.get("name")
            org_inn = data.get("inn")
            await message.answer(
                f"🏢 Добавлена организация:\n"
                f"<b>{org_name}</b>\n"
                f"ИНН: <code>{org_inn}</code>"
            )

        elif action == "support":
            text = data.get("text", "")
            await message.answer(
                f"📩 <b>Обращение в поддержку</b>\n\n"
                f"<i>{text}</i>\n\n"
                f"Мы ответим вам в ближайшее время."
            )

        else:
            await message.answer(f"📨 Получены данные: <code>{message.web_app_data.data}</code>")

    except Exception as e:
        await message.answer(f"⚠️ Ошибка обработки данных: {e}")

# ── Init ──────────────────────────────────────────────────────
async def set_menu_button():
    """Установка кнопки меню для быстрого доступа к Mini App"""
    await bot.set_chat_menu_button(
        menu_button=MenuButtonWebApp(
            text="🌾 Помощник по ФГИС",
            web_app=WebAppInfo(url=WEBAPP_URL)
        )
    )

async def main():
    dp.include_router(router)
    await set_menu_button()
    await dp.start_polling(bot)

if __name__ == "__main__":
    import asyncio
    asyncio.run(main())
