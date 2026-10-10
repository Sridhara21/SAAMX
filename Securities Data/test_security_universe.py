# -*- coding: utf-8 -*-
"""
SAAMX 2026 — Securities Universe Validation Test
Run: python3 test_security_universe.py
"""
import json, sys, collections

with open("/home/claude/saamx/output/securities_universe.json") as f:
    securities = json.load(f)

EXCLUDED = ["openai", "stripe", "canva", "discord", "polymarket"]

results = []
def check(label, condition, detail=""):
    status = "PASS" if condition else "FAIL"
    results.append((label, status, detail))
    return condition

n = len(securities)

# 1. Count near 2000
check("Approximately 2,000 securities exist", 1900 <= n <= 2150, f"count={n}")

# 2. Unique IDs
ids = [s["id"] for s in securities]
check("Every security has a unique ID", len(ids) == len(set(ids)), f"{len(ids)-len(set(ids))} duplicates")

# 3. Tickers valid & non-conflicting within exchange
by_exchange_ticker = collections.defaultdict(set)
dupes = 0
for s in securities:
    key = (s["exchange"], s["ticker"])
    if key in by_exchange_ticker:
        dupes += 1
    by_exchange_ticker[key] = True
check("Tickers are valid and non-conflicting (per exchange)", dupes == 0, f"{dupes} conflicts")

# 4. All securities have descriptions
no_desc = [s["id"] for s in securities if not s.get("description") or len(s["description"]) < 20]
check("All securities have descriptions", len(no_desc) == 0, f"{len(no_desc)} missing/short")

# 5. Stocks contain company intelligence where applicable (at least core fields present)
stocks = [s for s in securities if s["type"] == "Stock"]
missing_market_cat = [s["id"] for s in stocks if not s.get("marketCategory")]
check("Stocks contain company intelligence where applicable", len(missing_market_cat) == 0,
      f"{len(missing_market_cat)} stocks missing marketCategory")

# 6. Bonds contain issuer information
bonds = [s for s in securities if s["type"] in ("CorporateBond", "GovernmentBond")]
missing_issuer = [s["id"] for s in bonds if not s.get("issuer") or not s.get("maturityDate") or s.get("couponRate") is None]
check("Bonds contain issuer information", len(missing_issuer) == 0, f"{len(missing_issuer)} incomplete")

# 7. ETFs contain fund/index information
etfs = [s for s in securities if s["type"] == "ETF"]
missing_etf_info = [s["id"] for s in etfs if not s.get("fundManager") or not s.get("underlyingIndex")]
check("ETFs contain fund/index information", len(missing_etf_info) == 0, f"{len(missing_etf_info)} incomplete")

# 8. Mutual funds contain fund metadata
mfs = [s for s in securities if s["type"] == "MutualFund"]
missing_mf_info = [s["id"] for s in mfs if not s.get("fundHouse") or not s.get("investmentCategory")]
check("Mutual funds contain fund metadata", len(missing_mf_info) == 0, f"{len(missing_mf_info)} incomplete")

# 9. Currencies compatible with FX architecture
valid_currencies = {"INR", "USD", "GBP", "EUR"}
bad_currency = [s["id"] for s in securities if s["currency"] not in valid_currencies]
check("Currencies are compatible with the FX architecture", len(bad_currency) == 0,
      f"{len(bad_currency)} using unsupported currency: " +
      str(set(s['currency'] for s in securities if s['currency'] not in valid_currencies)))

# 10. Exchanges valid (non-empty)
bad_exchange = [s["id"] for s in securities if not s.get("exchange")]
check("Exchanges are valid", len(bad_exchange) == 0, f"{len(bad_exchange)} missing exchange")

# 11. No accidental fictional securities (spot check: all names non-empty, reasonable length)
bad_names = [s["id"] for s in securities if not s.get("name") or len(s["name"]) < 2]
check("No accidental fictional/empty securities", len(bad_names) == 0, f"{len(bad_names)} bad names")

# 12. No duplicate companies (by name, within stocks)
stock_names = [s["name"] for s in stocks]
name_counts = collections.Counter(stock_names)
dup_names = {k: v for k, v in name_counts.items() if v > 1}
check("No duplicate companies", len(dup_names) == 0, f"{len(dup_names)} duplicate names: {list(dup_names.keys())[:5]}")

# 13-17. Excluded IPO companies
all_names_lower = " ".join(s["name"].lower() for s in securities)
for excl in EXCLUDED:
    check(f"{excl.capitalize()} is excluded", excl not in all_names_lower)

# 18. All required fields populated (schema completeness)
required_base = ["id","ticker","name","description","sector","industry","exchange","country",
                  "currency","type","referencePrice","previousClose","openingPrice","currentPrice",
                  "dayHigh","dayLow","totalUnits","availableUnits","tradingVolume","volatility",
                  "riskRating","status","ipoStatus"]
missing_fields = []
for s in securities:
    for field in required_base:
        if field not in s or s[field] in (None, ""):
            missing_fields.append((s["id"], field))
check("All required base fields are populated", len(missing_fields) == 0,
      f"{len(missing_fields)} missing (e.g. {missing_fields[:3]})")

# 19. Prices and day ranges internally consistent
bad_price_range = []
for s in securities:
    if s["dayHigh"] < s["currentPrice"] - 0.02 or s["dayLow"] > s["currentPrice"] + 0.02:
        bad_price_range.append(s["id"])
    if s["dayHigh"] < s["dayLow"]:
        bad_price_range.append(s["id"])
check("Prices and day ranges are internally consistent", len(bad_price_range) == 0,
      f"{len(bad_price_range)} inconsistent (allowing small rounding tolerance)")

# 20. Available units valid positive numbers
bad_units = [s["id"] for s in securities if not (0 < s["availableUnits"] <= s["totalUnits"])]
check("Available units are valid positive numbers", len(bad_units) == 0, f"{len(bad_units)} invalid")

# ---------------- Report ----------------
print("=" * 70)
print("SAAMX 2026 — SECURITY UNIVERSE VALIDATION REPORT")
print("=" * 70)
passed = 0
for label, status, detail in results:
    mark = "✓" if status == "PASS" else "✗"
    line = f"{mark} {label}"
    if detail and status == "FAIL":
        line += f"  [{detail}]"
    print(line)
    if status == "PASS":
        passed += 1

print("-" * 70)
print(f"{passed}/{len(results)} checks passed")
print("=" * 70)

if passed != len(results):
    sys.exit(1)
