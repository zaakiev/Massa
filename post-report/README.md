# Отчёт поста МТП Махачкала (PWA)

Мобильное веб-приложение для загрузки фото сменных форм, распознавания (OCR) и структурированных оперативных отчётов поста.

## Разработка

```bash
cd post-report
npm install
env -u DATABASE_URL npm run dev
```

Откройте [http://127.0.0.1:3000](http://127.0.0.1:3000).

### База данных

| Окружение | Поведение |
| --- | --- |
| **Без `DATABASE_URL`** | В процессе Node держится **in-memory PGlite** (миграции на старте). Данные **сбрасываются при перезапуске** сервера. |
| **С `DATABASE_URL`** | Postgres (обязательно для production и публикации). |

Для общей Postgres укажите `DATABASE_URL` в окружении. В production задайте также `SESSION_SECRET` (подпись session cookie).

### Первый запуск (bootstrap)

Пока в БД нет записи `post_settings`, на `/login` появляется форма **«Создать код поста»** (проверка `GET /api/auth/status` → `{ configured: false }`).

1. Введите новый код и нажмите **«Создать и войти»** — `POST /api/auth/bootstrap`, затем вход.
2. Смены 1–4 создаются автоматически при первом успешном входе, если справочник пуст.

В dev можно заранее посеять код через `node scripts/seed-dev.mjs` (по умолчанию **`posta`**, или `POST_CODE`).

### Сессия

Cookie `post_session` — HMAC-SHA256 от `code_hash` с `SESSION_SECRET`. Смена кода поста в настройках инвалидирует старые сессии.

## OCR

| Переменная | Значение | Описание |
| --- | --- | --- |
| `OCR_PROVIDER` | `fixture` (по умолчанию) | Текст из `fixtures/sample-ocr.txt` — стабильно для тестов |
| `OCR_PROVIDER` | `openai` | Требуется `OPENAI_API_KEY` (**полный vision OCR не реализован**) |

Тесты всегда работают через `fixture`, без внешних API.

## Фото отчётов

Загрузка: до **8 МБ** на файл (`recognize`, создание отчёта).

Просмотр сохранённых снимков (после авторизации):

`GET /api/reports/{id}/photos/{page}` — JPEG со диска `uploads/{id}/`.

## Сборка и тесты

```bash
env -u DATABASE_URL npm test
env -u DATABASE_URL npm run build
env -u DATABASE_URL npm run start
```

## Публикация (Cursor Apps)

В `cursor-app.json` объявлена привязка **`"database": "postgres"`** — на хостинге Cursor используется управляемая Postgres. Локально для быстрых прогонов можно снимать `DATABASE_URL`, как в скриптах `package.json`.

PWA: `public/manifest.webmanifest`, иконка `public/icons/icon-192.png`, метаданные Apple Web App в `src/app/layout.tsx`. **Service worker / офлайн** — не реализованы (следующий этап).

## Запланировано (не в этой версии)

- Полный OpenAI vision OCR (сейчас fixture по умолчанию)
- Редактирование всех секций карточки отчёта после сохранения
- `TablesPanel` для каждой пустой секции формы
- Service worker и офлайн-режим