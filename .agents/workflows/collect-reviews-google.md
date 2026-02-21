# Workflow: collect-reviews-google

Сбор отзывов с Google Maps через Apify scraper.

## Параметры запуска

| Параметр | Тип | Описание |
|----------|-----|----------|
| `mode` | `count` \| `period` | Режим сбора |
| `value` | int \| string | Количество (3/5/10) или период (24h/48h/1w) |
| `platform_filter` | string (optional) | Должен быть `google` |

## Файлы

- **Input:** `data/platforms.json` — список организаций (фильтр по type=google)
- **Output:** `data/reviews.json` — база отзывов

## Prerequisites

- `.env` file with `APIFY_TOKEN`
- Node.js 20.6+
- `mcpc` CLI tool: `npm install -g @apify/mcpc`

---

## Steps

### Step 1: load_platforms

**Action:** Загрузить организации из `data/platforms.json`, отфильтровать по `type: "google"`

**Output:** List of Google Maps organizations

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

**Action:** Запустить Apify scraper для каждой организации:

**Actor:** `compass/Google-Maps-Reviews-Scraper`

**Input parameters:**
```json
{
  "startUrls": [{"url": "GOOGLE_MAPS_URL"}],
  "maxReviews": 5,
  "reviewsSort": "newest",
  "language": "ru"
}
```

| Параметр | Описание | Значение |
|----------|----------|----------|
| `startUrls` | URL страниц бизнеса | Из platforms.json |
| `maxReviews` | Макс. отзывов | Из `mode/value` |
| `reviewsSort` | Сортировка | `"newest"` |
| `language` | Язык метаданных | `"ru"` |

**Command:**
```bash
node --env-file=.env ${SKILL_ROOT}/../apify-ultimate-scraper/reference/scripts/run_actor.js \
  --actor "compass/Google-Maps-Reviews-Scraper" \
  --input '{"startUrls":[{"url":"URL"}],"maxReviews":N,"reviewsSort":"newest","language":"ru"}'
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
| `publishedAtDate` | `date` | ISO → YYYY-MM-DD |
| `name` | `author` | Прямое копирование |
| `stars` | `rating` | Прямое копирование |
| `text` | `text` | Прямое копирование (или пустая строка) |
| `title` | `organization_name` | Название места |

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
| Текст пустой | text = "" | Сохранять как оценку без текста |

---

### Step 5: save_reviews

**Action:** Добавить новые отзывы в начало `data/reviews.json`

**Tools:** write

---

## Data Schema: Review (Google)

| Поле | Тип | Описание |
|------|-----|----------|
| `date` | string | Дата отзыва "YYYY-MM-DD" |
| `week` | string | Номер недели года "W{1-53}" |
| `organization_name` | string | Название организации |
| `city` | string | Город/филиал |
| `platform` | string | `"google"` |
| `platform_id` | string | ID из platforms.json |
| `text` | string | Текст отзыва (может быть пустым) |
| `author` | string | Автор отзыва |
| `rating` | integer | Рейтинг 1-5 |
| `pushed_to_sheet` | boolean | Выгружен ли в Google Sheets (default: false) |

---

## Actor Details: compass/Google-Maps-Reviews-Scraper

| Характеристика | Значение |
|----------------|----------|
| **Actor ID** | `compass/Google-Maps-Reviews-Scraper` |
| **Date format** | ISO: `2026-02-19T10:12:29.018Z` |
| **Language** | Настройка через параметр `language` |
| **Reviews limit** | Задаётся через `maxReviews` |
| **Sorting** | newest, mostRelevant, highestRanking, lowestRanking |

---

## Duplicates Key

Для Google дубликаты определяются по составному ключу:
```
author + date + text[:100]
```

---

## Example Output

```
Сообщение: "Собрано 3 новых отзыва из 3 организаций (Google)"
```

```json
{
  "date": "2026-02-14",
  "week": "W7",
  "organization_name": "МАБиУ",
  "city": "Москва",
  "platform": "google",
  "platform_id": "google-maps-1",
  "text": "Good afternoon! We're very sorry you had this impression...",
  "author": "John D.",
  "rating": 4,
  "pushed_to_sheet": false
}
```

---

## Notes

- Apify возвращает дату уже в ISO формате — не нужно парсить относительные даты
- Отзывы без текста — это оценки, их тоже нужно сохранять (text = "")
- Дедупликация обязательна перед сохранением
