# Отчёт поста МТП Махачкала (PWA)

Мобильное веб-приложение для загрузки фото сменных форм, распознавания (OCR) и структурированных оперативных отчётов поста.

## Разработка

```bash
cd post-report
npm install
env -u DATABASE_URL npm run dev
```

Откройте [http://127.0.0.1:3000](http://127.0.0.1:3000).

Без переменной `DATABASE_URL` используется встроенная PGlite (данные в `.pglite/`). Для общей Postgres укажите `DATABASE_URL` в окружении.

### Первый вход (bootstrap)

Пока в БД нет кода поста, на экране входа можно **один раз** задать код. В dev после `node scripts/seed-dev.mjs` код по умолчанию — **`posta`** (или значение `POST_CODE`).

Дальнейшие входы — только с уже сохранённым кодом поста.

## OCR

| Переменная | Значение | Описание |
| --- | --- | --- |
| `OCR_PROVIDER` | `fixture` (по умолчанию) | Текст из `fixtures/sample-ocr.txt` — стабильно для тестов |
| `OCR_PROVIDER` | `openai` | Требуется `OPENAI_API_KEY` (vision в v1 не реализован) |

Тесты всегда работают через `fixture`, без внешних API.

## Сборка и тесты

```bash
env -u DATABASE_URL npm test
env -u DATABASE_URL npm run build
env -u DATABASE_URL npm run start
```

## Публикация (Cursor Apps)

В `cursor-app.json` объявлена привязка **`"database": "postgres"`** — на хостинге Cursor используется управляемая Postgres. Локально для разработки снимайте `DATABASE_URL`, как в скриптах `package.json`.

PWA: `public/manifest.webmanifest`, иконка `public/icons/icon-192.png`, метаданные Apple Web App в `src/app/layout.tsx`.