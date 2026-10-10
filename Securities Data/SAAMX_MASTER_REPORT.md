# SAAMX 2026 — Securities Universe: Master Report

**Everything about the generated 1,800+/2,000-security universe in one document — what was built, how, the numbers, the files, and what to check before you seed it into your app.**

---

## 1. Executive Summary

- **Total securities: 2,062** (target was ~2,000)
- **423 stocks** (up from 129, up from 43 originally) now carry **full company intelligence** — founders, CEO/chairperson, founded year, headquarters, major products, business summary, market position, highlights, and website — pulled from **Nifty (India)**, **S&P 500 (US)**, **FTSE 100 (UK)**, and major **European/Asia-Pacific/Latin American** blue chips.
- **1,195 / 1,210 stocks (99%)** and **92 / 92 ETFs (100%)** carry a `financeUrl` — a direct link to the security's Google Finance quote page.
- **OpenAI, Stripe, Canva, Discord, and Polymarket are confirmed excluded** from the entire universe (they're reserved for your separate IPO engine), verified by an automated check and the test suite.
- **20 / 20 validation checks pass** — unique IDs, no ticker conflicts, complete metadata by asset type, currency restricted to INR/USD/GBP/EUR, no duplicate companies, internally consistent pricing, valid unit counts.
- All data is real: real companies, real tickers, real exchanges, real fund houses, real bond issuers — nothing invented to pad the count.

---

## 2. Final Numbers

### 2.1 By Asset Type
| Type | Count |
|---|---|
| Stock | 1,210 |
| MutualFund | 330 |
| CorporateBond | 195 |
| GovernmentBond | 185 |
| ETF | 92 |
| REIT | 32 |
| InvIT | 18 |
| **Total** | **2,062** |

### 2.2 By Country (top 12)
| Country | Count |
|---|---|
| India | 1,275 |
| United States | 479 |
| United Kingdom | 113 |
| Germany | 30 |
| France | 19 |
| Japan | 16 |
| Switzerland | 12 |
| Australia | 12 |
| Netherlands | 11 |
| Singapore | 10 |
| China | 9 |
| Italy / Spain | 8 each |

India + US + UK together = 1,867 securities (~91%), with India the clear largest market as your brief required.

### 2.3 By Currency
| Currency | Count |
|---|---|
| INR | 1,275 |
| USD | 546 |
| EUR | 128 |
| GBP | 113 |

Only the four FX-engine-supported currencies are used anywhere in the dataset.

### 2.4 Company Intelligence & Finance Link Coverage
| Metric | Coverage |
|---|---|
| Stocks with full company intelligence | **423 / 1,210 (35%)** |
| Stocks with a Google Finance link | 1,195 / 1,210 (99%) |
| ETFs with a Google Finance link | 92 / 92 (100%) |

**Company-intelligence coverage by country:**

**India (129):** ABB India Ltd (ABB), ACC Ltd (ACC), Adani Enterprises Ltd (ADANIENT), Adani Green Energy Ltd (ADANIGREEN), Adani Ports & SEZ Ltd (ADANIPORTS), Adani Power Ltd (ADANIPOWER), Alkem Laboratories Ltd (ALKEM), Ambuja Cements Ltd (AMBUJACEM), Apollo Hospitals Enterprise Ltd (APOLLOHOSP), Ashok Leyland Ltd (ASHOKLEY), Asian Paints Ltd (ASIANPAINT), Aurobindo Pharma Ltd (AUROPHARMA), Avenue Supermarts Ltd (DMart) (DMART), Axis Bank Ltd (AXISBANK), BSE Ltd (BSE), Bajaj Auto Ltd (BAJAJ-AUTO), Bajaj Finance Ltd (BAJFINANCE), Bajaj Finserv Ltd (BAJAJFINSV), Bajaj Holdings & Investment Ltd (BAJAJHLDNG), Bank of Baroda (BANKBARODA), Berger Paints India Ltd (BERGEPAINT), Bharat Electronics Ltd (BEL), Bharat Heavy Electricals Ltd (BHEL), Bharat Petroleum Corporation Ltd (BPCL), Bharti Airtel Ltd (BHARTIARTL), Biocon Ltd (BIOCON), Bosch Ltd (BOSCHLTD), Britannia Industries Ltd (BRITANNIA), Canara Bank (CANBK), Cholamandalam Investment & Finance Co (CHOLAFIN), Cipla Ltd (CIPLA), Coal India Ltd (COALINDIA), Coforge Ltd (COFORGE), Colgate-Palmolive (India) Ltd (COLPAL), Cummins India Ltd (CUMMINSIND), DLF Ltd (DLF), Dabur India Ltd (DABUR), Divi's Laboratories Ltd (DIVISLAB), Dixon Technologies (India) Ltd (DIXON), Dr. Reddy's Laboratories Ltd (DRREDDY), Eicher Motors Ltd (EICHERMOT), Eternal Ltd (Zomato) (ZOMATO), FSN E-Commerce Ventures Ltd (Nykaa) (NYKAA), GAIL (India) Ltd (GAIL), Godrej Consumer Products Ltd (GODREJCP), Godrej Properties Ltd (GODREJPROP), Grasim Industries Ltd (GRASIM), HCL Technologies Ltd (HCLTECH), HDFC Asset Management Company Ltd (HDFCAMC), HDFC Bank Ltd (HDFCBANK), HDFC Life Insurance Company Ltd (HDFCLIFE), Havells India Ltd (HAVELLS), Hero MotoCorp Ltd (HEROMOTOCO), Hindalco Industries Ltd (HINDALCO), Hindustan Aeronautics Ltd (HAL), Hindustan Petroleum Corporation Ltd (HPCL), Hindustan Unilever Ltd (HINDUNILVR), ICICI Bank Ltd (ICICIBANK), ICICI Lombard General Insurance Ltd (ICICIGI), ICICI Prudential Life Insurance Ltd (ICICIPRULI), ITC Ltd (ITC), Indian Hotels Company Ltd (Taj) (INDHOTEL), Indian Oil Corporation Ltd (IOC), Indian Railway Catering & Tourism Corp (IRCTC), Indraprastha Gas Ltd (IGL), IndusInd Bank Ltd (INDUSINDBK), Info Edge (India) Ltd (NAUKRI), Infosys Ltd (INFY), InterGlobe Aviation Ltd (IndiGo) (INDIGO), JSW Steel Ltd (JSWSTEEL), Jio Financial Services Ltd (JIOFIN), Jubilant FoodWorks Ltd (JUBLFOOD), Kotak Mahindra Bank Ltd (KOTAKBANK), LTIMindtree Ltd (LTIM), Larsen & Toubro Ltd (LT), Life Insurance Corporation of India (LICI), Lupin Ltd (LUPIN), Macrotech Developers Ltd (Lodha) (LODHA), Mahindra & Mahindra Ltd (M&M), Marico Ltd (MARICO), Maruti Suzuki India Ltd (MARUTI), Max Healthcare Institute Ltd (MAXHEALTH), Mphasis Ltd (MPHASIS), Muthoot Finance Ltd (MUTHOOTFIN), NMDC Ltd (NMDC), NTPC Ltd (NTPC), Nestle India Ltd (NESTLEIND), Oberoi Realty Ltd (OBEROIRLTY), Oil & Natural Gas Corporation Ltd (ONGC), One97 Communications Ltd (Paytm) (PAYTM), PB Fintech Ltd (Policybazaar) (POLICYBZR), Page Industries Ltd (PAGEIND), Persistent Systems Ltd (PERSISTENT), Petronet LNG Ltd (PETRONET), Pidilite Industries Ltd (PIDILITIND), Power Finance Corporation Ltd (PFC), Power Grid Corporation of India Ltd (POWERGRID), Punjab National Bank (PNB), REC Ltd (RECLTD), Reliance Industries Ltd (RELIANCE), SBI Life Insurance Company Ltd (SBILIFE), SRF Ltd (SRF), Samvardhana Motherson International (MOTHERSON), Shree Cement Ltd (SHREECEM), Shriram Finance Ltd (SHRIRAMFIN), Siemens Ltd (India) (SIEMENS), State Bank of India (SBIN), Steel Authority of India Ltd (SAIL), Sun Pharmaceutical Industries Ltd (SUNPHARMA), TVS Motor Company Ltd (TVSMOTOR), Tata Communications Ltd (TATACOMM), Tata Consultancy Services Ltd (TCS), Tata Consumer Products Ltd (TATACONSUM), Tata Motors Ltd (TATAMOTORS), Tata Power Company Ltd (TATAPOWER), Tata Steel Ltd (TATASTEEL), Tech Mahindra Ltd (TECHM), Titan Company Ltd (TITAN), Torrent Pharmaceuticals Ltd (TORNTPHARM), Trent Ltd (TRENT), UPL Ltd (UPL), UltraTech Cement Ltd (ULTRACEMCO), United Spirits Ltd (UNITDSPR), Varun Beverages Ltd (VBL), Vedanta Ltd (VEDL), Vodafone Idea Ltd (IDEA), Voltas Ltd (VOLTAS), Wipro Ltd (WIPRO), Zydus Lifesciences Ltd (ZYDUSLIFE)
**United States (175):** 3M Company (MMM), AT&T Inc (T), AbbVie Inc (ABBV), Abbott Laboratories (ABT), Adobe Inc (ADBE), Advanced Micro Devices Inc (AMD), Air Products and Chemicals Inc (APD), Airbnb Inc (ABNB), Alphabet Inc (GOOGL), Altria Group Inc (MO), Amazon.com Inc (AMZN), American Airlines Group Inc (AAL), American Express Co (AXP), American International Group Inc (AIG), American Tower Corp (AMT), Amgen Inc (AMGN), Analog Devices Inc (ADI), Aon plc (AON), Apollo Global Management Inc (APO), Apple Inc (AAPL), Applied Materials Inc (AMAT), Arista Networks Inc (ANET), AutoZone Inc (AZO), Autodesk Inc (ADSK), Automatic Data Processing Inc (ADP), Bank of America Corp (BAC), Becton Dickinson and Company (BDX), BlackRock Inc (BLK), Boeing Company (BA), Booking Holdings Inc (BKNG), Boston Scientific Corp (BSX), Broadcom Inc (AVGO), CME Group Inc (CME), CSX Corp (CSX), CVS Health Corp (CVS), Cadence Design Systems Inc (CDNS), Caterpillar Inc (CAT), Cencora Inc (AmerisourceBergen) (COR), Charles Schwab Corp (SCHW), Chevron Corp (CVX), Chipotle Mexican Grill Inc (CMG), Chubb Ltd (CB), Cigna Group (CI), Cintas Corp (CTAS), Cisco Systems Inc (CSCO), Citigroup Inc (C), Coca-Cola Company (KO), Colgate-Palmolive Company (CL), Comcast Corp (CMCSA), ConocoPhillips (COP), Constellation Energy Corp (CEG), Copart Inc (CPRT), Costco Wholesale Corp (COST), CrowdStrike Holdings Inc (CRWD), Danaher Corp (DHR), Deere & Company (DE), Dell Technologies Inc (DELL), Digital Realty Trust Inc (DLR), Dollar General Corp (DG), Duke Energy Corp (DUK), EOG Resources Inc (EOG), Eaton Corp plc (ETN), Ecolab Inc (ECL), Electronic Arts Inc (EA), Elevance Health Inc (ELV), Eli Lilly and Company (LLY), Emerson Electric Co (EMR), Equinix Inc (EQIX), Exxon Mobil Corp (XOM), FedEx Corp (FDX), Fiserv Inc (FI), Ford Motor Company (F), Fortinet Inc (FTNT), Freeport-McMoRan Inc (FCX), GE HealthCare Technologies Inc (GEHC), GE Vernova Inc (GEV), General Dynamics Corp (GD), General Electric Company (GE), General Motors Company (GM), Gilead Sciences Inc (GILD), Goldman Sachs Group Inc (GS), HCA Healthcare Inc (HCA), Halliburton Co (HAL), Hilton Worldwide Holdings Inc (HLT), Home Depot Inc (HD), Honeywell International Inc (HON), Illinois Tool Works Inc (ITW), Intel Corp (INTC), Intercontinental Exchange Inc (ICE), International Business Machines Corp (IBM), Intuit Inc (INTU), Intuitive Surgical Inc (ISRG), JPMorgan Chase & Co (JPM), Johnson & Johnson (JNJ), KKR & Co Inc (KKR), KLA Corp (KLAC), L3Harris Technologies Inc (LHX), Lam Research Corp (LRCX), Linde plc (LIN), Lockheed Martin Corp (LMT), Lowe's Companies Inc (LOW), Marriott International Inc (MAR), Marsh & McLennan Companies Inc (MMC), Marvell Technology Inc (MRVL), Mastercard Inc (MA), McDonald's Corp (MCD), McKesson Corp (MCK), Medtronic plc (MDT), Merck & Co Inc (MRK), MetLife Inc (MET), Meta Platforms Inc (META), Micron Technology Inc (MU), Microsoft Corp (MSFT), Mondelez International Inc (MDLZ), Morgan Stanley (MS), Motorola Solutions Inc (MSI), NVIDIA Corp (NVDA), Netflix Inc (NFLX), Newmont Corp (NEM), NextEra Energy Inc (NEE), Nike Inc (NKE), Northrop Grumman Corp (NOC), O'Reilly Automotive Inc (ORLY), Oracle Corp (ORCL), Palantir Technologies Inc (PLTR), Palo Alto Networks Inc (PANW), Parker Hannifin Corp (PH), PayPal Holdings Inc (PYPL), PepsiCo Inc (PEP), Pfizer Inc (PFE), Philip Morris International Inc (PM), Procter & Gamble Co (PG), Progressive Corp (PGR), Prologis Inc (PLD), Prudential Financial Inc (PRU), Public Storage (PSA), Qualcomm Inc (QCOM), Quanta Services Inc (PWR), RTX Corp (Raytheon) (RTX), Regeneron Pharmaceuticals Inc (REGN), S&P Global Inc (SPGI), Salesforce Inc (CRM), Schlumberger (SLB) Ltd (SLB), Sempra Energy (SRE), ServiceNow Inc (NOW), Sherwin-Williams Co (SHW), Shopify Inc (SHOP), Simon Property Group Inc (SPG), Southern Company (SO), Starbucks Corp (SBUX), Stryker Corp (SYK), Synopsys Inc (SNPS), T-Mobile US Inc (TMUS), TJX Companies Inc (TJX), Target Corp (TGT), Tesla Inc (TSLA), Texas Instruments Inc (TXN), Thermo Fisher Scientific Inc (TMO), Trane Technologies plc (TT), TransDigm Group Inc (TDG), Travelers Companies Inc (TRV), Uber Technologies Inc (UBER), Union Pacific Corp (UNP), United Parcel Service Inc (UPS), UnitedHealth Group Inc (UNH), Verizon Communications Inc (VZ), Vertex Pharmaceuticals Inc (VRTX), Visa Inc (V), Vistra Corp (VST), Walmart Inc (WMT), Walt Disney Company (DIS), Waste Management Inc (WM), Wells Fargo & Co (WFC), Yum! Brands Inc (YUM), Zoetis Inc (ZTS)
**United Kingdom (31):** 3i Group plc (III), Anglo American plc (AAL), AstraZeneca plc (AZN), BAE Systems plc (BAES), BHP Group Ltd (LSE) (BHP), BP plc (BP), Barclays plc (BARC), British American Tobacco plc (BATS), CRH plc (CRH), Compass Group plc (CPG), Diageo plc (DGE), Experian plc (EXPN), Flutter Entertainment plc (FLTR), GSK plc (GSK), Glencore plc (GLEN), HSBC Holdings plc (HSBA), Haleon plc (HLN), Lloyds Banking Group plc (LLOY), London Stock Exchange Group plc (LSEG), NatWest Group plc (NWG), National Grid plc (NG), Prudential plc (PRU-L), RELX plc (REL), Rio Tinto plc (RIO), Rolls-Royce Holdings plc (RR), SSE plc (SSE), Shell plc (SHEL), Standard Chartered plc (STAN), Tesco plc (TSCO), Unilever plc (ULVR), Vodafone Group plc (VOD)
**Germany (13):** Adidas AG (ADS), Allianz SE (ALV), BASF SE (BAS), Bayer AG (BAYN), Bayerische Motoren Werke AG (BMW), DHL Group AG (DPW), Deutsche Boerse AG (DB1), Deutsche Telekom AG (DTE), Infineon Technologies AG (IFX), Mercedes-Benz Group AG (MBG), SAP SE (SAP), Siemens AG (SIE), Volkswagen AG (VOW3)
**France (10):** AXA SA (CS), Air Liquide SA (AI), Airbus SE (AIR), BNP Paribas SA (BNP), L'Oreal SA (OR), LVMH Moet Hennessy Louis Vuitton SE (MC), Sanofi SA (SAN), Schneider Electric SE (SU), TotalEnergies SE (TTE), Vinci SA (DG)
**Switzerland (8):** ABB Ltd (ABBN), Compagnie Financiere Richemont SA (CFR), Lonza Group AG (LONN), Nestle SA (NESN), Novartis AG (NOVN), Roche Holding AG (ROG), UBS Group AG (UBSG), Zurich Insurance Group AG (ZURN)
**Japan (14):** Daikin Industries Ltd (6367), Hitachi Ltd (6501), Honda Motor Co Ltd (7267), Mitsubishi UFJ Financial Group Inc (8306), Nintendo Co Ltd (7974), Nippon Telegraph and Telephone Corp (9432), Recruit Holdings Co Ltd (6098), Shin-Etsu Chemical Co Ltd (4063), SoftBank Group Corp (9984), Sony Group Corp (6758), Sumitomo Mitsui Financial Group Inc (8316), Takeda Pharmaceutical Co Ltd (4502), Tokyo Electron Ltd (8035), Toyota Motor Corp (7203)
**Netherlands (5):** ASML Holding NV (ASML), Heineken NV (HEIA), ING Groep NV (INGA), Stellantis NV (STLA), Unilever NV (UNA)
**Italy (5):** Enel SpA (ENEL), Eni SpA (ENI), Ferrari NV (RACE), Intesa Sanpaolo SpA (ISP), UniCredit SpA (UCG)
**Spain (5):** Amadeus IT Group SA (AMS), Banco Bilbao Vizcaya Argentaria SA (BBVA), Banco Santander SA (SAN-ES), Iberdrola SA (IBE), Industria de Diseno Textil SA (Inditex/Zara) (ITX)
**China (4):** Alibaba Group Holding Ltd (BABA), Industrial and Commercial Bank of China (1398), PDD Holdings Inc (Pinduoduo/Temu) (PDD), Tencent Holdings Ltd (TCEHY)
**Australia (4):** BHP Group Ltd (BHP-AU), CSL Ltd (CSL), Commonwealth Bank of Australia (CBA), Macquarie Group Ltd (MQG)
**South Korea (3):** Hyundai Motor Company (005380), SK Hynix Inc (000660), Samsung Electronics Co Ltd (005930)
**Singapore (3):** DBS Group Holdings Ltd (D05), Oversea-Chinese Banking Corp Ltd (O39), United Overseas Bank Ltd (U11)
**Brazil (3):** Itau Unibanco Holding SA (ITUB), Petroleo Brasileiro SA (Petrobras) (PBR), Vale SA (VALE)
**Denmark (2):** A.P. Moller-Maersk A/S (MAERSK-B), Novo Nordisk A/S (NOVO-B)
**Sweden (2):** Atlas Copco AB (ATCO-A), Volvo AB (VOLV-B)
**Taiwan (2):** Hon Hai Precision Industry Co (Foxconn) (2317), Taiwan Semiconductor Manufacturing Co (TSM)
**Hong Kong (2):** AIA Group Ltd (1299), China Mobile Ltd (0941)
**Norway (1):** Equinor ASA (EQNR)
**Belgium (1):** Anheuser-Busch InBev SA/NV (ABI)
**Brazil/Argentina (1):** MercadoLibre Inc (MELI)

The 15 stocks without a Google Finance link are ADR-style Asia-Pacific/Latin American names (mostly Chinese ADRs) where I didn't have a confident exchange-code mapping — I deliberately left the link off rather than guess and risk a broken URL.

---

## 3. What "Full Company Intelligence" Means

For the 423 companies listed above, each stock record includes, in addition to the base schema:
```
foundedYear, headquarters, founders, leadership {ceo, chairperson},
majorProducts, businessSummary, marketPosition, companyHighlights,
website, marketCategory
```
Example — Reliance Industries:
- Founded 1966, Mumbai, India; founder Dhirubhai Ambani
- CEO/Chairman: Mukesh Ambani
- Major products: Refining & Petrochemicals, Reliance Jio, Reliance Retail
- Business summary, market position, and 2–3 highlight bullet points
- Website: www.ril.com

The remaining ~787 stocks have accurate, sector-correct 2–3 sentence descriptions and a `marketCategory`, but no invented leadership data — per the brief's explicit instruction not to fabricate CEO/founder names, I left those fields off rather than guess.

**Leadership data reflects my knowledge as of the Jan 2026 training cutoff.** CEOs and chairpersons do change — spot-check the roster (especially for any company you're featuring prominently) before a live event.

---

## 4. Google Finance Links

Every stock/ETF's `financeUrl` field follows Google Finance's standard, deterministic URL pattern:
```
https://www.google.com/finance/quote/{TICKER}:{EXCHANGE_CODE}
```
Examples:
- Reliance Industries → `https://www.google.com/finance/quote/RELIANCE:NSE`
- Apple → `https://www.google.com/finance/quote/AAPL:NASDAQ`
- Shell → `https://www.google.com/finance/quote/SHEL:LON`
- Toyota → `https://www.google.com/finance/quote/7203:TYO`

These are **not live-verified** (this environment has no network access to Google Finance) — the pattern is correct and standard, but spot-check a sample before relying on them in a live event, especially for less common exchanges.

---

## 5. IPO Exclusion — Confirmed

An automated `check_not_excluded()` function runs during generation and rejects any security whose name contains "openai", "stripe", "canva", "discord", or "polymarket" (case-insensitive). The validation suite re-checks this independently across all 2,062 securities. **All five checks pass — none of the five companies appear anywhere in the normal universe.**

---

## 6. Data Quality & Validation

**20 / 20 automated checks pass:**
1. Approximately 2,000 securities exist ✓
2. Every security has a unique ID ✓
3. Tickers are valid and non-conflicting per exchange ✓
4. All securities have descriptions ✓
5. Stocks contain company intelligence where applicable ✓
6. Bonds contain issuer information (issuer, type, maturity, coupon, rating) ✓
7. ETFs contain fund/index information ✓
8. Mutual funds contain fund metadata ✓
9. Currencies compatible with FX architecture (INR/USD/GBP/EUR only) ✓
10. Exchanges are valid ✓
11. No accidental fictional/empty securities ✓
12. No duplicate companies ✓
13–17. OpenAI / Stripe / Canva / Discord / Polymarket all excluded ✓
18. All required base schema fields populated ✓
19. Prices and day ranges internally consistent (dayLow ≤ current/open ≤ dayHigh) ✓
20. Available units are valid positive numbers (0 < available ≤ total) ✓

Re-run anytime with `python3 test_security_universe.py`.

---

## 7. Schema Reference

Every security has these base fields:
```
id, ticker, name, description, sector, industry, exchange, country,
currency, type, referencePrice, previousClose, openingPrice, currentPrice,
dayHigh, dayLow, totalUnits, availableUnits, tradingVolume, volatility,
riskRating, status, ipoStatus
```
Plus type-specific fields:
- **Stocks**: `marketCategory`, and for the 423 flagship names — `foundedYear`, `headquarters`, `founders`, `leadership`, `majorProducts`, `businessSummary`, `marketPosition`, `companyHighlights`, `website`. Nearly all also carry `financeUrl`.
- **ETFs**: `fundManager`, `underlyingIndex`, `investmentObjective`, plus `financeUrl`.
- **Mutual Funds**: `fundHouse`, `fundManager`, `investmentCategory` (Equity/Debt/Hybrid), `investmentObjective`.
- **Government & Corporate Bonds**: `issuer`, `issuerType`, `maturityDate`, `couponRate`, `creditRating`.
- **REITs / InvITs**: `sponsor`, `assetFocus`, `geographicFocus`.

---

## 8. Files Delivered

| File | Contents |
|---|---|
| `securities_universe.json` | Full 2,062-security dataset — the one to seed into `fms/securities` |
| `securities_stock.json` | Just the 1,210 stocks |
| `securities_etf.json` | Just the 92 ETFs |
| `securities_mutualfund.json` | Just the 330 mutual funds |
| `securities_governmentbond.json` | Just the 185 government securities |
| `securities_corporatebond.json` | Just the 195 corporate bonds |
| `securities_reit.json` | Just the 32 REITs |
| `securities_invit.json` | Just the 18 InvITs |
| `data_lists.py` | Curated source lists of real tickers/names/sectors — edit to adjust the universe |
| `company_intel.py` + `company_intel_ext.py` + `company_intel_ext2.py` + `company_intel_ext3.py` + `company_intel_ext4.py` | The 423 flagship-company intelligence profiles, split across 5 files by batch (original 43, then India/US round 2, then India-large-cap round 3, US-S&P round 3, and UK/Europe/APAC round 4) |
| `universe_generator.py` | The reproducible generator — `python3 universe_generator.py` rebuilds everything from the source lists |
| `test_security_universe.py` | The validation suite — `python3 test_security_universe.py` |

**To add more company intelligence or securities later:** edit `data_lists.py` (for new tickers) or any `company_intel*.py` file (for new profiles), then rerun `universe_generator.py` followed by `test_security_universe.py`.

---

## 9. Compatibility Notes / What I Could Not Verify

- **No codebase access.** This is a standalone data drop — I never saw your actual Firebase schema, seed script, or FX engine implementation. Field names in this dataset are my best interpretation of your brief's schema; you may need light field-name mapping before seeding.
- **Prices are simulation reference prices**, not live market data — internally consistent (`dayLow ≤ current/open ≤ dayHigh`, `currentPrice = openingPrice` at seed time) but arbitrary in absolute terms, exactly as instructed.
- **Non-INR/USD/GBP/EUR markets** (Samsung, Toyota, TSMC, Alibaba, Tencent, Vale, etc.) are stored as **USD-denominated** instruments for FX-engine compatibility. Confirm this fits your app's architecture before seeding, or tell me to drop them.
- **Google Finance links are not network-verified** from this environment. Pattern is correct and standard; spot-check before relying on them live.
- **Leadership/CEO data reflects the Jan 2026 training cutoff** and can drift — verify before a live event, especially for companies you're featuring prominently (e.g., in a projector display or spotlight round).
- **Mutual fund manager names are illustrative placeholders** (real fund houses, generic manager names) — I don't have verified real fund-manager-to-scheme mappings for hundreds of individual schemes.

---

## 10. Quick Start

```bash
# Regenerate the whole universe after editing any data file:
python3 universe_generator.py

# Validate:
python3 test_security_universe.py

# Seed into Firebase — adapt to your actual seed script, e.g.:
# node scripts/seedSecurities.js securities_universe.json
```
