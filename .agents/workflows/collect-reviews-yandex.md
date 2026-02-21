# Workflow: collect-reviews-yandex

Сбор отзывов с Яндекс.Карт через Apify actor.

## Параметры запуска

| Параметр | Тип | Описание |
|----------|-----|----------|
| `mode` | `count` \| `period` | Режим сбора |
| `value` | int \| string | Количество (3/5/10) или период (24h/48h/1w) |
| `platform_filter` | string (optional) | Должен быть `yandex` |

## Файлы

- **Input:** `data/platforms.json` — список организаций (фильтр по type=yandex)
- **Output:** `data/reviews.json` — база отзывов

## Prerequisites

- `.env` file with `APIFY_TOKEN`
- Node.js 20.6+
- `mcpc` CLI tool: `npm install -g @apify/mcpc`

---

## Steps

### Step 1: load_platforms

**Action:** Загрузить организации из `data/platforms.json`, отфильтровать по `type: "yandex"`

**Output:** List of Yandex Maps organizations

---

### Step 2: load_existing_reviews

**Action:** Загрузить существующую базу отзывов из `data/reviews.json`

**Output:** Set of existing review IDs для дедупликации

**Failure points:**
| Condition | Detection | Resolution |
|-----------|-----------|------------|
| Файл не существует | FileNotFoundError | Создать `{"reviews": []}` |

---

### Step 3: scrape_reviews

**Action:** Запустить Apify actor для каждой организации:

**Actor:** `zen-studio/yandex-maps-reviews-scraper`

**Input parameters:**
```json
{
  "startUrls": [{"url": "YANDEX_MAPS_URL"}],
  "maxReviewsPerPlace": 5,
  "reviewSort": "newest",
  "language": "ru"
}
```

| Параметр | Описание | Значение |
|----------|----------|----------|
| `startUrls` | URL страниц бизнеса | Из platforms.json |
| `maxReviewsPerPlace` | Макс. отзывов | Из `mode/value` |
| `reviewSort` | Сортировка | `"newest"` |
| `language` | Язык метаданных | `"ru"` |

**Command:**
```bash
node --env-file=.env ${SKILL_ROOT}/../apify-ultimate-scraper/reference/scripts/run_actor.js \
  --actor "zen-studio/yandex-maps-reviews-scraper" \
  --input '{"startUrls":[{"url":"URL"}],"maxReviewsPerPlace":N,"reviewSort":"newest","language":"ru"}'
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
| `reviewId` | `review_id` | Прямое копирование |
| `date` | `date` | ISO → YYYY-MM-DD |
| `authorName` | `author` | Прямое копирование |
| `rating` | `rating` | Прямое копирование |
| `text` | `text` | Прямое копирование |
| `businessTitle` | `organization_name` | Прямое копирование |
| `businessCity` | `city` | Прямое копирование |

**Week calculation:**
```python
from datetime import datetime
week = date.isocalendar()[1]  # W{1-53}
```

**Фильтрация:**
- При `mode=count`: взять N последних по дате
- При `mode=period`: отфильтровать по дате относительно сегодня

**Дедупликация:** пропустить если `review_id` уже в базе

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

## Data Schema: Review (Yandex)

| Поле | Тип | Описание |
|------|-----|----------|
| `review_id` | string | Уникальный ID от actor'а |
| `date` | string | Дата отзыва "YYYY-MM-DD" |
| `week` | string | Номер недели года "W{1-53}" |
| `organization_name` | string | Название организации |
| `city` | string | Город/филиал |
| `platform` | string | `"yandex"` |
| `platform_id` | string | ID из platforms.json |
| `source_url` | string | URL организации |
| `author` | string | Автор отзыва |
| `rating` | integer | Рейтинг 1-5 |
| `text` | string | Полный текст отзыва |
| `pushed_to_sheet` | boolean | Выгружен ли в Google Sheets (default: false) |

---

## Actor Details: zen-studio/yandex-maps-reviews-scraper

| Характеристика | Значение |
|----------------|----------|
| **Actor ID** | `zen-studio/yandex-maps-reviews-scraper` |
| **Pricing** | ~$0.00299/отзыв (FREE tier) |
| **Speed** | ~1000 отзывов за 30 сек |
| **Success rate** | 78.6% |
| **Fields** | 35 полей (reviewId, rating, text, authorName, date, photos, etc.) |

**Alternative actors:**
| Actor | Success rate | Price | Use case |
|-------|--------------|-------|----------|
| `zen-studio/yandex-maps-scraper` | 96.3% | $0.00699/place | Если нужен более надёжный, но дороже |

---

## Duplicates Key

Используем `review_id` от actor'а (уникальный для каждого отзыва).

---

## Example Output

```
Сообщение: "Собрано 5 новых отзывов из 1 организации (Yandex)"
```

```json
{
  "review_id": "14QbIe03z3nQIfLJctxYX44RL6nrGUnp",
  "date": "2026-01-23",
  "week": "W4",
  "organization_name": "Skypro",
  "city": "Красноярск",
  "platform": "yandex",
  "platform_id": "yandex-maps-6",
  "source_url": "https://yandex.ru/maps/org/skypro/204084115284/reviews/?lang=ru",
  "author": "Андрей Смирнов",
  "rating": 5,
  "text": "Один из немногих колледжей Красноярска...",
  "pushed_to_sheet": false
}
```
