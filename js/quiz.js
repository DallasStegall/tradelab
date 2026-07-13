/* ==========================================================================
   TradeLab — Quiz & Tests
   Six question banks: the three strategy playbooks (ORB, Pullback, Scalping),
   candlestick pattern recognition (with inline SVG snippets), risk math with
   exact arithmetic, and trading-psychology scenarios.

   Public API:
     window.Quiz.render(container, sub)  — bank list, or runner when sub[0] is a bank id
     window.Quiz.summary()               — "Best: Patterns 92%" or null (safe pre-render)

   Storage: App.Store 'quiz.scores' = { bankId: {best, last, attempts} }  (percent 0–100)
   ========================================================================== */
(function () {
  'use strict';

  var KEYS = ['A', 'B', 'C', 'D'];

  /* ------------------------------ helpers ------------------------------ */

  function shuffle(arr) {
    var a = arr.slice();
    for (var i = a.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var t = a[i]; a[i] = a[j]; a[j] = t;
    }
    return a;
  }

  /* Small inline candlestick snippet. cs = [[open, high, low, close], ...] */
  function candleSvg(cs) {
    var W = 320, H = 170, padX = 26, padY = 14;
    var lo = Infinity, hi = -Infinity;
    cs.forEach(function (c) {
      if (c[2] < lo) lo = c[2];
      if (c[1] > hi) hi = c[1];
    });
    if (!isFinite(lo) || !isFinite(hi)) { lo = 0; hi = 1; }
    if (hi === lo) hi = lo + 1;
    var n = cs.length || 1;
    var band = (W - padX * 2) / n;
    var bw = Math.min(14, Math.max(8, band * 0.5));
    function sy(p) { return padY + (1 - (p - lo) / (hi - lo)) * (H - padY * 2); }
    var out = '';
    cs.forEach(function (c, i) {
      var o = c[0], h = c[1], l = c[2], cl = c[3];
      var cx = padX + band * i + band / 2;
      var col = cl >= o ? 'var(--pos)' : 'var(--neg)';
      var top = sy(Math.max(o, cl));
      var bot = sy(Math.min(o, cl));
      var bh = Math.max(1.6, bot - top);
      out += '<line x1="' + cx.toFixed(1) + '" y1="' + sy(h).toFixed(1) +
        '" x2="' + cx.toFixed(1) + '" y2="' + sy(l).toFixed(1) +
        '" stroke="' + col + '" stroke-width="1.5"/>';
      out += '<rect x="' + (cx - bw / 2).toFixed(1) + '" y="' + top.toFixed(1) +
        '" width="' + bw.toFixed(1) + '" height="' + bh.toFixed(1) +
        '" rx="1" fill="' + col + '"/>';
    });
    return '<div class="diagram"><svg viewBox="0 0 ' + W + ' ' + H +
      '" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Candlestick chart snippet"' +
      ' style="max-width:460px;display:block;margin:0 auto">' + out + '</svg></div>';
  }

  function patQ(before, cs, after) {
    return '<p style="margin:0 0 4px">' + before + '</p>' + candleSvg(cs) +
      '<p style="margin:4px 0 0">' + after + '</p>';
  }

  /* ------------------------------ question banks ------------------------------ */
  /* Correct answer is authored at index 0 (answer: 0); choices are shuffled per attempt. */

  var QUIZ_BANKS = [

    /* ---------- ORB ---------- */
    {
      id: 'orb',
      name: 'Opening Range Breakout',
      short: 'ORB',
      icon: 'zap',
      desc: 'Rules of the ORB playbook: range definition, RVOL filters, entry triggers, stops, targets and failed-breakout handling.',
      questions: [
        {
          q: 'In a 5-minute Opening Range Breakout, what defines the "opening range"?',
          choices: [
            'The high and low of the first 5-minute candle after the 9:30 ET open',
            'The high and low of the entire pre-market session',
            'The prior day high and low',
            'The first hour of trading, 9:30 to 10:30 ET'
          ],
          answer: 0,
          explain: 'The opening range is the high/low of the first regular-hours candle — for a 5-minute ORB, the 9:30–9:35 ET bar. Pre-market and prior-day levels are context, not the range itself.'
        },
        {
          q: 'What is the standard long entry trigger for an ORB trade?',
          choices: [
            'A candle closes above the opening-range high on strong volume',
            'Price touches the opening-range high at any point',
            'Price closes back inside the range after a failed breakdown',
            'The stock is green on the day at 10:00 ET'
          ],
          answer: 0,
          explain: 'A close above the range high with volume confirms the breakout. A mere touch or a wick through the level is where false breakouts live.'
        },
        {
          q: 'Where does the initial stop belong on a long ORB entry?',
          choices: [
            'Just below the opening-range low, or the range midpoint for a tighter stop',
            'A fixed $1.00 below entry on every stock',
            'Below the pre-market low',
            'No stop — the range breakout is confirmation enough'
          ],
          answer: 0,
          explain: 'The range defines the trade: if price trades back through the opposite side (or the midpoint on the tighter variant), the breakout has failed. Fixed-dollar stops ignore the structure.'
        },
        {
          q: 'Which relative volume (RVOL) reading best supports taking an ORB trade?',
          choices: [
            'RVOL of 2.0 or higher — at least double normal volume',
            'RVOL of 0.5 — a quiet tape means clean moves',
            'RVOL of exactly 1.0',
            'RVOL does not matter for breakouts'
          ],
          answer: 0,
          explain: 'Breakouts need participation. RVOL at or above roughly 2 shows unusual interest; breakouts on below-average volume fail far more often.'
        },
        {
          q: 'When is the prime window for ORB setups?',
          choices: [
            'Roughly 9:30–10:30 ET, while opening volume and volatility are highest',
            '11:30–14:00 ET, during the lunch session',
            'The last 10 minutes before the close',
            'Pre-market, 8:00–9:30 ET'
          ],
          answer: 0,
          explain: 'ORB feeds on the burst of volume in the first hour. By lunch, ranges go quiet and breakouts drift instead of run.'
        },
        {
          q: 'You bought a break of the range high. Two candles later, price closes back INSIDE the opening range. What now?',
          choices: [
            'Exit — a close back inside the range invalidates the breakout',
            'Add to the position at the better price',
            'Move the stop lower to give it room',
            'Hold until the stop is hit; closes inside the range are noise'
          ],
          answer: 0,
          explain: 'A failed breakout is its own signal — often the start of a move the other way. Averaging down or widening stops turns a small planned loss into a large unplanned one.'
        },
        {
          q: 'Which candidate is the strongest ORB long for the open?',
          choices: [
            'A stock gapping up 4% on an earnings beat, RVOL 3.0, price above $10',
            'A quiet large-cap with no news and RVOL 0.8',
            'A stock gapping DOWN 6% on cut guidance',
            'A $0.80 illiquid stock with a wide spread'
          ],
          answer: 0,
          explain: 'ORB wants a catalyst, unusual volume, and enough price and liquidity to trade cleanly. A gap plus RVOL near 3 signals real institutional participation.'
        },
        {
          q: 'The opening range on your candidate is unusually wide. How should that change your position size?',
          choices: [
            'Fewer shares — a wider stop distance means smaller size for the same dollar risk',
            'More shares, because a wide range shows strength',
            'The same share count as every other trade',
            'Skip the sizing math and use full buying power'
          ],
          answer: 0,
          explain: 'Dollar risk = shares × stop distance. When the stop distance doubles, the share count must halve to hold risk constant.'
        },
        {
          q: 'What is a common first profit target for an ORB long?',
          choices: [
            'The height of the opening range projected above the breakout level (a measured move)',
            'A fixed 10% gain on the stock',
            'The pre-market low',
            'Whatever price is at 4:00 PM ET'
          ],
          answer: 0,
          explain: 'The range height gives an objective, structure-based first target — roughly 1R when the stop sits at the opposite side of the range.'
        },
        {
          q: 'Price breaks the range high, but volume is well below average and the overall market is selling off hard. Best decision?',
          choices: [
            'Skip the trade — a low-volume breakout against market direction is a low-odds setup',
            'Take it anyway; the trigger is the trigger',
            'Double the size to compensate for the weaker signal',
            'Take it, but without a stop'
          ],
          answer: 0,
          explain: 'Signals stack. A breakout without volume and against the index tide fails more often than it works — passing is also a position.'
        }
      ]
    },

    /* ---------- Pullback ---------- */
    {
      id: 'pullback',
      name: 'Pullback Trading',
      short: 'Pullback',
      icon: 'trend',
      desc: 'Trend-continuation entries: EMA structure, retracement depth, volume behavior, trigger candles and invalidation.',
      questions: [
        {
          q: 'What exactly does an intraday pullback strategy trade?',
          choices: [
            'A retracement within an established trend, entered in the direction of that trend',
            'The first counter-trend reversal of the day',
            'Any stock that is red on the day',
            'Breakouts from multi-day bases'
          ],
          answer: 0,
          explain: 'The pullback trader waits for a trending stock to rest, then joins the trend at a better price. It is a continuation strategy, not a reversal strategy.'
        },
        {
          q: 'Which EMA structure confirms an intraday uptrend worth buying pullbacks in?',
          choices: [
            'Price above both EMAs, with the 9 EMA above a rising 20 EMA',
            'The 9 EMA below the 20 EMA with price between them',
            'Price chopping through both EMAs repeatedly',
            'A flat 20 EMA with price oscillating around VWAP'
          ],
          answer: 0,
          explain: 'Stacked rising EMAs (price above 9, 9 above 20) show one-sided control. When the averages flatten or braid, pullback entries lose their edge.'
        },
        {
          q: 'A stock rallies from $30.00 to $31.50, then pulls back. Which pullback depth keeps the setup strongest?',
          choices: [
            'A shallow retracement of one-third to one-half of the move, to about $30.75–$31.00',
            'A full retracement to $30.00',
            'A flush below $30.00 to shake out longs',
            'Depth does not matter as long as the candles are red'
          ],
          answer: 0,
          explain: 'Shallow pullbacks on declining volume show holders sitting tight. A 100% retracement erases the leg and puts the uptrend itself in question.'
        },
        {
          q: 'What should volume ideally do during a healthy pullback?',
          choices: [
            'Contract during the pullback, then expand as the trend resumes',
            'Expand heavily as price falls',
            'Stay identical bar to bar',
            'Volume is irrelevant to pullbacks'
          ],
          answer: 0,
          explain: 'Light-volume pullbacks are profit-taking; heavy-volume pullbacks are distribution. You want the sellers quiet and the buyers loud.'
        },
        {
          q: 'Price has pulled back to the rising 20 EMA and held for two bars. What is a clean entry trigger?',
          choices: [
            'The first candle that breaks above the prior candle high after holding the EMA',
            'Buy the instant price touches the EMA',
            'Wait for the EMA to flatten, then buy',
            'Buy the close of the biggest red candle'
          ],
          answer: 0,
          explain: 'The break of a prior candle high shows buyers have actually reclaimed control. Touch-buying an EMA catches falling knives when the pullback runs deeper.'
        },
        {
          q: 'Where does the stop belong on a pullback long?',
          choices: [
            'Just below the pullback swing low',
            'Below the prior day low',
            'A fixed 5% below entry',
            'At breakeven immediately after entry'
          ],
          answer: 0,
          explain: 'If price trades below the pullback low it has printed a lower low — the structure you were buying is gone. That level defines the trade.'
        },
        {
          q: 'Which event most clearly INVALIDATES a pullback setup?',
          choices: [
            'Price breaks below the prior swing low, printing a lower low',
            'A single red candle within the trend',
            'An RSI reading above 50',
            'Volume rising while price rises'
          ],
          answer: 0,
          explain: 'An uptrend is higher highs and higher lows. One lower low breaks that definition — what remains is no longer a pullback, it is a possible reversal.'
        },
        {
          q: 'What is a sensible first target for a pullback entry?',
          choices: [
            'The prior high of the move, taking partial profits there',
            'A round 20% gain on the stock',
            'Hold everything until the close, no exceptions',
            'One cent above entry'
          ],
          answer: 0,
          explain: 'The prior high is where the last rally stalled and where some sellers wait. Scaling out there pays the trade while leaving a piece on for continuation.'
        },
        {
          q: 'Which session window most often produces textbook trend-pullback entries?',
          choices: [
            'Roughly 10:00–11:30 ET, after the open establishes a direction',
            'The first 60 seconds after 9:30 ET',
            'The 12:00–1:00 PM ET lunch chop',
            'After-hours, 4:00–8:00 PM ET'
          ],
          answer: 0,
          explain: 'The opening drive sets the trend; the first orderly pullback typically arrives mid to late morning. Lunch pullbacks tend to drift and fail on thin volume.'
        },
        {
          q: 'It is the third pullback of the day, the bounces are getting smaller, and the EMAs are flattening. What should you do?',
          choices: [
            'Pass or cut size sharply — trends weaken with each successive pullback',
            'Size up; the third entry is always the safest',
            'Trade it at double size since you missed the first two',
            'Enter early, before the trigger, to get a better price'
          ],
          answer: 0,
          explain: 'The first and second pullbacks in a fresh trend carry the best odds; late, overlapping pullbacks with flattening EMAs are how trends end. Edge fades as the day ages.'
        }
      ]
    },

    /* ---------- Scalping ---------- */
    {
      id: 'scalping',
      name: 'Momentum Scalping',
      short: 'Scalping',
      icon: 'clock',
      desc: 'Fast-cycle mechanics: liquidity and spreads, tape reading, cost math, sizing off tight stops and the daily circuit breaker.',
      questions: [
        {
          q: 'What best describes momentum scalping?',
          choices: [
            'Many small, fast trades that each target a few cents to a fraction of a percent',
            'Holding one position all session for a large move',
            'Buying and holding overnight gaps',
            'Averaging into losers until they recover'
          ],
          answer: 0,
          explain: 'Scalpers trade frequency, not magnitude: small edges, short holding times, strict exits. The profit comes from repetition.'
        },
        {
          q: 'Which stock characteristic is non-negotiable for a scalper?',
          choices: [
            'High liquidity with a tight bid-ask spread',
            'A share price under $2',
            'No news and low volume',
            'A wide spread to profit from'
          ],
          answer: 0,
          explain: 'When the target is a few cents, slippage and spread decide the outcome. Scalping illiquid names hands the edge straight to the market maker.'
        },
        {
          q: 'Your scalp targets $0.10 with a $0.05 stop. The spread on the stock is $0.08. What is wrong?',
          choices: [
            'The spread consumes most of the target — the trade costs nearly as much as it can make',
            'Nothing; spreads do not affect scalps',
            'The stop is too tight for any stock',
            'The target should be even smaller'
          ],
          answer: 0,
          explain: 'Crossing an $0.08 spread costs about $0.04 on entry and $0.04 on exit versus the midpoint — roughly $0.08 round trip against a $0.10 target. The math fails before the trade begins.'
        },
        {
          q: 'Why do commissions and fees matter more to scalpers than to swing traders?',
          choices: [
            'Per-trade profits are tiny, so fixed costs are a large fraction of each gain',
            'They do not — costs are the same percentage for everyone',
            'Scalpers pay lower rates by regulation',
            'Because scalpers trade less often'
          ],
          answer: 0,
          explain: 'A $5 round-trip cost is noise on a $500 swing target and fatal on a $20 scalp. High trade counts multiply every cost.'
        },
        {
          q: 'Which chart and data setup fits scalping best?',
          choices: [
            'A 1-minute chart plus Level 2 quotes and time & sales',
            'A daily chart with the 200-day moving average',
            'Weekly candles and fundamentals',
            '15-minute delayed data'
          ],
          answer: 0,
          explain: 'Scalp decisions happen in seconds, so execution data — the order book and the tape — matters as much as the chart. Delayed data is unusable.'
        },
        {
          q: 'On the tape you see a large bid at $15.20 repeatedly absorbing sell orders without dropping. What does that suggest?',
          choices: [
            'A buyer is defending $15.20 — potential support for a quick long against that level',
            'The stock is about to be halted',
            'A guaranteed breakdown below $15.20',
            'Nothing; resting orders carry no information'
          ],
          answer: 0,
          explain: 'A bid that refuses to break while size hits it shows real demand. Scalpers lean on such levels — long against it, out fast if it finally breaks.'
        },
        {
          q: 'What is the most common way scalpers destroy an account?',
          choices: [
            'Letting a small losing scalp turn into an unplanned "hold and hope" position',
            'Taking profits too quickly',
            'Trading only liquid stocks',
            'Using hard stops on every trade'
          ],
          answer: 0,
          explain: 'The strategy only works if losses stay as small as the wins. One 20-cent loss erases four 5-cent winners; a 2-dollar hope-hold erases a week.'
        },
        {
          q: 'A scalper risks $50 per trade and takes 40 trades a day. Why is a daily loss limit essential?',
          choices: [
            'High frequency compounds losing streaks fast — a hard daily stop caps what a bad day can do',
            'It is not; more trades always mean more profit',
            'Because brokers require one',
            'It guarantees the next day is profitable'
          ],
          answer: 0,
          explain: 'At 40 trades a day, a tilted afternoon can burn weeks of gains in an hour. The daily limit is the circuit breaker that ends the day before the damage scales.'
        },
        {
          q: 'Which market condition is most favorable for momentum scalps?',
          choices: [
            'The high-volume, high-volatility open, roughly 9:30–10:30 ET',
            'The quietest hour of lunch',
            'A holiday half-day afternoon',
            'Pre-market on a no-news day'
          ],
          answer: 0,
          explain: 'Scalps need movement and liquidity at the same time. The open supplies both; midday supplies neither.'
        },
        {
          q: 'A swing trader risks $0.50 per share on 200 shares ($100 risk). A scalper wants the same $100 risk using a $0.05 stop. How many shares?',
          choices: [
            '2,000 shares',
            '200 shares',
            '20,000 shares',
            '500 shares'
          ],
          answer: 0,
          explain: 'Shares = dollar risk / per-share stop distance: $100 / $0.05 = 2,000 shares. Tighter stops permit larger size at equal dollar risk.'
        }
      ]
    },

    /* ---------- Patterns ---------- */
    {
      id: 'patterns',
      name: 'Pattern Recognition',
      short: 'Patterns',
      icon: 'search',
      desc: 'Read the candles. Identify hammers, stars, engulfing bars, haramis, tweezers and flags from a chart snippet.',
      questions: [
        {
          q: patQ(
            'A stock sells off through the morning, then prints this on the 5-minute chart:',
            [[100, 100.9, 96.8, 97.2], [97.2, 97.9, 93.6, 94.1], [94.1, 94.8, 90.6, 91.0], [91.0, 91.8, 86.4, 91.4]],
            'What is the final candle, and what does it suggest?'
          ),
          choices: [
            'A hammer — potential bullish reversal after the decline',
            'A hanging man — bearish reversal warning',
            'A shooting star — bearish exhaustion',
            'A gravestone doji — indecision at the lows'
          ],
          answer: 0,
          explain: 'A small body at the top with a long lower wick AFTER a decline is a hammer: sellers pushed price down and buyers slammed it back. The identical shape at the top of a rally would be a hanging man.'
        },
        {
          q: patQ(
            'After a steady advance, this sequence prints:',
            [[50.0, 51.6, 49.7, 51.4], [51.4, 53.1, 51.1, 52.9], [52.9, 54.4, 52.6, 54.2], [54.5, 57.3, 54.2, 54.3]],
            'Name the final candle and its bias.'
          ),
          choices: [
            'A shooting star — buyers failed at the highs, a bearish warning',
            'A hammer — bullish reversal',
            'An inverted hammer — bullish reversal signal',
            'A bullish marubozu — strong continuation'
          ],
          answer: 0,
          explain: 'A long upper wick with a small body near the lows AFTER an advance is a shooting star: the rally was sold hard within the bar. The same shape after a decline would be an inverted hammer.'
        },
        {
          q: patQ(
            'A downtrend stalls and the final candle does this:',
            [[40.0, 40.3, 38.9, 39.1], [39.1, 39.4, 38.0, 38.2], [38.2, 38.5, 37.4, 37.6], [37.4, 39.0, 37.2, 38.8]],
            'What two-candle pattern completes here?'
          ),
          choices: [
            'A bullish engulfing — the green body engulfs the prior red body, a reversal signal',
            'A bearish harami',
            'A piercing line',
            'A tweezer top'
          ],
          answer: 0,
          explain: 'The final candle opens below the prior close and closes above the prior open, engulfing its body — buyers overwhelmed the down move in one bar. A piercing line only closes partway into the prior body.'
        },
        {
          q: patQ(
            'A grinding rally into new session highs ends like this:',
            [[72.0, 73.2, 71.8, 73.0], [73.0, 74.1, 72.8, 73.9], [73.9, 74.6, 73.7, 74.4], [74.6, 74.9, 72.9, 73.1]],
            'What pattern completes on the last candle?'
          ),
          choices: [
            'A bearish engulfing — sellers wrapped the prior candle, reversal risk',
            'A bullish harami',
            'A hanging man',
            'Three white soldiers'
          ],
          answer: 0,
          explain: 'The red body opens above and closes below the prior green body — one bar of supply erased the last push higher. A classic topping signal at extended highs.'
        },
        {
          q: patQ(
            'Three strong green candles are followed by this final bar:',
            [[30.0, 31.1, 29.8, 31.0], [31.0, 32.2, 30.8, 32.0], [32.0, 33.3, 31.8, 33.1], [33.1, 33.9, 32.3, 33.12]],
            'What is the correct read of the final candle?'
          ),
          choices: [
            'Indecision — momentum is stalling; wait for the next candle to confirm before acting',
            'A guaranteed reversal — short immediately at market',
            'Strong continuation — add to longs now',
            'A data error; real candles always have bodies'
          ],
          answer: 0,
          explain: 'A doji after a run shows buyers and sellers at a standoff — it warns, it does not confirm. Acting on it requires the NEXT candle to resolve the standoff.'
        },
        {
          q: patQ(
            'At the low of a sell-off, this three-candle sequence completes (after the first red bar):',
            [[61.8, 62.2, 59.7, 60.1], [60.0, 60.4, 56.8, 57.2], [56.6, 57.0, 55.8, 56.3], [56.8, 59.6, 56.5, 59.3]],
            'Which pattern is this?'
          ),
          choices: [
            'A morning star — three-candle bullish reversal at the lows',
            'An evening star — bearish reversal',
            'A bear-flag continuation',
            'Three black crows'
          ],
          answer: 0,
          explain: 'A big red candle, a small pause bar at the low, then a strong green bar closing deep into the first body — the textbook morning-star bottoming sequence.'
        },
        {
          q: patQ(
            'At the high of a rally, this sequence completes:',
            [[80.0, 82.4, 79.8, 82.1], [82.1, 84.8, 81.9, 84.5], [85.0, 85.7, 84.6, 85.2], [84.7, 84.9, 82.2, 82.6]],
            'Which pattern is this?'
          ),
          choices: [
            'An evening star — three-candle bearish reversal at the highs',
            'A morning star — bullish reversal',
            'A bull flag pausing before continuation',
            'A bullish harami cross'
          ],
          answer: 0,
          explain: 'A strong green bar, a small indecision bar stranded at the top, then a heavy red bar closing into the first body — the bearish mirror of the morning star.'
        },
        {
          q: patQ(
            'Following a red session low, the chart prints:',
            [[45.6, 45.9, 44.7, 44.9], [45.0, 46.6, 44.8, 46.4], [46.2, 48.0, 46.0, 47.8], [47.6, 49.4, 47.4, 49.2]],
            'What are the three green candles called, and what do they signal?'
          ),
          choices: [
            'Three white soldiers — sustained buying pressure, bullish',
            'Three black crows — bearish',
            'An exhaustion top — short it',
            'A triple doji cluster'
          ],
          answer: 0,
          explain: 'Three consecutive long green candles, each opening within the prior body and closing near its high, show steady, methodical accumulation.'
        },
        {
          q: patQ(
            'After a steady two-hour rally, this candle prints at the session high:',
            [[88.0, 89.4, 87.8, 89.2], [89.2, 90.6, 89.0, 90.4], [90.4, 91.8, 90.2, 91.6], [91.9, 92.2, 88.6, 91.6]],
            'What is the final candle?'
          ),
          choices: [
            'A hanging man — a bearish warning that needs next-bar confirmation',
            'A hammer — bullish reversal signal',
            'A bullish continuation candle',
            'A shooting star'
          ],
          answer: 0,
          explain: 'A long lower wick and small body AT THE TOP of an advance is a hanging man: for the first time, sellers could push price far below the open. In a downtrend the same candle is a hammer — context decides.'
        },
        {
          q: patQ(
            'A hard sell-off ends with a large red bar, then this small candle:',
            [[28.0, 28.3, 26.9, 27.1], [27.1, 27.3, 25.8, 26.0], [26.0, 26.2, 24.0, 24.3], [24.8, 25.5, 24.6, 25.3]],
            'What is the two-candle pattern at the end?'
          ),
          choices: [
            'A bullish harami — an inside bar after the sell-off, potential reversal with confirmation',
            'A bullish engulfing candle',
            'A bear flag — continuation lower',
            'A tweezer bottom'
          ],
          answer: 0,
          explain: 'The small green body sits entirely inside the prior large red body — selling pressure paused abruptly. Unlike an engulfing bar, the harami needs the next candle to confirm.'
        },
        {
          q: patQ(
            'Into the morning low, the last two candles print almost identical lows:',
            [[65.2, 65.5, 63.8, 64.1], [64.0, 64.4, 62.6, 62.9], [62.9, 63.1, 61.4, 61.6], [61.6, 62.9, 61.4, 62.7]],
            'What is this pattern?'
          ),
          choices: [
            'A tweezer bottom — two candles rejecting the same low, potential support',
            'A double top',
            'A bearish continuation wedge',
            'A hanging-man pair'
          ],
          answer: 0,
          explain: 'Back-to-back candles with matching lows — the second, green, bar shows the level that broke down before is now being defended by buyers.'
        },
        {
          q: patQ(
            'A stock rips higher at the open, then does this over the next half hour:',
            [[20.0, 21.4, 19.9, 21.3], [21.3, 22.8, 21.2, 22.7], [22.7, 22.9, 22.3, 22.4], [22.4, 22.6, 22.0, 22.1], [22.1, 22.35, 21.85, 21.95], [21.95, 22.15, 21.8, 21.9]],
            'What is the structure, and how does it usually resolve?'
          ),
          choices: [
            'A bull flag — orderly rest after the pole; a break of the flag high targets continuation',
            'A double top — a reversal lower is likely',
            'A head-and-shoulders top',
            'Distribution — the move is finished'
          ],
          answer: 0,
          explain: 'Two strong pole candles followed by small, low-range red bars drifting down is a flag: profit-taking, not reversal. The trade signal is the break back above the flag high.'
        }
      ]
    },

    /* ---------- Risk & Numbers ---------- */
    {
      id: 'risk',
      name: 'Risk & Numbers',
      short: 'Risk',
      icon: 'shield',
      desc: 'Do the math: position size, R-multiples, expectancy, drawdown recovery, daily loss limits and reward-to-risk.',
      questions: [
        {
          q: 'Account $25,000. You risk 1% per trade. Entry $50.00, stop $49.50. How many shares?',
          choices: ['500 shares', '250 shares', '1,000 shares', '50 shares'],
          answer: 0,
          explain: 'Dollar risk = $25,000 × 1% = $250. Per-share risk = $50.00 − $49.50 = $0.50. Shares = $250 ÷ $0.50 = 500.'
        },
        {
          q: 'Account $10,000, risking 2% per trade. Entry $20.00, stop $19.60. Position size?',
          choices: ['500 shares', '400 shares', '200 shares', '1,000 shares'],
          answer: 0,
          explain: 'Risk = $10,000 × 2% = $200. Stop distance = $0.40. $200 ÷ $0.40 = 500 shares.'
        },
        {
          q: 'You risked $150 on a trade and closed it for a $450 profit. What R-multiple is that?',
          choices: ['+3R', '+1.5R', '+4.5R', '+0.33R'],
          answer: 0,
          explain: 'R is the initial risk: $450 profit ÷ $150 risked = 3R. Thinking in R keeps results comparable across different position sizes.'
        },
        {
          q: 'Your stats: 40% win rate, average win $300, average loss $150. What is your expectancy per trade?',
          choices: ['+$30', '−$30', '+$60', '$0 — breakeven'],
          answer: 0,
          explain: 'Expectancy = (0.40 × $300) − (0.60 × $150) = $120 − $90 = +$30 per trade. A sub-50% win rate can still be solidly profitable.'
        },
        {
          q: 'A system wins 55% of the time, and the average win equals the average loss at 1R. Expectancy per trade?',
          choices: ['+0.10R', '+0.55R', '0R — it nets out', '−0.10R'],
          answer: 0,
          explain: 'Expectancy = (0.55 × 1R) − (0.45 × 1R) = +0.10R per trade. Small edges only compound with volume and discipline.'
        },
        {
          q: 'Your account is down 20% from its high. What percentage gain returns you to breakeven?',
          choices: ['25%', '20%', '15%', '40%'],
          answer: 0,
          explain: 'From 80% of the original balance you need 20 ÷ 80 = 25% to recover. Losses always require a larger percentage gain to undo — the reason drawdown control comes first.'
        },
        {
          q: 'A trader loses 50% of their account. What gain is now required just to get back to even?',
          choices: ['100%', '50%', '75%', '150%'],
          answer: 0,
          explain: 'Halving the account means the remainder must double: 50 ÷ 50 = 100%. Deep drawdowns are mathematically brutal to climb out of.'
        },
        {
          q: 'Account $30,000 with a 3% daily loss limit. You are down $350, then $400, on two trades. What is the most you can risk on the next trade without breaching the limit?',
          choices: ['$150', '$300', '$900', '$0 — the limit is already hit'],
          answer: 0,
          explain: 'Daily limit = $30,000 × 3% = $900. Losses so far = $350 + $400 = $750. Remaining budget = $900 − $750 = $150.'
        },
        {
          q: 'Account $50,000, risking 0.5% per trade. You SHORT at $120.00 with a stop at $121.25. How many shares?',
          choices: ['200 shares', '250 shares', '400 shares', '125 shares'],
          answer: 0,
          explain: 'Risk = $50,000 × 0.5% = $250. Stop distance = $121.25 − $120.00 = $1.25. $250 ÷ $1.25 = 200 shares — the formula is identical for shorts.'
        },
        {
          q: 'Entry $25.00, stop $24.70, target $25.90. What is the reward-to-risk ratio?',
          choices: ['3:1', '1:3', '2:1', '0.9:1'],
          answer: 0,
          explain: 'Risk = $0.30, reward = $0.90, so 0.90 ÷ 0.30 = 3:1. At 3:1 you only need to win more than 25% of the time to profit before costs.'
        }
      ]
    },

    /* ---------- Psychology ---------- */
    {
      id: 'psychology',
      name: 'Trading Psychology',
      short: 'Psychology',
      icon: 'brain',
      desc: 'Judgment under pressure. Pick what a disciplined trader SHOULD do in each realistic scenario.',
      questions: [
        {
          q: 'It is 10:15 AM. A trader is down 2R after three consecutive losses. What SHOULD they do next?',
          choices: [
            'Stop trading, step away, and review whether the three losses actually followed the plan',
            'Double position size so one winner gets the day back',
            'Switch to a new, untested strategy immediately',
            'Remove the stop on the next trade to avoid another stop-out'
          ],
          answer: 0,
          explain: 'Three losses plus 2R down is the textbook tilt trigger. A pause converts a losing morning into data; sizing up converts it into a catastrophic day.'
        },
        {
          q: 'A trader gets stopped out, then instantly re-enters the same stock with double size to "win it back". What is this, and what is the fix?',
          choices: [
            'Revenge trading — the fix is a hard rule: after a stop-out, no re-entry without a brand-new valid setup',
            'Smart aggression — pressing while angry sharpens focus',
            'Scaling in — a standard professional technique',
            'Hedging — it reduces overall risk'
          ],
          answer: 0,
          explain: 'Re-entering from anger rather than signal is revenge trading, the fastest route from a small loss to a blown day. Rules written in calm must govern behavior under stress.'
        },
        {
          q: 'A long hits its planned target, but the trader "feels" it will keep running, cancels the sell order, and later watches the trade come all the way back. The real error was:',
          choices: [
            'Abandoning the plan mid-trade — feelings are not signals, and exits decided in advance exist to beat in-the-moment bias',
            'Not buying more when it hit the target',
            'Using a profit target at all',
            'Watching the position instead of walking away'
          ],
          answer: 0,
          explain: 'Changing the exit mid-trade replaces a tested rule with an emotion. If targets are genuinely too conservative, fix that in review — never during the trade.'
        },
        {
          q: 'A stock is up 15% in twenty minutes on a story everyone is posting about. The trader has no setup but is desperate not to miss it. Disciplined response?',
          choices: [
            'No setup, no trade — chasing an extended move without a plan is FOMO, not strategy',
            'Buy a small "starter" at market before it runs further',
            'Buy full size; momentum this strong removes the need for a stop',
            'Short it at market, because whatever is up 15% must come down'
          ],
          answer: 0,
          explain: 'A FOMO entry has no defined risk point — you cannot place a rational stop on a trade with no structure. Missing a move costs nothing; chasing one costs real money.'
        },
        {
          q: 'After five winning days in a row, a trader wants to triple normal size "while the hot streak lasts". Best response?',
          choices: [
            'Keep the sizing rules unchanged — a streak does not change the edge, and overconfidence peaks right before the big loss',
            'Triple the size; streaks should be pressed hard',
            'Stop trading for a month to protect the profits',
            'Remove the daily loss limit, since it is clearly not needed'
          ],
          answer: 0,
          explain: 'Win streaks are where discipline quietly dies: size creeps up exactly when confidence exceeds evidence. Increase size gradually, by rule — never by mood.'
        },
        {
          q: 'Trade A followed every rule and lost 1R. Trade B broke the rules and made 2R. Which was the better trade?',
          choices: [
            'Trade A — over hundreds of trades, process is what pays; rewarded rule-breaking trains expensive habits',
            'Trade B — money is the only score that matters',
            'They were equally good',
            'Neither; losing trades are always mistakes'
          ],
          answer: 0,
          explain: 'One outcome proves nothing — edges only show up across samples. A profitable rule-break is a loan from future discipline, repaid with interest.'
        },
        {
          q: 'A trader keeps dragging stops lower "to give the trade room", and small losses keep becoming big ones. What is the practical fix?',
          choices: [
            'Place a hard stop with the broker at entry time, sized so the planned loss is genuinely acceptable',
            'Use mental stops only, so the market cannot see them',
            'Widen every stop by default so they stop getting hit',
            'Check the position less often'
          ],
          answer: 0,
          explain: 'If a stop keeps getting moved, the decision must be removed from the moment: a resting order placed while calm. If the stop feels intolerable, the position was too big.'
        },
        {
          q: 'A trader hits the daily loss limit at 11:00 AM, then spots what looks like a perfect A+ setup. What SHOULD they do?',
          choices: [
            'Stand aside — log the setup and review it after the close; the limit exists precisely for this moment',
            'Take it at half size — the limit is more of a guideline',
            'Take it at full size, but only because the setup is perfect',
            'Delete the loss limit; it is clearly blocking profits'
          ],
          answer: 0,
          explain: 'Judgment is at its worst exactly when the limit trips — that is why the rule was written in advance. There will be another A+ setup tomorrow; there is only one account.'
        }
      ]
    }
  ];

  /* ------------------------------ scores ------------------------------ */

  function getScores() {
    var s = App.Store.get('quiz.scores', {});
    return (s && typeof s === 'object' && !Array.isArray(s)) ? s : {};
  }

  function summary() {
    try {
      if (!window.App || !App.Store) return null;
      var scores = getScores();
      var bestBank = null, bestVal = -1;
      QUIZ_BANKS.forEach(function (b) {
        var s = scores[b.id];
        if (s && isFinite(+s.best) && +s.best > bestVal) {
          bestVal = +s.best;
          bestBank = b;
        }
      });
      if (!bestBank) return null;
      return 'Best: ' + bestBank.short + ' ' + App.fmtPct(Math.round(bestVal), 0);
    } catch (e) {
      return null;
    }
  }

  function findBank(id) {
    for (var i = 0; i < QUIZ_BANKS.length; i++) {
      if (QUIZ_BANKS[i].id === id) return QUIZ_BANKS[i];
    }
    return null;
  }

  /* ------------------------------ bank list ------------------------------ */

  function renderList(container) {
    attempt = null;
    var scores = getScores();

    var cards = QUIZ_BANKS.map(function (b) {
      var s = scores[b.id];
      var best = (s && isFinite(+s.best)) ? Math.round(+s.best) : null;
      var last = (s && isFinite(+s.last)) ? Math.round(+s.last) : null;
      var attempts = (s && isFinite(+s.attempts)) ? Math.max(0, Math.round(+s.attempts)) : 0;
      var badgeCls = best == null ? '' : (best >= 80 ? 'green' : best >= 50 ? 'amber' : 'red');

      var html = '<div class="card">';
      html += '<div class="row" style="margin-bottom:8px;color:var(--accent)">' + App.icon(b.icon, 20) +
        '<h3 style="margin:0;color:var(--ink)">' + App.esc(b.name) + '</h3></div>';
      html += '<p class="small" style="color:var(--ink-2)">' + App.esc(b.desc) + '</p>';
      html += '<div class="row" style="flex-wrap:wrap;margin-bottom:12px">';
      html += '<span class="badge blue">' + b.questions.length + ' questions</span>';
      if (best != null) html += '<span class="badge ' + badgeCls + '">Best ' + App.fmtPct(best, 0) + '</span>';
      if (last != null) html += '<span class="badge">Last ' + App.fmtPct(last, 0) + '</span>';
      if (attempts > 0) html += '<span class="small muted">' + attempts + (attempts === 1 ? ' attempt' : ' attempts') + '</span>';
      html += '</div>';
      html += '<a class="btn btn-primary btn-sm" href="#/quiz/' + App.esc(b.id) + '">' +
        App.icon(attempts > 0 ? 'refresh' : 'chevR', 14) + ' ' + (attempts > 0 ? 'Retake' : 'Start') + '</a>';
      html += '</div>';
      return html;
    }).join('');

    container.innerHTML =
      '<div class="page-header"><h1>Quiz &amp; Tests</h1>' +
      '<p class="lede">Six question banks covering the playbooks, candlestick recognition, risk math and trading psychology. ' +
      'Question and answer order are shuffled on every attempt — treat 80%+ as the bar before trading a setup live.</p></div>' +
      '<div class="grid cols-2">' + cards + '</div>';
  }

  /* ------------------------------ runner ------------------------------ */

  var attempt = null;

  function buildAttempt(bank) {
    var qs = shuffle(bank.questions).map(function (q) {
      var ch = q.choices.map(function (text, i) {
        return { text: text, correct: i === q.answer };
      });
      return { q: q.q, explain: q.explain, choices: shuffle(ch) };
    });
    return { bank: bank, qs: qs, idx: 0, correct: 0, missed: [], answered: false };
  }

  function startBank(container, bank) {
    attempt = buildAttempt(bank);
    renderQuestion(container);
  }

  function renderQuestion(container) {
    var a = attempt;
    if (!a || !a.qs.length) { renderList(container); return; }
    var q = a.qs[a.idx];
    var total = a.qs.length;

    var html = '';
    html += '<a class="back-link" href="#/quiz">' + App.icon('chevL', 14) + ' Quit — back to all quizzes</a>';
    html += '<div class="page-header"><h1>' + App.esc(a.bank.name) + '</h1></div>';
    html += '<section class="card">';
    html += '<div class="spread" style="margin-bottom:8px">' +
      '<span class="small muted">Question ' + (a.idx + 1) + ' of ' + total + '</span>' +
      '<span class="small muted tnum">' + a.correct + ' correct so far</span></div>';
    html += '<div class="progress"><div class="progress-fill" id="qz-prog" style="width:' +
      ((a.idx / total) * 100).toFixed(1) + '%"></div></div>';
    html += '<div style="margin:16px 0 14px;font-size:1.02rem">' + q.q + '</div>';
    html += '<div id="qz-opts">';
    q.choices.forEach(function (c, i) {
      html += '<button type="button" class="quiz-option" data-i="' + i + '">' +
        '<span class="opt-key">' + KEYS[i] + '</span><span>' + App.esc(c.text) + '</span></button>';
    });
    html += '</div>';
    html += '<div id="qz-explain"></div>';
    html += '<div class="row" id="qz-actions" style="margin-top:14px;justify-content:flex-end"></div>';
    html += '</section>';
    container.innerHTML = html;

    container.querySelectorAll('.quiz-option').forEach(function (btn) {
      btn.addEventListener('click', function () {
        answerQuestion(container, parseInt(btn.getAttribute('data-i'), 10));
      });
    });
  }

  function answerQuestion(container, pick) {
    var a = attempt;
    if (!a || a.answered || !isFinite(pick)) return;
    a.answered = true;
    var q = a.qs[a.idx];
    var total = a.qs.length;

    var correctIdx = 0;
    q.choices.forEach(function (c, i) { if (c.correct) correctIdx = i; });
    var right = pick === correctIdx;
    if (right) {
      a.correct++;
    } else {
      a.missed.push({
        q: q.q,
        your: q.choices[pick] ? q.choices[pick].text : '(none)',
        correctText: q.choices[correctIdx].text,
        explain: q.explain
      });
    }

    container.querySelectorAll('.quiz-option').forEach(function (btn, i) {
      btn.setAttribute('disabled', '');
      if (i === correctIdx) btn.classList.add('correct');
      else if (i === pick) btn.classList.add('wrong');
    });

    var prog = container.querySelector('#qz-prog');
    if (prog) prog.style.width = (((a.idx + 1) / total) * 100).toFixed(1) + '%';

    var scoreEl = container.querySelector('.spread .tnum');
    if (scoreEl) scoreEl.textContent = a.correct + ' correct so far';

    var ex = container.querySelector('#qz-explain');
    if (ex) {
      ex.innerHTML = '<div class="quiz-explain callout ' + (right ? 'tip' : 'danger') + '">' +
        App.icon(right ? 'check' : 'alert') +
        '<div><b>' + (right ? 'Correct.' : 'Not quite.') + '</b> ' + App.esc(q.explain) + '</div></div>';
    }

    var last = a.idx === total - 1;
    var actions = container.querySelector('#qz-actions');
    if (actions) {
      actions.innerHTML = '<button type="button" class="btn btn-primary" id="qz-next">' +
        (last ? 'See results' : 'Next question') + ' ' + App.icon('chevR', 14) + '</button>';
      var next = container.querySelector('#qz-next');
      if (next) {
        next.addEventListener('click', function () {
          if (!attempt) return;
          if (last) {
            finishAttempt(container);
          } else {
            attempt.idx++;
            attempt.answered = false;
            renderQuestion(container);
          }
        });
      }
    }
  }

  function finishAttempt(container) {
    var a = attempt;
    if (!a) { renderList(container); return; }
    var total = a.qs.length;
    var pct = total ? Math.round((a.correct / total) * 100) : 0;

    var scores = getScores();
    var s = scores[a.bank.id];
    if (!s || typeof s !== 'object') s = { best: 0, last: 0, attempts: 0 };
    var prevBest = isFinite(+s.best) ? +s.best : 0;
    var prevAttempts = isFinite(+s.attempts) ? Math.max(0, Math.round(+s.attempts)) : 0;
    var isNewBest = prevAttempts > 0 && pct > prevBest;
    scores[a.bank.id] = {
      best: Math.max(prevBest, pct),
      last: pct,
      attempts: prevAttempts + 1
    };
    App.Store.set('quiz.scores', scores);

    renderResults(container, a, pct, isNewBest);
  }

  function tierMessage(pct) {
    if (pct === 100) return 'Perfect score. This material is locked in — keep it fresh with a retake next week.';
    if (pct >= 90) return 'Excellent. You know this material cold — review the misses below and move on.';
    if (pct >= 80) return 'Strong. A quick review of the missed questions and you are trade-ready on this topic.';
    if (pct >= 60) return 'A workable base, but the gaps below are exactly what costs money live. Reread the guide, then retake.';
    if (pct >= 40) return 'Shaky. Go back through the source material before risking capital on this setup.';
    return 'Not there yet. Reread the relevant guide start to finish, then retake — no live trading on this setup until 80%+.';
  }

  function renderResults(container, a, pct, isNewBest) {
    var total = a.qs.length;
    var heroColor = pct >= 80 ? 'var(--pos)' : pct >= 50 ? 'var(--warn)' : 'var(--neg)';

    var html = '';
    html += '<a class="back-link" href="#/quiz">' + App.icon('chevL', 14) + ' Back to all quizzes</a>';
    html += '<div class="page-header"><h1>Results — ' + App.esc(a.bank.name) + '</h1></div>';

    html += '<section class="card" style="text-align:center;padding:34px 20px">';
    html += '<div class="tnum" style="font-size:3.6rem;font-weight:750;line-height:1;color:' + heroColor + '">' +
      App.fmtPct(pct, 0) + '</div>';
    html += '<div class="muted" style="margin-top:8px">' + a.correct + ' of ' + total + ' correct</div>';
    if (isNewBest) html += '<div style="margin-top:10px"><span class="badge green">New personal best</span></div>';
    html += '<p style="margin:14px auto 0;max-width:540px">' + App.esc(tierMessage(pct)) + '</p>';
    html += '<div class="row" style="justify-content:center;margin-top:20px">';
    html += '<button type="button" class="btn btn-primary" id="qz-retake">' + App.icon('refresh', 15) + ' Retake quiz</button>';
    html += '<a class="btn" href="#/quiz">Back to quiz list</a>';
    html += '</div>';
    html += '</section>';

    if (a.missed.length) {
      html += '<h2 style="margin:22px 0 12px">Review missed questions (' + a.missed.length + ')</h2>';
      html += '<div class="stack">';
      a.missed.forEach(function (m) {
        html += '<section class="card">';
        html += '<div style="font-size:.98rem">' + m.q + '</div>';
        html += '<div class="small" style="margin-top:10px"><b class="neg">Your answer:</b> ' + App.esc(m.your) + '</div>';
        html += '<div class="small" style="margin-top:4px"><b class="pos">Correct answer:</b> ' + App.esc(m.correctText) + '</div>';
        html += '<p class="small muted" style="margin:8px 0 0">' + App.esc(m.explain) + '</p>';
        html += '</section>';
      });
      html += '</div>';
    } else {
      html += '<div class="callout tip" style="margin-top:22px">' + App.icon('check') +
        '<div><b>Nothing to review.</b> Every question answered correctly on this attempt.</div></div>';
    }

    container.innerHTML = html;

    var retake = container.querySelector('#qz-retake');
    if (retake) {
      retake.addEventListener('click', function () {
        startBank(container, a.bank);
        window.scrollTo(0, 0);
      });
    }
  }

  /* ------------------------------ entry point ------------------------------ */

  function render(container, sub) {
    sub = sub || [];
    if (sub.length && sub[0]) {
      var bank = findBank(sub[0]);
      if (bank) { startBank(container, bank); return; }
    }
    renderList(container);
  }

  window.Quiz = { render: render, summary: summary };
})();
