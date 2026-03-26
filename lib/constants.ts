// ─── Color Maps (from ui/styles.py) ───────────────────────────────────────
export const DECISION_COLORS: Record<string, string> = {
  STRONG_BUY: "#00cc44",
  BUY: "#66ff99",
  HOLD: "#ffcc00",
  SELL: "#ff9933",
  STRONG_SELL: "#ff3333",
};

export const SENTIMENT_COLORS: Record<string, string> = {
  POSITIVE: "#00cc44",
  positive: "#00cc44",
  NEUTRAL: "#ffcc00",
  neutral: "#ffcc00",
  NEGATIVE: "#ff3333",
  negative: "#ff3333",
};

export const HEALTH_COLORS: Record<string, string> = {
  Safe: "#00cc44",
  Strong: "#00cc44",
  "Grey Zone": "#ffcc00",
  Moderate: "#ffcc00",
  Distress: "#ff3333",
  Weak: "#ff3333",
  "Likely Manipulator": "#ff3333",
  Unlikely: "#00cc44",
};

// ─── VIX Thresholds ──────────────────────────────────────────────────────
export const VIX_CAUTION_THRESHOLD = 20.0;
export const VIX_PANIC_THRESHOLD = 25.0;

// ─── Default Tickers ─────────────────────────────────────────────────────
export const DEFAULT_US_TICKERS = [
  "AAPL", "MSFT", "GOOGL", "AMZN", "META", "TSLA", "NVDA", "JPM", "V", "WMT",
];

export const DEFAULT_IND_TICKERS = [
  "SBIN", "LT", "MARUTI", "TITAN",
];

export const DEFAULT_FML_TICKERS = [
  "MSFT", "GOOG", "NVDA", "AMD",
];

// ─── Nifty 50 Constituents ───────────────────────────────────────────────
export const NIFTY_50_TICKERS = [
  "RELIANCE", "TCS", "HDFCBANK", "INFY", "ICICIBANK",
  "HINDUNILVR", "ITC", "SBIN", "BHARTIARTL", "BAJFINANCE",
  "KOTAKBANK", "LT", "HCLTECH", "AXISBANK", "ASIANPAINT",
  "MARUTI", "SUNPHARMA", "TITAN", "ULTRACEMCO", "WIPRO",
  "NESTLEIND", "BAJAJFINSV", "TATAMOTORS", "NTPC", "TATASTEEL",
  "POWERGRID", "M&M", "ONGC", "JSWSTEEL", "ADANIPORTS",
  "TECHM", "INDUSINDBK", "HINDALCO", "DIVISLAB", "DRREDDY",
  "CIPLA", "BRITANNIA", "EICHERMOT", "COALINDIA", "BPCL",
  "APOLLOHOSP", "GRASIM", "TATACONSUM", "SBILIFE", "HDFCLIFE",
  "ADANIENT", "HEROMOTOCO", "BAJAJ-AUTO", "LTIM", "UPL",
];

// ─── Top 50 NASDAQ Stocks ────────────────────────────────────────────────
export const NASDAQ_50_TICKERS = [
  "AAPL", "MSFT", "AMZN", "NVDA", "META", "GOOGL", "GOOG", "TSLA", "AVGO", "COST",
  "NFLX", "TMUS", "ADBE", "AMD", "PEP", "CSCO", "LIN", "INTC", "INTU", "CMCSA",
  "TXN", "QCOM", "AMGN", "ISRG", "AMAT", "HON", "BKNG", "LRCX", "SBUX", "VRTX",
  "MU", "ADI", "PANW", "GILD", "REGN", "MDLZ", "MELI", "KLAC", "SNPS", "CDNS",
  "PYPL", "ASML", "MAR", "CRWD", "CTAS", "ORLY", "MNST", "FTNT", "MRVL", "CSX",
];

export const DEFAULT_CRYPTO_TICKERS = ["ETH", "BTC", "LTC"];
export const DEFAULT_TTS_TICKERS = ["SPY", "QQQ", "IWM", "DIA"];

// ─── Score Interpretation Ranges ─────────────────────────────────────────
export const Z_SCORE_RANGES = [
  { label: "Safe", min: 2.99, color: "#00cc44", description: "Low bankruptcy risk" },
  { label: "Grey Zone", min: 1.81, color: "#ffcc00", description: "Moderate risk" },
  { label: "Distress", min: -Infinity, color: "#ff3333", description: "High bankruptcy risk" },
];

export const M_SCORE_RANGES = [
  { label: "Unlikely", threshold: -2.22, color: "#00cc44", description: "Unlikely earnings manipulator" },
  { label: "Likely Manipulator", threshold: Infinity, color: "#ff3333", description: "Possible earnings manipulation" },
];

export const F_SCORE_RANGES = [
  { label: "Strong", min: 8, color: "#00cc44", description: "Strong financial position" },
  { label: "Moderate", min: 5, color: "#ffcc00", description: "Moderate financial position" },
  { label: "Weak", min: 0, color: "#ff3333", description: "Weak financial position" },
];

// ─── Data Period Options ─────────────────────────────────────────────────
export const PERIOD_OPTIONS = [
  { value: "1mo", label: "1 Month" },
  { value: "3mo", label: "3 Months" },
  { value: "6mo", label: "6 Months" },
  { value: "1y", label: "1 Year" },
  { value: "2y", label: "2 Years" },
  { value: "5y", label: "5 Years" },
  { value: "custom", label: "Custom" },
];

export const HISTORY_PERIOD_OPTIONS = [
  { value: "7", label: "7 Days" },
  { value: "14", label: "14 Days" },
  { value: "30", label: "30 Days" },
  { value: "90", label: "90 Days" },
  { value: "custom", label: "Custom Range" },
];

// ─── Spinner Messages ────────────────────────────────────────────────────
export const SPINNER_MESSAGES = [
  "Analyzing market signals…",
  "Crunching the numbers…",
  "Scanning news feeds…",
  "Evaluating fundamentals…",
  "Running sentiment analysis…",
  "Calculating technical indicators…",
  "Mining alpha signals…",
  "Processing market data…",
  "Evaluating risk factors…",
  "Building the intelligence report…",
];

export const RAG_SPINNER_MESSAGES = [
  "Diving deep into your documents…",
  "Summoning insights from the vault…",
  "Connecting the dots across pages…",
  "Mining your knowledge base for gold…",
  "Crunching context at light speed…",
  "Reading between the lines for you…",
  "Paging through the archives…",
  "Hunting for the perfect answer…",
  "Cross-referencing your strategy docs…",
  "Assembling intelligence from the KB…",
];

// ─── FML Categories ──────────────────────────────────────────────────────
export const FML_CATEGORIES = [
  "Data Structures",
  "Features",
  "Modeling",
  "Backtesting",
  "Portfolio",
  "Computation",
];

export const TTS_CATEGORIES = [
  "Foundations",
  "Optimization",
  "Performance Estimation",
  "Statistical Testing",
];

// ─── Nav Routes ──────────────────────────────────────────────────────────
export const APP_MODULES = [
  { key: "us-stocks", label: "US Stocks", href: "/us-stocks" },
  { key: "ind-stocks", label: "Ind Stocks", href: "/ind-stocks" },
  { key: "rl-bot", label: "RL Bot", href: "/rl-bot" },
  { key: "financial-ml", label: "Financial ML", href: "/financial-ml" },
  { key: "test-tune", label: "Test & Tune", href: "/test-tune" },
  { key: "crypto", label: "Crypto", href: "/crypto" },
  { key: "rag-engine", label: "RAG Engine", href: "/rag-engine" },
] as const;

export const US_SUB_PAGES = [
  { key: "main", label: "Main", href: "/us-stocks" },
  { key: "fundamentals", label: "Fundamentals", href: "/us-stocks/fundamentals" },
  { key: "verdict", label: "Verdict", href: "/us-stocks/verdict" },
  { key: "backtest", label: "Backtest", href: "/us-stocks/backtest" },
  { key: "holdings", label: "Holdings", href: "/us-stocks/holdings" },
  { key: "history", label: "History", href: "/us-stocks/history" },
];

export const IND_SUB_PAGES = [
  { key: "main", label: "Main", href: "/ind-stocks" },
  { key: "fly-kite", label: "Fly Kite", href: "/ind-stocks/fly-kite" },
  { key: "fundamentals", label: "Fundamentals", href: "/ind-stocks/fundamentals" },
  { key: "screener", label: "Screener", href: "/ind-stocks/screener" },
  { key: "verdict", label: "Verdict", href: "/ind-stocks/verdict" },
  { key: "backtest", label: "Backtest", href: "/ind-stocks/backtest" },
  { key: "options", label: "Options", href: "/ind-stocks/options" },
  { key: "history", label: "History", href: "/ind-stocks/history" },
];

// ─── Output Format Options ───────────────────────────────────────────────
export const OUTPUT_FORMATS = [
  { value: "xlsx", label: "Excel (.xlsx)" },
  { value: "csv", label: "CSV (.csv)" },
];

// ─── Index Options (Options page) ────────────────────────────────────────
export const INDEX_OPTIONS = ["NIFTY", "BANKNIFTY", "FINNIFTY", "MIDCPNIFTY"];

// ─── Verdict Layers ──────────────────────────────────────────────────────
export const VERDICT_LAYERS = ["core", "strategy", "ml_features"];

// ─── Stop-Loss Methods ──────────────────────────────────────────────────
export const SL_METHODS = [
  { value: "tighter", label: "Tighter" },
  { value: "ma50", label: "MA 50" },
  { value: "swing_low", label: "Swing Low" },
];
