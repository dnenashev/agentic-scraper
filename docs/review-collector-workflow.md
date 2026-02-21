# Review Collector Agent Workflow

```mermaid
flowchart TD
    Start([User Request]) --> Parse[Parse Parameters]
    Parse --> |platform, mode, value| Validate{Valid?}
    
    Validate -->|No| Clarify[Ask Clarification]
    Clarify --> Parse
    
    Validate -->|Yes| LoadPlatforms[Load platforms.json]
    LoadPlatforms --> FilterOrgs[Filter Organizations by Platform]
    
    FilterOrgs --> LoadReviews[Load reviews.json]
    LoadReviews --> |missing| CreateEmpty[Create empty reviews.json]
    CreateEmpty --> LoopOrgs
    LoadReviews --> |exists| LoopOrgs
    
    subgraph LoopOrgs [For Each Organization]
        Scrape[Firecrawl Scrape<br/>NO browser-mode] --> CheckScrape{Success?}
        
        CheckScrape -->|CAPTCHA/404| LogError[Log Error, Skip]
        CheckScrape -->|No reviews| LogNoRev[Log No reviews, Continue]
        CheckScrape -->|Success| ParseReviews[Parse Reviews]
        
        ParseReviews --> NormalizeDate[Normalize Date<br/>→ YYYY-MM-DD]
        NormalizeDate --> CalcWeek[Calculate Week<br/>→ W1-W53]
        CalcWeek --> ApplyPlatform[Apply Platform Rules]
    end
    
    LogError --> MoreOrgs{More Orgs?}
    LogNoRev --> MoreOrgs
    ApplyPlatform --> MoreOrgs
    
    MoreOrgs -->|Yes| Scrape
    MoreOrgs -->|No| Filter[Filter by Mode<br/>count/period]
    
    Filter --> Dedup[Deduplicate<br/>author + date + text first 100 chars]
    Dedup --> CheckNew{New Reviews?}
    
    CheckNew -->|No| ReportEmpty[Report: No New Reviews]
    CheckNew -->|Yes| Save[Save to reviews.json]
    
    Save --> Report[Report Statistics]
    ReportEmpty --> End([Done])
    Report --> End

    subgraph PlatformRules [Platform-Specific Rules]
        direction LR
        Yandex["Yandex: year=current<br/>text before еще"]
        Google["Google: relative date<br/>English text"]
        TwoGIS["2GIS: full date<br/>~20 reviews"]
        Otzovik["Otzovik: short month<br/>all truncated"]
        Zoon["Zoon: full date"]
        Ucheba["Ucheba: full text<br/>?page=1, max 3 pages"]
        Proverili["Proverili: 5/page<br/>pagination"]
    end
```

## Flow Description

### 1. Parse Parameters
Извлекает из запроса:
- `platform`: yandex, google, 2gis, otzovik, zoon, ucheba, proverili, all
- `mode`: count или period
- `value`: 3/5/10 или 24h/48h/1w

### 2. Load Data
- Загружает `data/platforms.json` — список организаций
- Загружает `data/reviews.json` — существующие отзывы для дедупликации

### 3. Scrape Loop
Для каждой организации:
- Firecrawl scrape БЕЗ browser-mode
- Обработка ошибок (CAPTCHA, 404, нет отзывов)
- Парсинг отзывов с нормализацией даты

### 4. Filter & Deduplicate
- Фильтрация по mode/value
- Удаление дубликатов по ключу `author + date + text[:100]`

### 5. Save & Report
- Сохранение в `data/reviews.json`
- Отчёт со статистикой
