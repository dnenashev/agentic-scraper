from firecrawl import Firecrawl

app = Firecrawl(api_key="fc-be92f663d5f74d8da0a7d7253965240f")


result = app.scrape(
    "https://maps.app.goo.gl/Sh2HC7J3ySHVsQN28",
    formats=["markdown", "screenshot"],
    actions=[
        {"type": "wait", "milliseconds": 5000},
        {"type": "scroll", "direction": "down"},
        {"type": "wait", "milliseconds": 3000},
        {"type": "scroll", "direction": "down"},
        {"type": "wait", "milliseconds": 3000}
    ]
)

print(result.screenshot)
print(result.markdown[:500] if result.markdown else "No markdown")

print(result.screenshot)
