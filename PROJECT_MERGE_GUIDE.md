# Руководство по сборке в один рабочий проект

## Цель

Собрать из backend + 3 frontend-веток один цельный интеграционный проект, который работает стабильно и без конфликтов данных.

Важно: нельзя просто слить всё в `main` без подготовки. Сначала нужно зафиксировать общий контракт, затем объединить одну общую frontend-оболочку, и только после этого встраивать ветки по функциям.

## 1. Принцип объединения

Проект должен собираться в следующем виде:

- `backend` — один сервер, один API contract
- `frontend` — один app shell
- 3 фичи/секции:
  - Yana — документы / invoice / export
  - Ivan — клиенты / долг / платежи
  - Alexei — dashboard / summary / aging

Не нужно держать три независимых UI-проекта как отдельные приложения внутри одного `main`. Нужно сделать единый frontend shell, а затем подключить каждую часть как модуль/страницу.

## 2. Базовый контракт API

Backend должен быть единственным источником правды. Все 3 frontend-ветки должны работать только через `/api/v1`.

### Основные endpoints

- `GET /api/v1/health`
- `POST /api/v1/invoices/from-order/:orderId`
- `GET /api/v1/dashboard/summary`
- `GET /api/v1/clients`
- `GET /api/v1/clients/:id`
- `GET /api/v1/invoices`
- `GET /api/v1/invoices/:id`
- `GET /api/v1/invoices/:id/pdf`
- `GET /api/v1/reports/aging`
- `POST /api/v1/payments`
- `GET /api/v1/exports/report.csv`
- `GET /api/v1/exports/report.xlsx`

### Правила контракта

- Все даты — ISO 8601
- Денежные значения — строки или числа, но в одном формате по всему проекту
- Ошибки в одном стандарте:
  - `422` для invalid input
  - `404` для not found
  - `409` для business conflict
  - `500` для internal error
- В ответах сообществовать строго одно поле `error` для ошибок

## 3. Схема мерджа

### Этап 1. Зафиксировать backend contract

Перед любым мержем нужно проверить:

- backend отвечает на все нужные endpoint-ы
- все branch-представления используют одинаковые поля
- CORS настроен
- все 3 фронта работают через `VITE_API_URL=http://localhost:3000`

### Этап 2. Собрать один frontend shell

Нужно создать единый проект-оболочку, например:

- `src/App.jsx`
- `src/layout/Sidebar.jsx`
- `src/layout/Header.jsx`
- `src/pages/OverviewPage.jsx`
- `src/pages/ClientsPage.jsx`
- `src/pages/DocumentsPage.jsx`
- `src/pages/ExportsPage.jsx`

Главная навигация:

- Главная / Dashboard
- Клиенты
- Документы
- Экспорт

Только после этого подключать разделы из веток.

### Этап 3. Влить функциональные модули

#### Yana module

- `DocumentsPage`
- `InvoiceTemplate`
- `ExportPage`

Должны использовать:

- `GET /api/v1/invoices`
- `GET /api/v1/invoices/:id`
- `GET /api/v1/invoices/:id/pdf`
- `GET /api/v1/exports/report.csv`
- `GET /api/v1/exports/report.xlsx`

#### Ivan module

- `ClientsTable`
- `ClientDetails`
- `PaymentModal`

Должны использовать:

- `GET /api/v1/clients`
- `GET /api/v1/clients/:id`
- `POST /api/v1/payments`

#### Alexei module

- `SupplierDashboard`

Должен использовать:

- `GET /api/v1/dashboard/summary`
- `GET /api/v1/reports/aging`

### Этап 4. Убрать mock data

После объединения нужно удалить:

- локальные `mockData.js`
- статические `clientsData`
- захардкоженные invoices
- захардкоженные dashboard numbers
- заглушки `alert(...)` и `console.log(...)` в реальных вызовах

Заменить на:

- `fetch(...)`
- `loading` state
- `error` state
- `retry` state

## 4. Что нельзя делать

- Нельзя мержить три frontend-ветки в `main` без общего contract
- Нельзя оставлять разные наименования полей между ветками
- Нельзя смешивать `clientId` и `client_id`
- Нельзя держать разные форматы error-response
- Нельзя держать разные URL схемы (`/api` vs `/api/v1`)
- Нельзя делать `main` “рабочим”, пока хотя бы один модуль работает только на mock-данных

## 5. Рекомендуемый порядок мержей

1. backend: зафиксировать API contract
2. backend: проверить routes и CORS
3. frontend shell: создать один app shell
4. merge Yana module into shell
5. merge Ivan module into shell
6. merge Alexei module into shell
7. remove mock data, dead code, duplicate styles
8. run smoke tests
9. run QA flow for invoice creation, payment, dashboard, export
10. merge final stable main

## 6. Что должно быть в финальном проекте

Финальный проект должен иметь:

- единый backend
- единый frontend shell
- 3 функциональные секции
- общая структура API
- единый design language
- работающие endpoints всех 3 частей
- отсутствие захардкоженных mock-данных в критичных сценариях

## 7. Критерии готовности к одному main

Можно мержить всё в один `main`, если выполняются все правила:

- backend отвечает на все нужные endpoint-ы
- frontend использует единый base URL
- нет расхождений между API и UI полями
- все 3 ветки проходят smoke checks
- нет критических mock-заглушек в бизнес-потоках
- dashboard, clients, invoices, payments, exports запускаются без ручной правки кода

## 8. Итог

Правильный путь — не “пуш всего в один main без подготовки”, а:

- стабилизировать API,
- собрать общий frontend shell,
- собрать 3 функции в него,
- убрать mock и dead code,
- только после этого делать финальный общий merge.

Это даёт максимальную вероятность, что проект станет одним рабочим продуктом, а не кучей несвязанных веток.
