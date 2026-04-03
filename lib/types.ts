// ─── Enums ────────────────────────────────────────────────────────────────
export type DecisionTag = "STRONG_BUY" | "BUY" | "HOLD" | "SELL" | "STRONG_SELL";
export type SentimentLabel = "POSITIVE" | "NEGATIVE" | "NEUTRAL";
export type AnalysisStatus = "PENDING" | "RUNNING" | "COMPLETED" | "FAILED";
export type OrderStatus = "PLACED" | "FILLED" | "SL_TRIGGERED" | "TP_FILLED" | "CANCELLED" | "REJECTED" | "FAILED";
export type Market = "US" | "IND";

// ─── News ─────────────────────────────────────────────────────────────────
export interface NewsItem {
  title: string;
  summary: string;
  url: string;
  timestamp: string;
  source: string;
  ticker: string;
  category: string;
  sentiment_score: number;
  sentiment_label: SentimentLabel;
  sentiment_confidence: number;
}

// ─── Stock Metrics ────────────────────────────────────────────────────────
export interface StockMetrics {
  ticker: string;
  current_price: number;
  rsi: number;
  macd: number;
  macd_signal: number;
  macd_histogram: number;
  bollinger_upper: number;
  bollinger_middle: number;
  bollinger_lower: number;
  altman_z_score: number;
  beneish_m_score: number;
  piotroski_f_score: number;
  adx: number;
  obv: number;
  obv_sma: number;
  volume_sma_20: number;
  max_drawdown: number;
}

// ─── Trading Signal ──────────────────────────────────────────────────────
export interface TradingSignal {
  news_item: NewsItem;
  metrics: StockMetrics | null;
  decision: DecisionTag;
  decision_score: number;
  reasoning: string;
  timestamp: string;
}

// ─── Analysis Run ─────────────────────────────────────────────────────────
export interface AnalysisRun {
  id: string;
  run_type: string;
  status: AnalysisStatus;
  market: Market;
  tickers: string[];
  total_signals: number;
  total_news_items: number;
  started_at: string;
  completed_at: string | null;
  duration_seconds: number | null;
  error_message: string | null;
  user_id: string | null;
}

export interface AnalysisResponse {
  run_id: string;
  signals: TradingSignal[];
  summary: {
    total: number;
    strong_buy: number;
    buy: number;
    hold: number;
    sell: number;
    strong_sell: number;
  };
}

// ─── Backtest ─────────────────────────────────────────────────────────────
export interface StrategyInfo {
  id: string;
  name: string;
  category: string;
  description: string;
  parameters: StrategyParam[];
}

export interface StrategyParam {
  name: string;
  type: "int" | "float" | "bool";
  default: number | boolean;
  min?: number;
  max?: number;
  step?: number;
  description?: string;
}

export interface BacktestRequest {
  strategy_id: string;
  tickers: string[];
  params: Record<string, number | boolean>;
  initial_capital: number;
  period: string;
  start_date?: string;
  end_date?: string;
  market: Market;
}

export interface BacktestResult {
  id: string;
  strategy_id: string;
  strategy_name: string;
  tickers: string[];
  total_return: number;
  sharpe_ratio: number;
  sortino_ratio: number;
  max_drawdown: number;
  total_trades: number;
  win_rate: number;
  final_value: number;
  initial_capital: number;
  charts: ChartData[];
  signals: BacktestSignal[];
  equity_curve: EquityPoint[];
  metrics: Record<string, unknown>;
  per_ticker?: Record<string, TickerMetrics>;
  created_at: string;
}

export interface TickerMetrics {
  total_return: number;
  sharpe_ratio: number;
  sortino_ratio: number;
  max_drawdown: number;
  total_trades: number;
  win_rate: number;
  final_value: number;
}

export interface ChartData {
  type: "matplotlib" | "plotly";
  data: string; // base64 PNG or plotly JSON
  title?: string;
}

export interface BacktestSignal {
  date: string;
  ticker: string;
  signal: string;
  price: number;
  quantity?: number;
}

export interface EquityPoint {
  date: string;
  value: number;
  drawdown: number;
}

// ─── Verdict ──────────────────────────────────────────────────────────────

export type RegimeLabel = "TRENDING_BULL" | "TRENDING_BEAR" | "RANGE_BOUND" | "HIGH_VOLATILITY" | "CRISIS";

export interface VerdictCoreLayer {
  fundamental: number;
  technical: number;
  macro: number;
  delivery_conviction?: number;
  earnings_momentum_boost?: number;
  combined: number;
}

export interface VerdictSectorInfo {
  sector: string;
  sector_return_20d: number;
}

export interface VerdictWalkForward {
  degradation_ratio: number;
  adjustment: number;
  rejected_overfit: boolean;
}

export interface VerdictRobustness {
  cscv_pbo: number;
  bca_lower_95: number;
  bca_upper_95: number;
  perm_p_value: number;
  perm_z_score: number;
  perm_significant: boolean;
  rejected_random: boolean;
  skill_fraction: number;
  luck_fraction: number;
  skill_p_value: number;
  best_of_n_p: number;
  best_of_n_significant: boolean;
  adjustment: number;
}

export interface VerdictPerStrategy {
  sharpe: number | null;
  max_drawdown: number | null;
  last_signal: string;
}

export interface VerdictBenchmark {
  nifty_return_pct: number;
  stock_return_pct: number;
  excess_return_pct: number;
  jensens_alpha: number;
  beta_vs_nifty: number;
  information_ratio: number;
}

export interface VerdictStrategyLayer {
  buy_votes: number;
  sell_votes: number;
  total_strategies: number;
  median_sharpe: number;
  worst_max_drawdown: number;
  consensus_raw: number;
  trade_horizon: string;
  sector: VerdictSectorInfo;
  walk_forward: VerdictWalkForward;
  robustness: VerdictRobustness;
  per_strategy: Record<string, VerdictPerStrategy>;
  benchmark?: VerdictBenchmark;
}

export interface VerdictMLFeatures {
  frac_diff_d04: number;
  sadf_peak: number;
  roll_spread: number;
  amihud_lambda_last: number;
  sharpe_ratio: number;
  psr: number;
  max_drawdown: number;
  triple_barrier_buy_pct: number;
  triple_barrier_sell_pct: number;
  purged_cv_mean_accuracy: number;
  purged_cv_scores: number[];
  kelly_bet_size: number;
  kelly_signal_strength: number;
}

export interface VerdictRegime {
  regime: RegimeLabel;
  position_scale: number;
  vix_level: number;
}

export interface VerdictFiiDii {
  sentiment_score: number;
  consecutive_fii_selling: number;
  is_heavy: boolean;
}

export interface VerdictFreshness {
  adjustment: number;
  bulk_deals: boolean;
  pledge_change: number;
  mf_change: number;
}

export interface VerdictLayerDetails {
  core: VerdictCoreLayer;
  strategy: VerdictStrategyLayer;
  ml_features?: VerdictMLFeatures;
  regime: VerdictRegime;
  fii_dii?: VerdictFiiDii;
  freshness?: VerdictFreshness;
}

export interface VerdictResult {
  ticker: string;
  core_score: number;
  strategy_score: number;
  ml_score: number;
  rl_score: number;
  robustness_score: number;
  weighted_score: number;
  verdict: DecisionTag;
  layer_details: VerdictLayerDetails;
  strategy_breakdown: VerdictStrategyLayer;
  radar_chart?: string;
}

export interface VerdictRequest {
  tickers: string[];
  market: Market;
  date_range: [string, string];
  skip_layers: string[];
  weights: {
    core: number;
    strategy: number;
    ml_features?: number;
    rl_bot?: number;
  };
  batch_size?: number;
}

// ─── Screener ─────────────────────────────────────────────────────────────
export interface ScreenerConfig {
  min_price: number;
  min_avg_volume: number;
  min_beta: number;
  workers: number;
  volume_multiplier: number;
  lookback_days: number;
  index_mode: boolean;
}

export interface RiskConfig {
  total_capital: number;
  max_open_trades: number;
  risk_per_trade_pct: number;
  pullback_tolerance_pct: number;
  min_rr_ratio: number;
  stop_loss_method: "tighter" | "ma50" | "swing_low";
}

export interface ScreenedStock {
  ticker: string;
  price: number;
  avg_volume: number;
  beta: number;
  score: number;
  passed: boolean;
}

export interface TradePlan {
  ticker: string;
  entry_price: number;
  stop_loss: number;
  target_price: number;
  quantity: number;
  risk: number;
  reward: number;
  rr_ratio: number;
}

export interface OrderResult {
  symbol: string;
  order_id: string | null;
  success: boolean;
  side: string;
  quantity: number;
  error_msg: string | null;
}

export interface TradeMonitorSummary {
  total_registered: number;
  active: number;
  closed: number;
  active_trades: unknown[];
  summary: Record<string, unknown>;
}

// ─── DriveWealth ──────────────────────────────────────────────────────────
export interface DWCredentials {
  client_id: string;
  client_secret: string;
  app_key: string;
  user_id: string;
  account_id: string;
}

export interface DWAccount {
  account_no: string;
  status: string;
  trading_type: string;
  leverage: number;
  cash_balance: number;
  available_for_trading: number;
  available_for_withdrawal: number;
  equity_value: number;
  raw: Record<string, unknown>;
}

export interface DWPosition {
  symbol: string;
  quantity: number;
  avg_price: number;
  market_value: number;
  unrealized_pnl: number;
  unrealized_pnl_pct: number;
}

// ─── Options ──────────────────────────────────────────────────────────────
export interface IndexQuote {
  index: string;
  ltp: number;
  change: number;
  change_pct: number;
}

export interface OptionChainRow {
  strike: number;
  ce_oi: number;
  ce_chg_oi: number;
  ce_volume: number;
  ce_iv: number;
  ce_ltp: number;
  ce_delta?: number;
  ce_gamma?: number;
  ce_theta?: number;
  ce_vega?: number;
  pe_oi: number;
  pe_chg_oi: number;
  pe_volume: number;
  pe_iv: number;
  pe_ltp: number;
  pe_delta?: number;
  pe_gamma?: number;
  pe_theta?: number;
  pe_vega?: number;
  moneyness?: "ITM" | "ATM" | "OTM";
}

// ─── Options Overlay Strategies ───────────────────────────────────────────
export interface OverlayOrder {
  symbol: string;
  strike: number;
  expiry: string;
  premium: number;
  total_premium: number;
  delta: number;
  iv: number;
  lots: number;
  lot_size: number;
  underlying_price: number;
}

export interface MultiLegOrder {
  strategy_type: string;
  underlying: string;
  legs: {
    strike: number;
    type: string;
    side: string;
    lots: number;
    premium: number;
    delta: number;
  }[];
  net_credit: number;
  max_loss: number;
  max_profit: number;
  pop: number;
  margin_required: number;
}

export interface OverlayScanResult {
  covered_calls: OverlayOrder[];
  cash_secured_puts: OverlayOrder[];
  iron_condors: MultiLegOrder[];
  strangles: MultiLegOrder[];
  summary: {
    total_premium: number;
    overlay_premium: number;
    multileg_premium: number;
    monthly_yield_pct: number;
    annualized_yield_pct: number;
    covered_call_count: number;
    csp_count: number;
    iron_condor_count: number;
    strangle_count: number;
  };
  log: string[];
}

// ─── Financial ML / Test & Tune ───────────────────────────────────────────
export interface ChapterInfo {
  key: string;
  title: string;
  category: string;
  description?: string;
}

export interface ChapterResult {
  chapter_key: string;
  status: "pending" | "running" | "done" | "error";
  figures: string[]; // base64 PNGs
  tables: Record<string, unknown>[];
  text_output: string;
  error_message?: string;
}

export interface AsyncBatchProgress {
  batch_id: string;
  total: number;
  completed: number;
  status?: "aborted";
  chapters: Record<string, ChapterResult>;
}

export interface BatchRunHistoryRow {
  batch_id: string;
  chapters: string[];
  status: "running" | "completed" | "error";
  total: number;
  completed: number;
  created_at: string;
}

// ─── RAG ──────────────────────────────────────────────────────────────────
export interface RAGResponse {
  query: string;
  answer: string;
  chunks: RAGChunk[];
  rag_enabled: boolean;
}

export interface RAGChunk {
  content: string;
  source: string;
  score: number;
}

export interface RAGSource {
  id: string;
  name: string;
  type: string;
  doc_count: number;
  chunk_count: number;
  page_count?: number | null;
  ingested_at?: string | null;
  file_size_bytes?: number | null;
  created_at?: string;
}

// ─── Kite / Live Quotes ──────────────────────────────────────────────────
export interface LiveQuote {
  symbol: string;
  ltp: number;
  change: number;
  change_pct: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface KiteHolding {
  tradingsymbol: string;
  exchange: string;
  quantity: number;
  average_price: number;
  last_price: number;
  pnl: number;
  pnl_pct: number;
  day_change: number;
  day_change_pct: number;
}

export interface KitePosition {
  tradingsymbol: string;
  exchange: string;
  quantity: number;
  average_price: number;
  last_price: number;
  pnl: number;
  product: string;
  buy_quantity: number;
  sell_quantity: number;
}

export interface KiteOrder {
  order_id: string;
  tradingsymbol: string;
  transaction_type: string;
  quantity: number;
  price: number;
  status: string;
  order_type: string;
  placed_at: string;
}

// ─── History ──────────────────────────────────────────────────────────────
export interface SignalHistoryRow {
  id: string;
  ticker: string;
  decision: DecisionTag;
  decision_score: number;
  sentiment_label: SentimentLabel;
  sentiment_confidence: number;
  current_price: number;
  rsi: number;
  created_at: string;
  source: string;
  title: string;
}

export interface BacktestHistoryRow {
  id: string;
  strategy_name: string;
  strategy_category: string;
  tickers: string[];
  total_return: number;
  sharpe_ratio: number;
  max_drawdown: number;
  win_rate: number;
  total_trades: number;
  created_at: string;
}

// ─── Auth ─────────────────────────────────────────────────────────────────
export interface AuthUser {
  username: string;
  name: string;
  role: string;
}

export interface LoginRequest {
  username: string;
  password: string;
}

export interface LoginResponse {
  access_token: string;
  refresh_token: string;
  user: AuthUser;
}

// ─── RL Bot ───────────────────────────────────────────────────────────────
export type RLAlgorithm = "PPO" | "DQN" | "A2C";
export type RLAction = "BUY" | "SELL" | "HOLD";

export interface RLTrainConfig {
  tickers: string[];
  algorithm: RLAlgorithm;
  reward_type: "pnl" | "sharpe" | "hybrid";
  total_timesteps: number;
  lookback: number;
  train_days: number;
  test_days: number;
  folds: number;
  initial_capital: number;
}

export interface RLFoldResult {
  fold: number;
  train_period: string;
  test_period: string;
  return_pct: number;
  sharpe: number;
  max_dd_pct: number;
  trades: number;
  win_rate: number;
}

export interface RLTickerResult {
  algorithm: string;
  model_path: string;
  avg_test_return: number;
  avg_test_sharpe: number;
  avg_test_drawdown: number;
  folds: RLFoldResult[];
}

export interface RLTrainResponse {
  results: Record<string, RLTickerResult>;
}

export interface RLEvalMetrics {
  ticker: string;
  algorithm: string;
  total_return_pct: number;
  cagr_pct: number;
  sharpe_ratio: number;
  sortino_ratio: number;
  max_drawdown_pct: number;
  total_trades: number;
  win_rate: number;
  profit_factor: number;
  avg_holding_days: number;
  buy_and_hold_return_pct: number;
  excess_return_pct: number;
  final_portfolio_value: number;
}

export interface RLSignal {
  ticker?: string;
  date: string;
  action: RLAction;
  confidence: number;
  portfolio_value?: number;
  position?: number;
}

export interface RLEvalResponse {
  metrics: RLEvalMetrics;
  signals: RLSignal[];
  trades: Record<string, unknown>[];
}

export interface RLModel {
  ticker: string;
  algorithm: string;
  filename: string;
  size_kb: number;
}

export interface RLUploadResult {
  filename: string;
  rows: number;
  columns: string[];
  tickers: string[];
  date_range: { start: string | null; end: string | null };
}

export interface RLUploadedFile {
  filename: string;
  size_kb: number;
}

// ─── Green Energy Portfolio Analysis ──────────────────────────────────────
export interface PortfolioPerformance {
  period: { start: string; end: string; trading_days: number; years: number };
  green_energy: {
    total_return_pct: number;
    cagr_pct: number;
    annualized_vol_pct: number;
    sharpe_ratio: number;
    max_drawdown_pct: number;
    final_value: number;
  };
  benchmark: {
    total_return_pct: number;
    cagr_pct: number;
    annualized_vol_pct: number;
    sharpe_ratio: number;
    max_drawdown_pct: number;
    final_value: number;
  };
  alpha_pct: number;
  total_rebalances: number;
}

export interface PortfolioStock {
  stock: string;
  periods: number;
  total_periods: number;
  persistence_pct: number;
  avg_weight_pct: number;
  max_weight_pct: number;
  cumulative_weight: number;
  themes: string[];
  currently_held: boolean;
  current_weight_pct: number | null;
}

export interface ThemeAnalysis {
  theme: string;
  appearances: number;
  total_weight: number;
}

export interface PeriodPerformance {
  start_date: string;
  end_date: string;
  days: number;
  ge_return_pct: number;
  benchmark_return_pct: number;
  alpha_pct: number;
}

export interface ChartPoint {
  date: string;
  ge: number;
  benchmark: number;
  rebalance: boolean;
}

export interface LearnedFactors {
  top_factor_categories: { name: string; weight: number; themes: string[] }[];
  top_portfolio_themes: { theme: string; weight: number }[];
  most_persistent_stocks: { stock: string; persistence_pct: number; avg_weight_pct: number }[];
  selection_characteristics: string[];
}

export interface NiftyPrediction {
  ticker: string;
  name: string;
  sector: string;
  themes: string[];
  indices: string[];
  signal: DecisionTag;
  composite_score: number;
  factor_scores: {
    theme_alignment: number;
    portfolio_proven: number;
    sector_momentum: number;
    conviction: number;
    recency: number;
  };
  matched_themes: string[];
  reasoning: string;
}

export interface PortfolioAnalysisResponse {
  performance: PortfolioPerformance;
  constituent_analysis: {
    total_unique_stocks: number;
    total_periods: number;
    top_stocks: PortfolioStock[];
    themes: ThemeAnalysis[];
  };
  period_performance: PeriodPerformance[];
  chart_data: ChartPoint[];
  learned_factors: LearnedFactors;
  predictions: NiftyPrediction[];
}

// ─── Macro Snapshot ───────────────────────────────────────────────────────
export interface MacroSnapshot {
  vix: number | null;
  vix_label: string;
  index_name: string;
  index_price: number | null;
  index_change_pct: number | null;
  us_10y_yield: number | null;
  gold_price: number | null;
  crude_oil_price: number | null;
  macro_sentiment_label: string | null;
  macro_sentiment_score: number | null;
}

export interface FearGreedIndex {
  score: number | null;
  label: string;
}

export interface TickerPrice {
  symbol: string;
  price: number;
  change_pct: number;
}

// ─── Kite Session ─────────────────────────────────────────────────────────
export interface KiteSessionStatus {
  active: boolean;
  profile: Record<string, unknown> | null;
  remaining_seconds?: number;
  remaining_minutes?: number;
  expiring_soon?: boolean;
}

export interface KitePortfolioPnLPosition {
  symbol: string;
  quantity: number;
  avg_price: number;
  ltp: number;
  pnl: number;
  pnl_pct: number;
  day_change: number;
  holding?: boolean;
}

export interface KitePortfolioPnL {
  total_invested: number;
  total_current: number;
  total_pnl: number;
  total_pnl_pct: number;
  day_pnl: number;
  positions: KitePortfolioPnLPosition[];
}

// ─── Screener Execute ─────────────────────────────────────────────────────
export interface ScreenerResponse {
  stocks: ScreenedStock[];
  trade_plans: TradePlan[];
  summary: { screened: number; passed: number };
}

export interface ScreenerExecuteResponse {
  orders: OrderResult[];
  verdict_blocked: number;
  total_placed: number;
}

// ─── Carver Orders ────────────────────────────────────────────────────────
export interface CarverTradeResult {
  symbol: string;
  quantity: number;
  forecast: number;
  vol_target: number;
  sizing_method: string;
}

export interface CarverOrderPlaced {
  symbol: string;
  quantity: number;
  status: "placed" | "failed";
  order_id: string;
  error?: string;
}

export interface CarverOrdersResponse {
  success: boolean;
  trade_plans: CarverTradeResult[];
  orders_placed: CarverOrderPlaced[];
  dry_run: boolean;
  pipeline_log: string[];
}

// ─── Carver Status ────────────────────────────────────────────────────────
export interface CarverStatus {
  carver_enabled: boolean;
  vol_target: number;
  idm: number;
  max_leverage: number;
  initial_capital: number;
  trade_horizon: string;
  options_enabled: boolean;
  rl_enabled: boolean;
  meta_label_min_prob: number;
  forecast_sources: number;
  max_open_trades: number;
  regime?: RegimeLabel;
  dd_warning_pct: number;
  dd_critical_pct: number;
  dd_halt_pct: number;
}

// ─── Portfolio Risk ───────────────────────────────────────────────────────
export type RiskLevel = "NORMAL" | "WARNING" | "CRITICAL" | "HALTED";

export interface PortfolioRiskSnapshot {
  timestamp: string;
  portfolio_daily_vol: number;
  portfolio_annual_vol_pct: number;
  target_annual_vol_pct: number;
  vol_ratio: number;
  hhi: number;
  largest_position_pct: number;
  peak_equity: number;
  current_equity: number;
  drawdown_pct: number;
  risk_level: RiskLevel;
  scale_factor: number;
  emergency_liquidate: boolean;
  alerts: string[];
}
