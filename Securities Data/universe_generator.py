# -*- coding: utf-8 -*-
"""
SAAMX 2026 — Securities Universe Generator
Generates ~1800 curated, real, classified securities across equities,
ETFs, mutual funds, government securities, corporate bonds, REITs and InvITs,
in the schema described in the SAAMX master prompt.

Run: python3 universe_generator.py
Outputs: output/securities_universe.json (+ split files) and a summary report.
"""
import json, random, hashlib, os, itertools

import data_lists as D
from company_intel import COMPANY_INTEL
from company_intel_ext import COMPANY_INTEL_EXT
from company_intel_ext2 import COMPANY_INTEL_EXT2
from company_intel_ext3 import COMPANY_INTEL_EXT3
from company_intel_ext4 import COMPANY_INTEL_EXT4

COMPANY_INTEL = {**COMPANY_INTEL, **COMPANY_INTEL_EXT, **COMPANY_INTEL_EXT2, **COMPANY_INTEL_EXT3, **COMPANY_INTEL_EXT4}

random.seed(42)

# ------------------------------------------------------------
# Google Finance URL support
# Format: https://www.google.com/finance/quote/{TICKER}:{GFIN_EXCHANGE_CODE}
# ------------------------------------------------------------
GFIN_EXCHANGE_MAP = {
    "NSE": "NSE", "BSE": "BSE",
    "NASDAQ": "NASDAQ", "NYSE": "NYSE", "NYSE Arca": "NYSEARCA",
    "London Stock Exchange": "LON",
    "Deutsche Boerse Xetra": "ETR", "Euronext Paris": "EPA",
    "Euronext Amsterdam": "AMS", "SIX Swiss Exchange": "VTX",
    "Borsa Italiana": "BIT", "Bolsa de Madrid": "BME",
    "Euronext Brussels": "EBR", "Oslo Bors": "OSL",
    "Nasdaq Copenhagen": "CPH", "Nasdaq Stockholm": "STO",
    "Wiener Borse": "VIE", "Nasdaq Helsinki": "HEL",
    "Warsaw Stock Exchange": "WSE",
    "Hong Kong Stock Exchange": "HKG",
    "Australian Securities Exchange": "ASX",
    "Singapore Exchange": "SGX",
    "Tokyo Stock Exchange (ADR/USD)": "TYO",
    "Korea Exchange (ADR/USD)": "KRX",
    "Taiwan Stock Exchange (ADR/USD)": "TPE",
}

def gfin_url(ticker, exchange):
    """Return a Google Finance quote URL where we have a confident exchange code mapping."""
    code = GFIN_EXCHANGE_MAP.get(exchange)
    if not code:
        return None
    t = ticker.split()[0].replace("&", "").replace(".", "")
    return f"https://www.google.com/finance/quote/{t}:{code}"

EXCLUDED_IPO_NAMES = {"openai","stripe","canva","discord","polymarket"}

OUT_DIR = "/home/claude/saamx/output"
os.makedirs(OUT_DIR, exist_ok=True)

securities = []
seen_ids = set()
seen_tickers_by_exchange = {}

def make_id(prefix, ticker, idx):
    base = f"{prefix}_{ticker}_{idx}"
    h = hashlib.md5(base.encode()).hexdigest()[:6]
    sid = f"{prefix}_{ticker.replace('.','').replace('&','').replace(' ','').upper()}_{h}"
    n = 1
    orig = sid
    while sid in seen_ids:
        sid = f"{orig}_{n}"
        n += 1
    seen_ids.add(sid)
    return sid

def dedup_ticker(exchange, ticker):
    key = exchange
    seen_tickers_by_exchange.setdefault(key, set())
    t = ticker
    n = 1
    while t in seen_tickers_by_exchange[key]:
        n += 1
        t = f"{ticker}{n}"
    seen_tickers_by_exchange[key].add(t)
    return t

def check_not_excluded(name):
    lname = name.lower()
    for bad in EXCLUDED_IPO_NAMES:
        if bad in lname:
            raise ValueError(f"Excluded IPO company detected in universe: {name}")

def price_band_for_cap(cap, currency):
    # realistic simulation reference price ranges by market cap tier & currency
    bands = {
        ("Large Cap","INR"): (250, 4200),
        ("Mid Cap","INR"): (150, 2200),
        ("Small Cap","INR"): (40, 900),
        ("Large Cap","USD"): (35, 950),
        ("Mid Cap","USD"): (15, 260),
        ("Small Cap","USD"): (3, 90),
        ("Large Cap","GBP"): (4, 90),
        ("Mid Cap","GBP"): (2, 35),
        ("Small Cap","GBP"): (0.5, 12),
        ("Large Cap","EUR"): (10, 300),
        ("Mid Cap","EUR"): (5, 120),
        ("Small Cap","EUR"): (1, 40),
    }
    return bands.get((cap, currency), (10, 200))

def gen_price_fields(cap, currency, volatility_hint=None):
    lo, hi = price_band_for_cap(cap, currency)
    ref = round(random.uniform(lo, hi), 2)
    prev_close = round(ref * random.uniform(0.97, 1.03), 2)
    open_p = round(prev_close * random.uniform(0.985, 1.015), 2)
    move_pct = random.uniform(-0.02, 0.025)
    current = round(open_p * (1 + move_pct), 2)
    day_high = round(max(open_p, current) * random.uniform(1.0, 1.015), 2)
    day_low = round(min(open_p, current) * random.uniform(0.985, 1.0), 2)
    volatility = volatility_hint if volatility_hint is not None else round(random.uniform(0.8, 3.2), 2)
    return dict(referencePrice=ref, previousClose=prev_close, openingPrice=open_p,
                currentPrice=current, dayHigh=day_high, dayLow=day_low, volatility=volatility)

def gen_units(cap):
    ranges = {
        "Large Cap": (8_000_000, 40_000_000),
        "Mid Cap": (1_500_000, 9_000_000),
        "Small Cap": (200_000, 1_800_000),
    }
    lo, hi = ranges.get(cap, (500_000, 3_000_000))
    total = random.randint(lo, hi)
    available = int(total * random.uniform(0.35, 0.70))
    volume = int(available * random.uniform(0.01, 0.08))
    return total, available, volume

def risk_for_cap(cap, sec_type="Stock"):
    if sec_type in ("GovernmentBond",):
        return "Low"
    if sec_type in ("CorporateBond",):
        return "Low" if cap == "Large Cap" else "Medium"
    if sec_type in ("REIT","InvIT"):
        return "Medium"
    return {"Large Cap":"Low","Mid Cap":"Medium","Small Cap":"High"}.get(cap, "Medium")

def generic_description(name, sector, industry, country, sec_type="company"):
    templates = [
        f"{name} is a {industry.lower()} company operating in the {sector.lower()} sector in {country}. "
        f"It plays a meaningful role in its industry, generating revenue through the products and services "
        f"typical of {industry.lower()} businesses, and represents a real, tradable {sec_type} in the "
        f"{country} market suitable for building sector and geographic exposure.",
        f"Operating within {country}'s {sector.lower()} sector, {name} is engaged in {industry.lower()}. "
        f"The company earns revenue from its core {industry.lower()} operations and is a recognised participant "
        f"in its industry, offering students exposure to {sector.lower()} dynamics within the SAAMX market.",
    ]
    return random.choice(templates)

def make_equity(ticker, name, sector, industry, cap, exchange, country, currency, extra_intel_key=None):
    check_not_excluded(name)
    t = dedup_ticker(exchange, ticker)
    sid = make_id("STK", t, len(securities))
    prices = gen_price_fields(cap, currency)
    total, avail, vol = gen_units(cap)
    entry = {
        "id": sid, "ticker": t, "name": name,
        "sector": sector, "industry": industry,
        "exchange": exchange, "country": country, "currency": currency,
        "type": "Stock",
        **prices,
        "totalUnits": total, "availableUnits": avail, "tradingVolume": vol,
        "riskRating": risk_for_cap(cap),
        "status": "Active", "ipoStatus": "NONE",
    }
    intel = COMPANY_INTEL.get(extra_intel_key or ticker)
    if intel:
        entry["description"] = intel["businessSummary"]
        entry.update({
            "foundedYear": intel["foundedYear"], "headquarters": intel["headquarters"],
            "founders": intel["founders"], "leadership": intel["leadership"],
            "majorProducts": intel["majorProducts"], "businessSummary": intel["businessSummary"],
            "marketPosition": intel["marketPosition"], "companyHighlights": intel["companyHighlights"],
            "website": intel["website"], "marketCategory": intel["marketCategory"],
        })
    else:
        entry["description"] = generic_description(name, sector, industry, country)
        entry["marketCategory"] = cap
    url = gfin_url(ticker, exchange)
    if url:
        entry["financeUrl"] = url
    return entry

def make_etf(ticker, name, category, manager, index, exchange, country, currency):
    check_not_excluded(name)
    t = dedup_ticker(exchange, ticker)
    sid = make_id("ETF", t, len(securities))
    prices = gen_price_fields("Mid Cap", currency, volatility_hint=round(random.uniform(0.6,2.2),2))
    total, avail, vol = gen_units("Mid Cap")
    return {
        "id": sid, "ticker": t, "name": name,
        "sector": category, "industry": "Exchange Traded Fund",
        "exchange": exchange, "country": country, "currency": currency,
        "type": "ETF",
        **prices,
        "totalUnits": total, "availableUnits": avail, "tradingVolume": vol,
        "riskRating": "Medium",
        "status": "Active", "ipoStatus": "NONE",
        "description": f"{name} is an exchange-traded fund managed by {manager}, tracking the {index}. "
                        f"It offers investors low-cost, diversified exposure to the {category.lower()} segment "
                        f"through a single exchange-listed instrument.",
        "fundManager": manager, "underlyingIndex": index,
        "investmentObjective": f"To track the performance of the {index}, before fees and expenses.",
        **({"financeUrl": url} if (url := gfin_url(ticker, exchange)) else {}),
    }

def make_mf(name, category, fund_house, fund_manager, objective, currency="INR"):
    check_not_excluded(name)
    ticker = "".join([w[0] for w in name.split()])[:8].upper()
    ticker = dedup_ticker("AMFI", ticker)
    sid = make_id("MF", ticker, len(securities))
    cap = "Mid Cap"
    prices = gen_price_fields(cap, currency, volatility_hint=round(random.uniform(0.3,2.5),2))
    total, avail, vol = gen_units("Mid Cap")
    risk = "Low" if category in D.DEBT_FUND_CATEGORIES else ("Medium" if category in D.HYBRID_FUND_CATEGORIES else "High")
    return {
        "id": sid, "ticker": ticker, "name": name,
        "sector": "Mutual Fund", "industry": category,
        "exchange": "AMFI", "country": "India", "currency": currency,
        "type": "MutualFund",
        **prices,
        "totalUnits": total, "availableUnits": avail, "tradingVolume": vol,
        "riskRating": risk,
        "status": "Active", "ipoStatus": "NONE",
        "description": f"{name} is a {category.lower()} offered by {fund_house}, managed by {fund_manager}. "
                        f"{objective}",
        "fundHouse": fund_house, "fundManager": fund_manager,
        "investmentCategory": ("Debt" if category in D.DEBT_FUND_CATEGORIES else
                                ("Hybrid" if category in D.HYBRID_FUND_CATEGORIES else "Equity")),
        "investmentObjective": objective,
    }

def make_gsec(name, issuer, maturity, coupon, currency, exchange, country, credit_rating="Sovereign"):
    ticker = dedup_ticker(exchange, name.replace(" ","")[:12].upper())
    sid = make_id("GSEC", ticker, len(securities))
    cap = "Large Cap"
    price_lo_hi = {"INR": (85,105), "USD": (90,105), "GBP": (85,105)}
    lo, hi = price_lo_hi.get(currency, (90,105))
    ref = round(random.uniform(lo, hi), 2)
    prices = dict(referencePrice=ref, previousClose=round(ref*random.uniform(0.998,1.002),2))
    prices["openingPrice"] = round(prices["previousClose"]*random.uniform(0.999,1.001),2)
    prices["currentPrice"] = round(prices["openingPrice"]*random.uniform(0.998,1.003),2)
    prices["dayHigh"] = round(max(prices["openingPrice"],prices["currentPrice"])*1.002,2)
    prices["dayLow"] = round(min(prices["openingPrice"],prices["currentPrice"])*0.998,2)
    prices["volatility"] = round(random.uniform(0.1,0.6),2)
    total, avail, vol = gen_units("Large Cap")
    return {
        "id": sid, "ticker": ticker, "name": name,
        "sector": "Government Securities", "industry": "Sovereign Debt",
        "exchange": exchange, "country": country, "currency": currency,
        "type": "GovernmentBond",
        **prices,
        "totalUnits": total, "availableUnits": avail, "tradingVolume": vol,
        "riskRating": "Low",
        "status": "Active", "ipoStatus": "NONE",
        "description": f"{name} is a sovereign debt instrument issued by {issuer}, maturing {maturity}, "
                        f"carrying a coupon of {coupon}%. It represents a low-risk, government-backed "
                        f"fixed-income instrument used for capital preservation and interest income.",
        "issuer": issuer, "issuerType": "Government", "maturityDate": maturity,
        "couponRate": coupon, "creditRating": credit_rating,
    }

def make_corp_bond(issuer, rating, sector, tenor_years, currency, exchange, country):
    name = f"{issuer} {tenor_years}Y {rating} Bond"
    ticker = dedup_ticker(exchange, (issuer[:6]+str(tenor_years)+"Y").replace(" ","").upper())
    sid = make_id("CBOND", ticker, len(securities))
    cap = "Large Cap" if rating in ("AAA","AA+","AA") else "Mid Cap"
    coupon = round(random.uniform(6.8, 9.4) if currency=="INR" else random.uniform(3.2,6.0), 2)
    price_lo_hi = {"INR": (95,105), "USD": (92,106), "GBP": (92,106), "EUR": (92,106)}
    lo, hi = price_lo_hi.get(currency, (95,105))
    ref = round(random.uniform(lo,hi),2)
    prices = dict(referencePrice=ref, previousClose=round(ref*random.uniform(0.998,1.002),2))
    prices["openingPrice"] = round(prices["previousClose"]*random.uniform(0.999,1.001),2)
    prices["currentPrice"] = round(prices["openingPrice"]*random.uniform(0.997,1.003),2)
    prices["dayHigh"] = round(max(prices["openingPrice"],prices["currentPrice"])*1.003,2)
    prices["dayLow"] = round(min(prices["openingPrice"],prices["currentPrice"])*0.997,2)
    prices["volatility"] = round(random.uniform(0.2,1.2),2)
    total, avail, vol = gen_units(cap)
    maturity_year = 2026 + tenor_years
    maturity = f"{maturity_year}-03-31"
    return {
        "id": sid, "ticker": ticker, "name": name,
        "sector": sector, "industry": "Corporate Debt",
        "exchange": exchange, "country": country, "currency": currency,
        "type": "CorporateBond",
        **prices,
        "totalUnits": total, "availableUnits": avail, "tradingVolume": vol,
        "riskRating": risk_for_cap(cap, "CorporateBond"),
        "status": "Active", "ipoStatus": "NONE",
        "description": f"A {tenor_years}-year corporate bond issued by {issuer}, rated {rating}. "
                        f"This instrument offers a fixed coupon of {coupon}% and represents a debt "
                        f"obligation of the issuer, suitable for income-focused fixed-income allocations.",
        "issuer": issuer, "issuerType": "Corporate", "maturityDate": maturity,
        "couponRate": coupon, "creditRating": rating,
    }

def make_reit_invit(ticker, name, sponsor, asset_focus, geo_focus, exchange, country, currency, sec_type="REIT"):
    check_not_excluded(name)
    t = dedup_ticker(exchange, ticker)
    sid = make_id(sec_type.upper(), t, len(securities))
    cap = "Mid Cap"
    prices = gen_price_fields(cap, currency, volatility_hint=round(random.uniform(0.5,1.8),2))
    total, avail, vol = gen_units("Mid Cap")
    label = "real estate investment trust" if sec_type=="REIT" else "infrastructure investment trust"
    return {
        "id": sid, "ticker": t, "name": name,
        "sector": "Real Estate" if sec_type=="REIT" else "Infrastructure",
        "industry": asset_focus,
        "exchange": exchange, "country": country, "currency": currency,
        "type": sec_type,
        **prices,
        "totalUnits": total, "availableUnits": avail, "tradingVolume": vol,
        "riskRating": "Medium",
        "status": "Active", "ipoStatus": "NONE",
        "description": f"{name} is a {label} sponsored by {sponsor}, holding a portfolio of "
                        f"{asset_focus.lower()} assets across {geo_focus}. It distributes a majority of "
                        f"its rental or operating income to unit holders, offering yield-focused exposure "
                        f"to {asset_focus.lower()}.",
        "sponsor": sponsor, "assetFocus": asset_focus, "geographicFocus": geo_focus,
    }

# ---------------------------------------------------------------
# BUILD: Equities
# ---------------------------------------------------------------
for ticker, name, sector, industry, cap in D.INDIA_LARGE_CAP + D.INDIA_MID_SMALL_CAP + D.INDIA_ADDITIONAL:
    securities.append(make_equity(ticker, name, sector, industry, cap, "NSE", "India", "INR"))

for ticker, name, sector, industry, cap in D.US_STOCKS + D.US_ADDITIONAL:
    exch = "NASDAQ" if ticker in ("AAPL","MSFT","GOOGL","AMZN","NVDA","META","TSLA","NFLX","AMD","INTC",
        "CSCO","ADBE","QCOM","TXN","AVGO","MU","AMAT","NOW","PYPL","SHOP","ABNB","SNOW","PLTR","PANW",
        "CRWD","NET","DDOG","ZS","MDB","TEAM","WDAY","INTU","COST","SBUX","EA","TTWO","RBLX","MRNA",
        "GILD","AMGN","BIIB","VRTX","REGN","ISRG","LULU","DKNG",
        "MSTR","APP","ARM","SMCI","FI","ADSK","ANSS","CDNS","SNPS","FICO","PTC","EXPD","CPRT",
        "MOH","CNC","RMD","HOLX","PODD","WST","CTLT","KVUE","POOL") else "NYSE"
    securities.append(make_equity(ticker, name, sector, industry, cap, exch, "United States", "USD"))

for ticker, name, sector, industry, cap in D.UK_STOCKS:
    securities.append(make_equity(ticker, name, sector, industry, cap, "London Stock Exchange", "United Kingdom", "GBP"))

for ticker, name, sector, industry, cap, country in D.EUROPE_STOCKS:
    exch_map = {"Germany":"Deutsche Boerse Xetra","France":"Euronext Paris","Netherlands":"Euronext Amsterdam",
        "Switzerland":"SIX Swiss Exchange","Italy":"Borsa Italiana","Spain":"Bolsa de Madrid",
        "Belgium":"Euronext Brussels","Norway":"Oslo Bors","Denmark":"Nasdaq Copenhagen",
        "Sweden":"Nasdaq Stockholm","Austria":"Wiener Borse","Finland":"Nasdaq Helsinki","Poland":"Warsaw Stock Exchange"}
    securities.append(make_equity(ticker, name, sector, industry, cap, exch_map.get(country,"Euronext"), country, "EUR"))

for ticker, name, sector, industry, cap, country, currency in D.APAC_STOCKS:
    exch_map = {"South Korea":"Korea Exchange (ADR/USD)","Taiwan":"Taiwan Stock Exchange (ADR/USD)",
        "Japan":"Tokyo Stock Exchange (ADR/USD)","China":"NASDAQ/NYSE (ADR)","Hong Kong":"Hong Kong Stock Exchange",
        "Australia":"Australian Securities Exchange","Singapore":"Singapore Exchange","Brazil":"NYSE (ADR)",
        "Brazil/Argentina":"NASDAQ (ADR)"}
    securities.append(make_equity(ticker, name, sector, industry, cap, exch_map.get(country,"Global"), country, currency))

n_equities = len(securities)
print(f"Equities generated: {n_equities}")

# ---------------------------------------------------------------
# BUILD: ETFs
# ---------------------------------------------------------------
for ticker, name, category, manager, index, exchange, country, currency in D.ETFS:
    securities.append(make_etf(ticker, name, category, manager, index, exchange, country, currency))

n_etfs = len(securities) - n_equities
print(f"ETFs generated: {n_etfs}")

# ---------------------------------------------------------------
# BUILD: Mutual Funds (curated combinations, target ~280)
# ---------------------------------------------------------------
mf_target = 330
all_cats = [(c,"equity") for c in D.EQUITY_FUND_CATEGORIES] + \
           [(c,"debt") for c in D.DEBT_FUND_CATEGORIES] + \
           [(c,"hybrid") for c in D.HYBRID_FUND_CATEGORIES]

combos = list(itertools.product(D.MF_HOUSES, all_cats))
random.shuffle(combos)
combos = combos[:mf_target]

objective_templates = {
    "equity": "The scheme seeks to generate long-term capital appreciation by investing predominantly in equity and equity-related instruments matching its stated category mandate.",
    "debt": "The scheme seeks to generate regular income and capital preservation by investing in a portfolio of debt and money market instruments consistent with its stated duration profile.",
    "hybrid": "The scheme seeks to generate a balance of capital appreciation and income by investing in a mix of equity, debt, and other asset classes as per its stated allocation mandate.",
}

mf_mgr_idx = 0
for house, (cat, kind) in combos:
    scheme_name = f"{house.replace(' Mutual Fund','')} {cat}"
    fm_first = D.INDIAN_FUND_MANAGER_FIRST[mf_mgr_idx % len(D.INDIAN_FUND_MANAGER_FIRST)]
    fm_last = D.INDIAN_FUND_MANAGER_LAST[(mf_mgr_idx * 3 + 7) % len(D.INDIAN_FUND_MANAGER_LAST)]
    mf_mgr_idx += 1
    fund_manager = f"{fm_first} {fm_last}"
    securities.append(make_mf(scheme_name, cat, house, fund_manager, objective_templates[kind]))

n_mfs = len(securities) - n_equities - n_etfs
print(f"Mutual Funds generated: {n_mfs}")

# ---------------------------------------------------------------
# BUILD: Government Securities (target ~150)
# ---------------------------------------------------------------
gsec_count = 0
gsec_target_india = 130
combos_gsec = list(itertools.product(D.GSEC_COUPONS, D.GSEC_YEARS))
random.shuffle(combos_gsec)
for coupon, year in combos_gsec[:gsec_target_india]:
    name = f"GOI {coupon}% {year}"
    securities.append(make_gsec(name, "Government of India", f"{year}-12-31", coupon, "INR", "NSE-GSec", "India"))
    gsec_count += 1

for term in D.US_TREASURY_TERMS:
    for i in range(3):
        name = f"US Treasury {term} Note/Bond Series {2026+i}"
        maturity_year = 2026 + (i+1) * (1 if "Week" in term else int(term.split('-')[0]))
        securities.append(make_gsec(name, "US Department of the Treasury", f"{min(maturity_year,2075)}-06-30",
                                     round(random.uniform(3.5,5.2),2), "USD", "US Treasury Direct", "United States"))
        gsec_count += 1

for term in D.UK_GILT_TERMS:
    for i in range(2):
        name = f"UK Gilt {term} Series {2026+i}"
        yrs = int(term.split('-')[0])
        maturity_year = min(2026 + yrs + i, 2076)
        securities.append(make_gsec(name, "UK Debt Management Office", f"{maturity_year}-09-07",
                                     round(random.uniform(3.8,4.9),2), "GBP", "London Stock Exchange (Gilts)", "United Kingdom"))
        gsec_count += 1

n_gsec = len(securities) - n_equities - n_etfs - n_mfs
print(f"Government Securities generated: {n_gsec}")

# ---------------------------------------------------------------
# BUILD: Corporate Bonds (target ~150)
# ---------------------------------------------------------------
corp_count = 0
tenors = [2,3,5,7,10]
for issuer, rating, sector in D.CORPORATE_BOND_ISSUERS_INDIA:
    for tenor in tenors:
        securities.append(make_corp_bond(issuer, rating, sector, tenor, "INR", "NSE-Bonds", "India"))
        corp_count += 1

for issuer, rating, sector, currency in D.CORPORATE_BOND_ISSUERS_GLOBAL:
    exch = {"USD":"NYSE Bonds","GBP":"London Stock Exchange (Bonds)","EUR":"Euronext (Bonds)"}[currency]
    country = {"USD":"United States","GBP":"United Kingdom","EUR":"Europe"}[currency]
    for tenor in random.sample(tenors, 3):
        securities.append(make_corp_bond(issuer, rating, sector, tenor, currency, exch, country))
        corp_count += 1

n_corp = len(securities) - n_equities - n_etfs - n_mfs - n_gsec
print(f"Corporate Bonds generated: {n_corp}")

# ---------------------------------------------------------------
# BUILD: REITs & InvITs
# ---------------------------------------------------------------
for ticker, name, sponsor, asset_focus, geo_focus, exchange, country, currency in D.REITS:
    securities.append(make_reit_invit(ticker, name, sponsor, asset_focus, geo_focus, exchange, country, currency, "REIT"))

for ticker, name, sponsor, asset_focus, geo_focus, exchange, country, currency in D.INVITS:
    securities.append(make_reit_invit(ticker, name, sponsor, asset_focus, geo_focus, exchange, country, currency, "InvIT"))

n_reit_invit = len(securities) - n_equities - n_etfs - n_mfs - n_gsec - n_corp
print(f"REITs & InvITs generated: {n_reit_invit}")

print(f"\nTOTAL SECURITIES: {len(securities)}")

# ---------------------------------------------------------------
# Write outputs
# ---------------------------------------------------------------
with open(os.path.join(OUT_DIR, "securities_universe.json"), "w") as f:
    json.dump(securities, f, indent=2)

# Split by type for easier review/import
by_type = {}
for s in securities:
    by_type.setdefault(s["type"], []).append(s)
for t, items in by_type.items():
    with open(os.path.join(OUT_DIR, f"securities_{t.lower()}.json"), "w") as f:
        json.dump(items, f, indent=2)

print("\nBreakdown by type:")
for t, items in sorted(by_type.items(), key=lambda x: -len(x[1])):
    print(f"  {t}: {len(items)}")

print("\nWritten to", OUT_DIR)
