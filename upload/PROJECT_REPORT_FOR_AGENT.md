# КРЕСТИКИ-НОЛИКИ ОНЛАЙН — ФИНАЛЬНЫЙ ОТЧЁТ ДЛЯ AGENT

> **Документ для AI-агента, который продолжит работу над проектом.**
> Содержит полное описание проекта, API-ключи, архитектуру и инструкцию по внесению изменений.

---

## 0. КРАТКАЯ СПРАВКА (прочитай первым делом)

| Параметр | Значение |
|----------|----------|
| **Проект** | Онлайн-игра «Крестики-Нолики» с мультиплеером, чатом, ботами |
| **Production URL** | https://web-production-1a709.up.railway.app |
| **GitHub repo** | https://github.com/ZEPO228/tic-tac-toe-online |
| **Ветка** | `main` |
| **Видимость репо** | PUBLIC |
| **Tech stack** | Next.js 16 + TypeScript + Tailwind CSS 4 + shadcn/ui + Prisma + PostgreSQL + Socket.io + Docker |
| **Версия** | 2.1.2 |
| **Статус** | Production-ready, задеплоено на Railway |

---

## 1. API КЛЮЧИ И ДОСТУПЫ

### 1.1. GitHub (через gh CLI или git)

**Personal Access Token (PAT):**
```
__GITHUB_PAT_PLACEHOLDER__
```

- Владелец: `ZEPO228` (DDR_ZIK)
- Scopes: полный набор (repo, workflow, admin:org, admin:enterprise, copilot, codespace, gist, notifications, delete_repo, user, project, write:packages, read:packages)
- Срок: ~90 дней (до сентября 2026)

**Использование:**
```bash
# Клонирование
git clone https://github.com/ZEPO228/tic-tac-toe-online.git

# Настройка auth (если не сделано)
gh auth login --with-token <<< "ВСТАВЬ_СЮДА_GITHUB_PAT"
# ИЛИ
gh auth setup-git

# Пуш
git push origin main
```

**Git config пользователя:**
```
Name: DDR_ZIK
Email: zilinskasstas777@gmail.com
```

### 1.2. Railway (GraphQL API)

**Railway API Token:**
```
__RAILWAY_TOKEN_PLACEHOLDER__
```

- Workspace: `DDR_ZIK's Projects` (id: `4a9dc24a-af4e-45c4-8aff-1dbfed26fc2d`)
- Project: `tic-tac-toe-online` (id: `c4e20a11-5516-48f9-8d23-a6fcc32fd2c4`)
- Environment: `production` (id: `afae6e67-f3f8-4a11-ab61-b47eb032e4e4`)

**Сервисы:**
| Сервис | ID |
|--------|-----|
| `web` (Next.js) | `8c8e6b25-d17c-4b8d-9474-88cb24a301a4` |
| `postgres` (PostgreSQL 16) | `14ce0443-026b-46ac-9c47-1d406cc7e39e` |

**Domains:**
- Web: `https://web-production-1a709.up.railway.app`
- PostgreSQL: `postgres-production-f9d4d.up.railway.app` (внутренний)

**Environment variables:**

| Variable | Service | Value |
|----------|---------|-------|
| `PORT` | web | `3000` |
| `NODE_ENV` | web | `production` |
| `JWT_SECRET` | web | `railway-ttt-jwt-secret-2026-very-secure` |
| `DATABASE_URL` | web | `postgresql://ttt_user:ttt_secure_pass_2026@postgres:5432/tic_tac_toe` |
| `POSTGRES_USER` | postgres | `ttt_user` |
| `POSTGRES_PASSWORD` | postgres | `ttt_secure_pass_2026` |
| `POSTGRES_DB` | postgres | `tic_tac_toe` |

**Использование Railway GraphQL API:**
```bash
TOKEN="ВСТАВЬ_СЮДА_RAILWAY_TOKEN"
PROJECT_ID="c4e20a11-5516-48f9-8d23-a6fcc32fd2c4"
ENV_ID="afae6e67-f3f8-4a11-ab61-b47eb032e4e4"
WEB_SERVICE_ID="8c8e6b25-d17c-4b8d-9474-88cb24a301a4"

# Триггер деплоя
curl -s -X POST https://backboard.railway.com/graphql/v2 \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"query\":\"mutation { environmentTriggersDeploy(input: { projectId: \\\"$PROJECT_ID\\\", environmentId: \\\"$ENV_ID\\\", serviceId: \\\"$WEB_SERVICE_ID\\\" }) }\"}"

# Проверка статуса деплоев
curl -s -X POST https://backboard.railway.com/graphql/v2 \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"query\":\"{ project(id: \\\"$PROJECT_ID\\\") { deployments { edges { node { id status service { name } } } } } }\"}"
```

---

## 2. ЧТО ЭТО ЗА ПРОЕКТ

### 2.1. Описание

«Крестики-Нолики Онлайн» — это полноценная браузерная игра с:

- **Регистрацией/входом** (username + password, bcrypt + JWT cookies)
- **Галереей аватаров** (24 пресета + загрузка своего фото через base64)
- **Главным меню** с эффектной cinematic-анимацией (карточки прилетают из разных направлений)
- **Матчмейкингом** с крутой анимацией поиска (20с → кнопка «сыграть с ботом»)
- **Игрой с ботом** (minimax AI, medium сложность, через HTTP API для надёжности)
- **Мультиплеером** (Socket.io, реальный матчмейкинг между игроками)
- **Игровым полем**: карточка противника сверху, поле 3×3 в центре, карточка игрока снизу
- **Глобальным чатом** (real-time через Socket.io, история сохраняется в БД)
- **Личными чатами** (Direct Messages, клик по аватару → профиль, удаление чата)
- **Таблицей лидеров** с подиумом (топ-3) и онлайн/офлайн статусом
- **Просмотром профиля** любого игрока (статистика, дата регистрации, статус)
- **Профиль пользователя** (статистика, редактор аватара, винрейт)
- **Настройками** с переключателем темы (тёмная/светлая/системная)
- **Mobile-first** дизайн с оптимизацией под Android Chrome

### 2.2. Целевая аудитория

Игроки на мобильных и ПК, которые хотят быстро сыграть в крестики-нолики онлайн.

### 2.3. Текущая статистика (на момент отчёта)

- Зарегистрировано пользователей: **6**
- Сыграно игр: **0** (мультиплеер не тестировался с 2+ игроками одновременно, бот-игры не записываются как Game в БД)
- Деплоев на Railway: ~60 (из них 3 SUCCESS, остальные REMOVED/FAILED)

---

## 3. ТЕХНИЧЕСКАЯ АРХИТЕКТУРА

### 3.1. Tech Stack

| Слой | Технология |
|------|------------|
| **Frontend** | Next.js 16 (App Router) + React 19 + TypeScript 5 |
| **Styling** | Tailwind CSS 4 + shadcn/ui (New York style) + Framer Motion |
| **Backend** | Next.js API Routes (REST) + Socket.io (real-time) |
| **Database** | PostgreSQL 16 (Railway) + Prisma ORM 6 |
| **Auth** | bcryptjs + jsonwebtoken (JWT в httpOnly cookies) |
| **Real-time** | Socket.io (polling transport — Railway WebSocket нестабилен) |
| **Деплой** | Railway (Docker-контейнер) |
| **Runtime** | Bun (для dev и production server) |

### 3.2. Структура проекта

```
tic-tac-toe-online/
├── prisma/
│   └── schema.prisma              # Модели: User, Game, Message, DirectMessage
├── public/
│   ├── manifest.json              # PWA manifest
│   └── logo.svg
├── src/
│   ├── app/
│   │   ├── layout.tsx             # Root layout + theme script + fixed-bg div
│   │   ├── page.tsx               # Main page (view router)
│   │   ├── globals.css            # Все стили + тема + scroll optimization
│   │   └── api/
│   │       ├── auth/
│   │       │   ├── login/route.ts
│   │       │   ├── logout/route.ts
│   │       │   ├── me/route.ts
│   │       │   └── register/route.ts
│   │       ├── players/
│   │       │   ├── route.ts       # Список игроков (топ-50)
│   │       │   └── [id]/route.ts  # Профиль конкретного игрока
│   │       ├── profile/route.ts   # Свой профиль (GET + PATCH avatar)
│   │       ├── stats/route.ts     # Общая статистика
│   │       ├── debug/route.ts     # Debug endpoint
│   │       ├── avatar/
│   │       │   └── upload/route.ts # Загрузка кастомного аватара (base64)
│   │       ├── game/
│   │       │   └── bot-move/route.ts # HTTP API для игры с ботом
│   │       └── direct-messages/
│   │           ├── send/route.ts
│   │           ├── [userId]/route.ts
│   │           ├── contacts/route.ts
│   │           └── delete/route.ts
│   ├── components/
│   │   ├── game/
│   │   │   ├── AnimatedLogo.tsx       # Анимированные ✕⭕
│   │   │   ├── AvatarDisplay.tsx      # Унифицированный рендер аватара
│   │   │   ├── AvatarGallery.tsx      # Галерея + загрузка
│   │   │   ├── ChatView.tsx           # Глобальный чат
│   │   │   ├── GameView.tsx           # Игровое поле
│   │   │   ├── LoginView.tsx
│   │   │   ├── MatchmakingView.tsx    # Анимация поиска
│   │   │   ├── MenuView.tsx           # Главное меню (cinematic анимация)
│   │   │   ├── PlayerProfileView.tsx  # Просмотр профиля другого игрока
│   │   │   ├── PlayersView.tsx        # Таблица лидеров
│   │   │   ├── PrivateChatView.tsx    # Личная переписка
│   │   │   ├── PrivateChatsView.tsx   # Список контактов
│   │   │   ├── ProfileView.tsx        # Свой профиль
│   │   │   ├── RegisterView.tsx
│   │   │   ├── SettingsView.tsx       # Настройки + тема
│   │   │   └── ToastContainer.tsx     # Toast уведомления
│   │   └── ui/                        # shadcn/ui компоненты
│   └── lib/
│       ├── auth.ts                # bcrypt + JWT + cookies
│       ├── avatars.ts             # 24 пресета + helpers
│       ├── bot.ts                 # Minimax AI для бота
│       ├── cookies.ts             # Client-side cookie utils
│       ├── db.ts                  # Prisma client
│       ├── socket-client.ts       # Socket.io client
│       ├── socket-server.ts       # Socket.io server (matchmaking, DM, chat)
│       ├── store.ts               # Zustand store (views, user, messages)
│       ├── use-theme.ts           # Theme hook (dark/light/system)
│       └── utils.ts               # cn() helper
├── Dockerfile                     # Docker для Railway
├── railway.json                   # Railway config
├── server.ts                      # Production server (Next.js + Socket.io на одном порту)
├── package.json
├── next.config.ts
└── tailwind.config.ts
```

### 3.3. Prisma Schema

```prisma
model User {
  id            String   @id @default(cuid())
  username      String   @unique
  password      String
  avatar        String   @default("avatar-1")  // "avatar-1".."avatar-24" или "custom"
  customAvatar  String?  // Base64 data URI если avatar === "custom"
  gamesPlayed   Int      @default(0)
  gamesWon      Int      @default(0)
  gamesLost     Int      @default(0)
  gamesDraw     Int      @default(0)
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt
  // ... relations
}

model Game {
  id            String   @id @default(cuid())
  player1Id     String
  player2Id     String?
  isVsBot       Boolean  @default(false)
  status        String   @default("active")  // "active" | "finished"
  winner        String?  // "player1" | "player2" | "draw"
  board         String   @default("[\"\",\"\",\"\",\"\",\"\",\"\",\"\",\"\",\"\"]")
  currentTurn   String   @default("X")
  // ...
}

model Message {  // Глобальный чат
  id        String   @id @default(cuid())
  userId    String?
  username  String
  avatar    String
  text      String
  createdAt DateTime @default(now())
}

model DirectMessage {  // Личные сообщения
  id           String   @id @default(cuid())
  senderId     String
  recipientId  String
  text         String
  read         Boolean  @default(false)
  createdAt    DateTime @default(now())
  @@index([senderId, recipientId, createdAt])
  @@index([recipientId, senderId, createdAt])
}
```

### 3.4. Real-time архитектура

- **Socket.io** на том же порту что и Next.js (через `server.ts`)
- **Transport:** polling only (Railway WebSocket нестабилен, были обрывы)
- **Events:**
  - `queue_join` / `queue_leave` — матчмейкинг
  - `match_found` — найден соперник
  - `game_move` — ход в мультиплеерной игре
  - `game_state` — обновление доски
  - `chat_message` / `chat_history` — глобальный чат
  - `dm_send` / `dm_message` — личные сообщения
  - `online_count` / `online_users` — онлайн статус

**Важно:** Бот-игра использует **HTTP API** (`/api/game/bot-move`), а не Socket.io, для надёжности.

---

## 4. КАК ВНЕСТИ ИЗМЕНЕНИЯ

### 4.1. Локальная разработка

```bash
# 1. Клонировать
git clone https://github.com/ZEPO228/tic-tac-toe-online.git
cd tic-tac-toe-online

# 2. Установить зависимости
bun install

# 3. Настроить .env
echo 'DATABASE_URL="file:./db/custom.db"' > .env
echo 'JWT_SECRET="dev-secret"' >> .env

# 4. Применить схему (SQLite локально)
bun run db:push

# 5. Запустить dev сервер
bun run dev
# Откроется на http://localhost:3000
```

**Важно:** Prisma schema использует `postgresql` provider. Для локальной разработки на SQLite нужно временно поменять на `sqlite`, либо поднять локальный PostgreSQL.

### 4.2. Внести код → запушить → задеплоить

```bash
# 1. Внести изменения в код
# 2. Коммит
git add -A
git commit -m "feat: описание изменения"

# 3. Пуш на GitHub
git push origin main

# 4. Триггер деплоя на Railway (через GraphQL API)
TOKEN="ВСТАВЬ_СЮДА_RAILWAY_TOKEN"
PROJECT_ID="c4e20a11-5516-48f9-8d23-a6fcc32fd2c4"
ENV_ID="afae6e67-f3f8-4a11-ab61-b47eb032e4e4"
WEB_SERVICE_ID="8c8e6b25-d17c-4b8d-9474-88cb24a301a4"

curl -s -X POST https://backboard.railway.com/graphql/v2 \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"query\":\"mutation { environmentTriggersDeploy(input: { projectId: \\\"$PROJECT_ID\\\", environmentId: \\\"$ENV_ID\\\", serviceId: \\\"$WEB_SERVICE_ID\\\" }) }\"}"

# 5. Подождать ~90 секунд (Docker build + deploy)
# 6. Проверить статус
curl -s -X POST https://backboard.railway.com/graphql/v2 \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"query\":\"{ project(id: \\\"$PROJECT_ID\\\") { deployments { edges { node { id status service { name } } } } } }\"}"
```

### 4.3. Изменение Prisma schema

Если меняешь схему БД:
1. Отредактируй `prisma/schema.prisma`
2. Запушь на GitHub
3. При деплое `server.ts` автоматически запустит `npx prisma db push --accept-data-loss`
4. БД обновится при старте контейнера

### 4.4. Изменение environment variables

```bash
TOKEN="ВСТАВЬ_СЮДА_RAILWAY_TOKEN"
PROJECT_ID="c4e20a11-5516-48f9-8d23-a6fcc32fd2c4"
ENV_ID="afae6e67-f3f8-4a11-ab61-b47eb032e4e4"
WEB_SERVICE_ID="8c8e6b25-d17c-4b8d-9474-88cb24a301a4"

# Установить переменную
curl -s -X POST https://backboard.railway.com/graphql/v2 \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"query\":\"mutation { variableUpsert(input: { projectId: \\\"$PROJECT_ID\\\", environmentId: \\\"$ENV_ID\\\", serviceId: \\\"$WEB_SERVICE_ID\\\", name: \\\"NEW_VAR\\\", value: \\\"value\\\" }) }\"}"

# Удалить переменную
curl -s -X POST https://backboard.railway.com/graphql/v2 \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"query\":\"mutation { variableDelete(input: { projectId: \\\"$PROJECT_ID\\\", environmentId: \\\"$ENV_ID\\\", serviceId: \\\"$WEB_SERVICE_ID\\\", name: \\\"VAR_NAME\\\" }) }\"}"
```

---

## 5. ИЗВЕСТНЫЕ ПРОБЛЕМЫ И ОГРАНИЧЕНИЯ

### 5.1. Мультиплеер (игрок vs игрок)

- Socket.io на Railway работает нестабильно (WebSocket обрывается)
- Transport: polling only (медленнее чем WebSocket)
- Реальный мультиплеер между двумя игроками редко тестировался
- **Решение:** бот-игра через HTTP API работает надёжно

### 5.2. Производительность мобильного скролла

- **Исправлено:** убран `background-attachment: fixed` (главная причина лагов)
- **Исправлено:** убран `backdrop-blur` с прокручиваемых элементов
- **Исправлено:** добавлен `position: fixed` div для фона (`fixed-bg`)
- **Исправлено:** `transform: translateZ(0)` + `contain: layout style` на scroll containers
- Если лаги вернутся — проверить новые элементы с `backdrop-filter` или `background-attachment: fixed`

### 5.3. Кастомные аватары

- Хранятся как base64 data URI в БД (поле `customAvatar`)
- Лимит: 1.5MB (2MB base64 string)
- Поддерживаемые форматы: JPEG, PNG, WebP
- Не оптимизируются (можно добавить sharp для ресайза)

### 5.4. Theme switching

- По умолчанию: **тёмная** тема
- 3 режима: dark / light / system
- Хранится в `localStorage['ttt_theme']`
- FOUC prevention через inline script в `<head>`

---

## 6. КЛЮЧЕВЫЕ ФАЙЛЫ ДЛЯ ПОНИМАНИЯ

### 6.1. `src/lib/store.ts` — Zustand store
- Управляет: user, view (router), currentMatch, gameState, messages, contacts, onlineUserIds
- View names: `login`, `register`, `menu`, `matchmaking`, `game`, `profile`, `settings`, `players`, `chat`, `player-profile`, `private-chats`, `private-chat`

### 6.2. `src/lib/socket-server.ts` — Socket.io server
- In-memory: `onlinePlayers`, `queue`, `activeGames`, `recentMessages`
- Загружает последние 50 сообщений из БД при старте
- Обрабатывает: matchmaking, game moves, chat, direct messages
- Bot AI: `getBestMove()` с minimax алгоритмом

### 6.3. `src/app/page.tsx` — Главный router
- Проверяет auth при загрузке
- Инициализирует Socket.io connection
- Рендерит view в зависимости от `store.view`

### 6.4. `server.ts` — Production server
- Next.js + Socket.io на одном порту (3000)
- При старте запускает `npx prisma db push` (обновляет схему БД)
- Используется в Docker-контейнере на Railway

### 6.5. `src/app/globals.css` — Все стили
- CSS variables для dark/light темы
- `.gradient-bg` — градиентный фон (без `background-attachment: fixed`)
- `.fixed-bg` — фиксированный фон (GPU-accelerated)
- Scroll optimization: `contain`, `transform: translateZ(0)`, `overscroll-behavior`
- Touch optimization: `touch-action: manipulation` на кнопках

---

## 7. API ENDPOINTS СПРАВКА

### Auth
- `POST /api/auth/register` — регистрация (username, password, avatar)
- `POST /api/auth/login` — вход
- `POST /api/auth/logout` — выход
- `GET /api/auth/me` — текущий пользователь

### Profile
- `GET /api/profile` — свой профиль со статистикой
- `PATCH /api/profile` — обновить аватар (preset)

### Avatar
- `POST /api/avatar/upload` — загрузить кастомный аватар (base64)

### Players
- `GET /api/players` — топ-50 игроков
- `GET /api/players/[id]` — профиль конкретного игрока

### Game
- `POST /api/game/bot-move` — игра с ботом (action: create/move/state)

### Direct Messages
- `POST /api/direct-messages/send` — отправить ЛС
- `GET /api/direct-messages/[userId]` — история переписки
- `GET /api/direct-messages/contacts` — список контактов
- `POST /api/direct-messages/delete` — удалить чат

### Stats
- `GET /api/stats` — общая статистика (totalUsers, totalGames, activeGames)
- `GET /api/debug` — debug info

---

## 8. БЕЗОПАСНОСТЬ

⚠️ **Важно для нового агента:**

1. **API ключи в этом отчёте — реальные.** Не коммить их в код.
2. **JWT_SECRET** сейчас хардкожен в env var — для production лучше использовать секреты Railway.
3. **Cookies** — `httpOnly: false` (нужно для client-side socket.io auth). Это менее безопасно, но необходимо для текущей архитектуры.
4. **CORS** — `origin: '*'` на Socket.io. Для production лучше ограничить.
5. **Rate limiting** — не реализован. Если будет спам, добавить на API routes.
6. **Input validation** — базовая (zod не используется, но есть проверки в route handlers).

---

## 9. ЧЕКЛИСТ ДЛЯ НОВОГО АГЕНТА

Перед началом работы:

- [ ] Прочитал этот отчёт полностью
- [ ] Проверил что GitHub token работает: `gh auth status`
- [ ] Проверил что Railway API работает (curl запрос me)
- [ ] Открыл https://web-production-1a709.up.railway.app — сайт работает?
- [ ] Понимает структуру проекта (раздел 3.2)
- [ ] Знает как деплоить (раздел 4.2)

---

## 10. КОНТАКТЫ И ИСТОРИЯ

- **Владелец проекта:** DDR_ZIK (GitHub: ZEPO228, email: zilinskasstas777@gmail.com)
- **Создан:** 21 июня 2026
- **Версия:** 2.1.2
- **Коммитов:** 26+
- **Предыдущий агент:** GLM (Z.ai) — построил весь проект с нуля

**Ссылки:**
- Production: https://web-production-1a709.up.railway.app
- GitHub: https://github.com/ZEPO228/tic-tac-toe-online
- Railway dashboard: https://railway.com/project/c4e20a11-5516-48f9-8d23-a6fcc32fd2c4

---

**Конец отчёта.** Если есть вопросы — проверь код в репозитории, там всё прокомментировано.
