# Workflow: collect-reviews-2gis

Сбор отзывов с 2ГИС через Apify actor.

## Параметры запуска

| Параметр | Тип | Описание |
|----------|-----|----------|
| `mode` | `count` \| `period` | Режим сбора |
| `value` | int \| string | Количество (3/5/10) или период (24h/48h/1w) |
| `platform_filter` | string (optional) | Должен быть `2gis` |

## Файлы

- **Input:** `data/platforms.json` — список организаций (фильтр по type=2gis)
- **Output:** `data/reviews.json` — база отзывов

## Prerequisites

- `.env` file with `APIFY_TOKEN`
- Node.js 20.6+
- `mcpc` CLI tool: `npm install -g @apify/mcpc`

---

## Steps

### Step 1: load_platforms

**Action:** Загрузить организации из `data/platforms.json`, отфильтровать по `type: "2gis"`

**Output:** List of 2GIS organizations

---

### Step 2: load_existing_reviews

**Action:** Загрузить существующую базу отзывов из `data/reviews.json`

**Output:** Set of existing reviews для дедупликации

**Failure points:**
| Condition | Detection | Resolution |
|-----------|-----------|------------|
| Файл не существует | FileNotFoundError | Создать `{"reviews": []}` |

---

### Step 3: scrape_reviews

**Action:** Запустить Apify actor для каждой организации:

**Actor:** `zen-studio/2gis-reviews-scraper`

**Input parameters:**
```json
{
  "startUrls": [{"url": "2GIS_URL"}],
  "maxReviews": 5,
  "sort": "date"
}
```

| Параметр | Описание | Значение |
|----------|----------|----------|
| `startUrls` | URL страниц бизнеса | Из platforms.json |
| `maxReviews` | Макс. отзывов | Из `mode/value` |
| `sort` | Сортировка | `"date"` (по дате) |

**Command:**
```bash
node --env-file=.env ${SKILL_ROOT}/../apify-ultimate-scraper/reference/scripts/run_actor.js \
  --actor "zen-studio/2gis-reviews-scraper" \
  --input '{"startUrls":[{"url":"URL"}],"maxReviews":N,"sort":"date"}'
```

**Tools:** apify-ultimate-scraper skill

**Parallel:** true (для нескольких организаций)

**Failure points:**
| Condition | Detection | Resolution |
|-----------|-----------|------------|
| Actor run failed | Status: FAILED | Пропустить организацию, логировать ошибку |
| No reviews found | Empty dataset | Логировать "нет отзывов", продолжить |
| APIFY_TOKEN missing | Auth error | Попросить создать .env с токеном |

---

### Step 4: parse_and_filter

**Action:** Преобразовать данные из actor в формат схемы:

**Actor output fields:**
| Actor field | Schema field | Transformation |
|-------------|--------------|----------------|
| `date` | `date` | ISO → YYYY-MM-DD |
| `author` | `author` | Прямое копирование |
| `rating` | `rating` | Прямое копирование |
| `text` | `text` | Прямое копирование |
| `organization` | `organization_name` | Название организации |

**Week calculation:**
```python
from datetime import datetime
week = date.isocalendar()[1]  # W{1-53}
```

**Фильтрация:**
- При `mode=count`: взять N последних по дате
- При `mode=period`: отфильтровать по дате относительно сегодня

**Дедупликация:** пропустить если `author + date + text[:100]` уже в базе

**Output:** List of new reviews

**Failure points:**
| Condition | Detection | Resolution |
|-----------|-----------|------------|
| За период нет новых отзывов | После фильтрации список пуст | Вернуть "новых отзывов не найдено" |
| Меньше запрошенного | Найдено N < requested | Вернуть что есть + сообщение |

---

### Step 5: save_reviews

**Action:** Добавить новые отзывы в начало `data/reviews.json`

**Tools:** write

---

## Data Schema: Review (2GIS)

| Поле | Тип | Описание |
|------|-----|----------|
| `date` | string | Дата отзыва "YYYY-MM-DD" |
| `week` | string | Номер недели года "W{1-53}" |
| `organization_name` | string | Название организации |
| `city` | string | Город/филиал |
| `platform` | string | `"2gis"` |
| `platform_id` | string | ID из platforms.json |
| `text` | string | Полный текст отзыва |
| `author` | string | Автор отзыва |
| `rating` | integer | Рейтинг 1-5 |
| `pushed_to_sheet` | boolean | Выгружен ли в Google Sheets (default: false) |

---

## Actor Details: zen-studio/2gis-reviews-scraper

| Характеристика | Значение |
|----------------|----------|
| **Actor ID** | `zen-studio/2gis-reviews-scraper` |
| **Date format** | ISO 8601 |
| **Sources** | 2GIS + Flamp + Booking |
| **Language** | Русский |
| **Pricing** | ~$1 за 1000 отзывов |

---

## Duplicates Key

Для 2ГИС дубликаты определяются по составному ключу:
```
author + date + text[:100]
```

---

## Example Output

```
Сообщение: "Собрано 4 новых отзыва из 8 организаций (2GIS)"
```

```json
{
  "date": "2026-02-16",
  "week": "W7",
  "organization_name": "Skypro",
  "city": "Красноярск",
  "platform": "2gis",
  "platform_id": "2gis-5",
  "text": "я на туризм учусь, тут норм базу дают...",
  "author": "Алексей К.",
  "rating": 5,
  "pushed_to_sheet": false
}
```
