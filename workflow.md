# Тестирование workflow collect-reviews-otzovik

## Цель
Проверить работоспособность workflow collect-reviews-otzovik - собрать отзывы с Otzovik.ru для 5 организаций.

## Входные данные
- `data/platforms.json` - 5 организаций на Otzovik
- Режим: `count 3` (собрать 3 последних отзыва с каждой)
- Инструмент: apify/cheerio-scraper + Residential Proxy (RU)

## Выходные данные
- 15 отзывов в `data/reviews.json`
- Обновлённые SKILL.md и workflow.md

---

## Шаги

### Шаг 1: load_platforms
**Действие:** Загрузить организации из `data/platforms.json`, отфильтровать по `type: "otzovik"`
**Ожидаемый результат:** 5 организаций
**Возможные проблемы:** Файл не существует → создать пустой

### Шаг 2: scrape_reviews
**Действие:** Запустить `apify/cheerio-scraper` с residential proxy (RU)
**Actor:** `apify/cheerio-scraper`
**Proxy:** `{"useApifyProxy": true, "apifyProxyGroups": ["RESIDENTIAL"], "apifyProxyCountry": "RU"}`
**Ожидаемый результат:** 50 отзывов в raw формате
**Возможные проблемы:** 
- CAPTCHA → использовать Residential Proxy
- 404/500 → пропустить организацию

### Шаг 3: normalize_reviews
**Действие:** Преобразовать raw JSON в нормализованный формат
**Трансформации:**
- date: ISO 8601 → "YYYY-MM-DD"
- platformId: извлечь из source_url
**Ожидаемый результат:** 50 нормализованных отзывов
**Возможные проблемы:** Неверный формат даты → логировать warning

### Шаг 4: filter_latest
**Действие:** Отфильтровать по 3 последних отзыва на организацию
**Ожидаемый результат:** 15 отзывов
**Возможные проблемы:** Меньше 3 на организацию → вернуть что есть

### Шаг 5: deduplicate
**Действие:** Удалить дубликаты по ключу `author + date + text[:100]`
**Ожидаемый результат:** 15 уникальных отзывов
**Возможные проблемы:** Все дубликаты → "нет новых отзывов"

### Шаг 6: save_reviews
**Действие:** Добавить в `data/reviews.json`
**Ожидаемый результат:** 45 отзывов в базе (30 + 15)
**Возможные проблемы:** Ошибка записи → проверить права

---

## Примечания

### Исследованные Actors (50+)
| Actor | Результат |
|-------|-----------|
| `apify/web-scraper` | ❌ Блокировка IP |
| `apify/website-content-crawler` | ❌ Блокировка IP |
| `apify/super-scraper-api` | ❌ CAPTCHA |
| `eloquent_mountain/ai-web-scraper-extract-data-with-ease` | ❌ Пустой результат |
| `logiover/website-to-markdown` | ⚠️ Работает, но нет date/rating |
| `apify/cheerio-scraper` + Residential Proxy | ✅ **Рекомендуется** |

### Ключевые выводы
1. Otzovik имеет сильную anti-bot защиту
2. Datacenter proxy блокируются
3. Residential Proxy (RU) успешно обходит защиту
4. Schema.org itemprop селекторы работают надёжно
5. cheerio-scraper быстрее чем browser-based actors

### Стоимость
- ~$0.005/request с Residential Proxy
- 5 URL × $0.005 = ~$0.025 за тест
