# Schedule Viewer

Веб-приложение для просмотра университетского расписания по группе или преподавателю. Данные загружаются из внешнего REST API с Bearer-авторизацией.

**Стек:** Vue 3 · TypeScript · Vite · Vuetify 3

## Возможности

- Поиск расписания по группе или преподавателю
- Фильтрация групп по курсу и уровню обучения
- Навигация по неделям с отображением чётности (чётная/нечётная)
- Адаптивный вид: недельная сетка на десктопе, список по дням на мобильных
- История последних просмотренных расписаний (localStorage)
- Кэширование списков групп и преподавателей на 1 день

## Быстрый старт

```bash
npm install
npm run dev        # dev-сервер на http://localhost:5173
npm run build      # продакшн-сборка в dist/
npm run preview    # предпросмотр собранного приложения
```

## Настройка

Создайте файл `.env` в корне проекта:

```env
VITE_API_BASE_URL=https://api.myimsit.ru/schedule/
VITE_API_TOKEN=your_bearer_token_here
```

В dev-режиме запросы к API проксируются через Vite — CORS обходится автоматически. В продакшне используется прямой запрос по `VITE_API_BASE_URL`.

## Структура проекта

```
src/
├── api/
│   ├── client.ts          # HTTP-клиент (Authorization: Bearer)
│   ├── config.ts          # Загрузка переменных окружения
│   └── schedule.ts        # Запросы к эндпоинтам расписания
├── components/
│   ├── common/            # Loader, ErrorMessage
│   ├── filters/           # EntitySearch — поиск с фильтрами и кэшем
│   ├── layout/            # AppHeader, AppFooter
│   └── schedule/          # ScheduleGrid, ScheduleList, WeekSwitcher, DateWeekPicker
├── hooks/
│   └── useSchedule.ts     # Загрузка расписания, навигация, состояние
├── pages/
│   ├── HomePage.vue
│   ├── GroupSchedulePage.vue
│   └── TeacherSchedulePage.vue
├── types/
│   └── schedule.ts        # TypeScript-интерфейсы API
└── utils/
    └── date.ts            # Утилиты для дат, чётности недели, форматирования
```

## API

Все запросы требуют заголовок `Authorization: Bearer {token}`.

| Метод | Эндпоинт | Описание |
|---|---|---|
| GET | `/api/v1/groups/search?course=&level=` | Поиск групп |
| GET | `/api/v1/groups/schedule?group=&weekCount=&date=` | Расписание группы |
| GET | `/api/v1/teachers/search?department=` | Поиск преподавателей |
| GET | `/api/v1/teachers/schedule?teacher=&weekCount=&date=` | Расписание преподавателя |
| GET | `/api/v1/configuration/week` | Текущая чётность недели (1 или 2) |

## Поток данных

1. Пользователь выбирает группу/преподавателя на главной странице
2. Переход на страницу расписания
3. `useSchedule` загружает данные через API и трансформирует их
4. `ScheduleGrid` (десктоп) или `ScheduleList` (мобильные) отображают результат
5. `WeekSwitcher` / `DateWeekPicker` управляют навигацией по неделям
