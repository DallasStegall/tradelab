/* ==========================================================================
   TradeLab — additional Education topics (js/data/lessons-extra.js)
   Appended to window.EDUCATION_DATA. Load after education-extra.js, before app.js.
   ========================================================================== */
(function () {
  'use strict';
  var TOPIC = {
    id: 'order-types',
    title: 'Order Types & Execution',
    icon: 'calc',
    blurb: 'Market, limit, stop, stop-limit, trailing and bracket orders — how each behaves and when to use it.',
    minutes: 12,
    sections: [
      {
        title: 'The one trade-off behind every order',
        html:
          '<p>Every order type is a choice between two things you cannot fully have at once:</p>' +
          '<ul>' +
          '<li><strong>Certainty of execution</strong> — will the order actually fill?</li>' +
          '<li><strong>Certainty of price</strong> — at exactly what price will it fill?</li>' +
          '</ul>' +
          '<p>A <strong>market order</strong> takes execution and gives up price. A <strong>limit order</strong> takes price and gives up the guarantee of a fill. Every other order type is a variation on that same dial. Two costs live in the gap between them:</p>' +
          '<ul>' +
          '<li><strong>The spread</strong> — you buy at the ask and sell at the bid, so you start every round-trip slightly behind. On a $0.05 spread that is $0.05 per share, every time.</li>' +
          '<li><strong>Slippage</strong> — the difference between the price you expected and the price you got, worst in fast markets and thin, wide-spread names.</li>' +
          '</ul>' +
          '<div class="callout info"><div><b>Rule of thumb.</b> Use limit orders to <em>enter</em> (you can be patient and price-sensitive); use whatever reliably <em>gets you out</em> to exit — protecting the account beats saving a penny.</div></div>'
      },
      {
        title: 'Market orders',
        html:
          '<p>A <strong>market order</strong> executes immediately at the best available price. It guarantees you are filled; it does not guarantee the price.</p>' +
          '<ul>' +
          '<li><strong>Use it</strong> when getting in or out <em>now</em> matters more than a few cents — exiting a losing trade, or entering a liquid, tight-spread name where the ask is right where you want it.</li>' +
          '<li><strong>Beware</strong> in wide spreads, low float, the first minute after the open, or around news. A market order there can fill far from the last print — this is where beginners get badly slipped.</li>' +
          '</ul>' +
          '<div class="callout warn">' +
          '<div><b>Never send a market order into a thin book.</b> If the spread is $0.30 and only 200 shares sit on the ask, your market buy walks up the book and pays whatever it must. A marketable limit (below) caps that.</div></div>'
      },
      {
        title: 'Limit orders',
        html:
          '<p>A <strong>limit order</strong> executes only at your specified price <em>or better</em>. A buy limit fills at your price or lower; a sell limit at your price or higher. You control price; you accept that it may never fill.</p>' +
          '<ul>' +
          '<li><strong>Use it</strong> to enter at a level (a support bounce, a retest) where you can wait for price to come to you.</li>' +
          '<li><strong>The trade-off:</strong> if price runs without touching your limit, you miss the trade. Chasing with a higher limit is how a patient entry becomes a bad one.</li>' +
          '<li><strong>Marketable limit</strong> — a limit set a few cents through the current price (e.g. buy-limit slightly above the ask). It fills almost immediately like a market order but <em>caps</em> the worst price you will accept. A safer default than a raw market order in anything but the most liquid names.</li>' +
          '</ul>'
      },
      {
        title: 'Stop orders (your stop-loss)',
        html:
          '<p>A <strong>stop order</strong> is dormant until price touches a trigger level, then it fires. A <strong>stop-market</strong> (the usual stop-loss) fires a market order the instant your level trades — guaranteeing you are taken out, at whatever price is available.</p>' +
          '<ul>' +
          '<li>For a long, the stop sits <em>below</em> entry; for a short, <em>above</em>. It goes at the level that proves the trade wrong, not at a random dollar amount.</li>' +
          '<li><strong>Guarantees the exit, not the price.</strong> On a gap or a fast flush it can fill well past your level (slippage) — the price of certainty.</li>' +
          '</ul>' +
          '<div class="callout danger">' +
          '<div><b>The stop is non-negotiable.</b> It lives in the platform, not in your head. Widening a stop because the trade &ldquo;looks strong&rdquo; converts small, planned losses into the large ones that end accounts.</div></div>'
      },
      {
        title: 'Stop-limit orders',
        html:
          '<p>A <strong>stop-limit</strong> triggers at your stop price but then submits a <em>limit</em> order rather than a market order. You set two prices: the <strong>stop</strong> (trigger) and the <strong>limit</strong> (the worst price you will accept).</p>' +
          '<ul>' +
          '<li><strong>Upside:</strong> it prevents catastrophic slippage — you will never sell below your limit.</li>' +
          '<li><strong>The danger:</strong> if price gaps straight through both levels, the limit is left behind and <em>you are not filled at all</em> — still holding a losing position as it falls. That is the opposite of what a stop is for.</li>' +
          '</ul>' +
          '<p>Practical guidance: on liquid names a plain stop-market is usually safer, because being out matters more than the exact price. Reserve stop-limits for situations where a bad print is a real risk and you would rather re-assess than be dumped at any price.</p>'
      },
      {
        title: 'Trailing stops & bracket (OCO) orders',
        html:
          '<p><strong>Trailing stop.</strong> A stop that follows price by a fixed amount or percent as the trade moves your way, and holds when price pulls back. It locks in gains while giving a trend room to run — but a trail set too tight gets shaken out by normal noise.</p>' +
          '<p><strong>Bracket / OCO (one-cancels-other).</strong> Two exit orders attached to a position — a profit-target limit above and a protective stop below — linked so that filling one automatically cancels the other. Set it at entry and the trade manages itself: you are out at the target or the stop, never both, and never by hand in the heat of the moment.</p>' +
          '<div class="callout info"><div><b>Why brackets help discipline.</b> The hardest part of trading is exiting well. A bracket makes the exit a decision you made calmly <em>before</em> the trade, not one you improvise while money moves.</div></div>'
      },
      {
        title: 'Closing-auction orders & quick reference',
        html:
          '<p><strong>MOC / LOC</strong> (market/limit-on-close) execute in the closing auction at 4:00 PM ET — used to exit a position at the official close. They must be entered before the exchange cutoff and cannot be cancelled late. Day traders rarely need them, but they are how larger size gets out at the close without moving the tape.</p>' +
          '<div class="table-wrap"><table class="table"><thead><tr><th>Order</th><th>Guarantees</th><th>Best for</th></tr></thead><tbody>' +
          '<tr><td><strong>Market</strong></td><td>Fill, not price</td><td>Fast exits in liquid names</td></tr>' +
          '<tr><td><strong>Limit</strong></td><td>Price, not fill</td><td>Patient entries at a level</td></tr>' +
          '<tr><td><strong>Marketable limit</strong></td><td>Fast fill with a price cap</td><td>Entering when you want speed and a ceiling on slippage</td></tr>' +
          '<tr><td><strong>Stop-market</strong></td><td>Exit, not price</td><td>The everyday stop-loss</td></tr>' +
          '<tr><td><strong>Stop-limit</strong></td><td>Price, not the exit</td><td>Avoiding a terrible fill (accepts non-fill risk)</td></tr>' +
          '<tr><td><strong>Trailing stop</strong></td><td>Locks gains as price moves</td><td>Letting a trend run</td></tr>' +
          '<tr><td><strong>Bracket / OCO</strong></td><td>Automated target + stop</td><td>Disciplined, hands-off exits</td></tr>' +
          '</tbody></table></div>' +
          '<p class="small muted" style="margin-top:10px">Order-type names and behavior vary slightly by broker — confirm exactly how yours handles triggers and partial fills on a tiny position before you rely on it with size.</p>'
      }
    ]
  };
  var MARKETS = {
    id: 'markets-instruments',
    title: 'Markets & Instruments',
    icon: 'layers',
    blurb: 'Stocks, ETFs, options, futures, forex and crypto — what each one actually is, how it trades, and where the risk hides.',
    minutes: 15,
    sections: [
      {
        title: 'The map: same charts, very different vehicles',
        html:
          '<p>“Trading” is not one thing. The candlesticks and levels in this app look the same across every market, but <em>what</em> you are buying — and how badly it can hurt you — changes completely from one instrument to the next. The biggest differences are three:</p>' +
          '<ul>' +
          '<li><strong>Leverage</strong> — how much market exposure each dollar controls. More leverage magnifies gains <em>and</em> losses; it is the single biggest reason beginners blow up.</li>' +
          '<li><strong>Hours</strong> — when it trades, and therefore when it can gap against you while you sleep.</li>' +
          '<li><strong>Complexity &amp; regulation</strong> — how many moving parts the instrument has, and how much oversight protects you if something goes wrong.</li>' +
          '</ul>' +
          '<div class="callout info"><div><b>The through-line.</b> Learn to read price and manage risk on a simple, transparent instrument first. Leverage and complexity do not create an edge — they just amplify whatever edge (or mistake) you already have.</div></div>'
      },
      {
        title: 'Stocks (equities)',
        html:
          '<p>A share of stock is partial <strong>ownership of a company</strong>, bought and sold on regulated exchanges (NYSE, Nasdaq). The most transparent, beginner-friendly instrument.</p>' +
          '<ul>' +
          '<li><strong>Hours:</strong> 9:30–16:00 ET regular session, plus pre-market (from 4:00 AM) and after-hours (to 8:00 PM) with thinner liquidity.</li>' +
          '<li><strong>Leverage:</strong> none by default. A cash account trades your money 1:1; a margin account can lend up to ~2× overnight and ~4× intraday buying power — leverage you opt into, not built into the share.</li>' +
          '<li><strong>Watch-outs:</strong> the US <em>Pattern Day Trader</em> rule limits accounts under $25,000 to three day trades per five business days. You can go long easily; shorting requires borrowable shares.</li>' +
          '</ul>'
      },
      {
        title: 'ETFs (exchange-traded funds)',
        html:
          '<p>An ETF is a <strong>basket of assets</strong> (stocks, bonds, commodities) that trades on an exchange exactly like a single stock. Buying SPY gives you exposure to the whole S&amp;P 500 in one ticker.</p>' +
          '<ul>' +
          '<li><strong>Why traders use them:</strong> instant diversification, deep liquidity (SPY, QQQ are among the most-traded instruments on earth), and clean exposure to an index, sector or theme.</li>' +
          '<li><strong>Same rules as stocks</strong> — same hours, same PDT rule, same margin.</li>' +
          '</ul>' +
          '<div class="callout warn"><div><b>Leveraged &amp; inverse ETFs are different animals.</b> Products like 3× or −1× ETFs reset daily and <em>decay</em> over time — held for more than a day in a choppy market they can lose value even if the index ends flat. They are short-term tools, not investments.</div></div>'
      },
      {
        title: 'Options',
        html:
          '<p>An option is a <strong>contract</strong> giving the buyer the <em>right, not the obligation,</em> to buy (a <strong>call</strong>) or sell (a <strong>put</strong>) 100 shares at a set <strong>strike price</strong> before an <strong>expiration date</strong>, for a price called the <strong>premium</strong>.</p>' +
          '<ul>' +
          '<li><strong>Leverage &amp; defined risk (for buyers):</strong> a cheap premium controls 100 shares, so percentage moves are large. A buyer’s loss is capped at the premium paid — you cannot lose more than you spent.</li>' +
          '<li><strong>Undefined risk (for sellers):</strong> selling options collects premium but can carry large or, when naked, effectively unlimited risk. Not a beginner move.</li>' +
          '<li><strong>Time decay (theta):</strong> options lose value as expiration approaches, all else equal. You can be right on direction and still lose if the move is too slow.</li>' +
          '</ul>' +
          '<div class="callout warn"><div><b>Complexity tax.</b> Options add strike, expiry, implied volatility and decay on top of direction. They are powerful for hedging and defined-risk speculation, but there is a lot to learn before real money — start with buying single calls/puts, never naked selling.</div></div>'
      },
      {
        title: 'Futures',
        html:
          '<p>A futures contract is a <strong>standardized agreement</strong> to buy or sell an asset (a stock index, oil, gold, currencies) at a set price on a future date. Index futures like the E-mini S&amp;P (ES) and Nasdaq (NQ) are the workhorses of many day traders — and the instrument most funded/prop challenges use.</p>' +
          '<ul>' +
          '<li><strong>High built-in leverage:</strong> you post a small margin to control a large contract, so each tick is meaningful. Great for capital efficiency, brutal when wrong — small accounts can be wiped out in minutes.</li>' +
          '<li><strong>Nearly 24-hour trading,</strong> roughly Sunday 6:00 PM to Friday 5:00 PM ET with short daily breaks — so overnight risk is real and continuous.</li>' +
          '<li><strong>Micros:</strong> Micro E-minis (MES, MNQ) are one-tenth the size, letting small accounts practice futures with far less risk per tick.</li>' +
          '<li><strong>US tax note:</strong> most futures get Section 1256 “60/40” treatment (60% long-term, 40% short-term) regardless of holding period — different from stocks.</li>' +
          '</ul>'
      },
      {
        title: 'Forex (FX)',
        html:
          '<p>Foreign exchange is the trading of one currency against another in <strong>pairs</strong> (EUR/USD, USD/JPY). It is the largest, most liquid market in the world, traded <strong>over-the-counter</strong> through brokers rather than a central exchange.</p>' +
          '<ul>' +
          '<li><strong>Hours:</strong> 24 hours a day, five days a week, following the global session handoff (Sydney → Tokyo → London → New York).</li>' +
          '<li><strong>Leverage:</strong> often very high — US retail is capped around 50:1 on majors, but offshore brokers advertise far more. High leverage plus small pip moves is a fast way to over-size.</li>' +
          '<li><strong>Costs &amp; units:</strong> priced in <em>pips</em>; traded in lots (standard 100k, mini 10k, micro 1k units). Most retail FX is spread-based, so the broker’s spread is your main cost.</li>' +
          '</ul>' +
          '<div class="callout warn"><div><b>Broker quality matters more here.</b> Because FX is OTC and lightly regulated in some jurisdictions, who you trade <em>with</em> is part of the risk. Prefer well-regulated brokers.</div></div>'
      },
      {
        title: 'Crypto',
        html:
          '<p>Cryptocurrencies (Bitcoin, Ether and thousands of others) are digital assets that trade <strong>24/7/365</strong> on crypto exchanges. The youngest, most volatile, and least uniformly regulated market here.</p>' +
          '<ul>' +
          '<li><strong>Always on:</strong> no close, no circuit breakers on most venues — a weekend headline can move your position while traditional markets are shut.</li>' +
          '<li><strong>Spot vs derivatives:</strong> you can buy the coin outright (spot) or trade high-leverage perpetual futures — the latter is where most blow-ups happen.</li>' +
          '<li><strong>Custody &amp; venue risk:</strong> “not your keys, not your coins.” Exchanges have failed and frozen withdrawals; the collapse of major venues has wiped out customer funds. Treat exchange and counterparty risk as real, not theoretical.</li>' +
          '</ul>' +
          '<div class="callout danger"><div><b>Volatility cuts both ways, hard.</b> Double-digit percent days are normal. The same move that makes crypto exciting is what liquidates over-leveraged accounts overnight.</div></div>'
      },
      {
        title: 'Which to start with',
        html:
          '<div class="table-wrap"><table class="table"><thead><tr><th>Instrument</th><th>Typical hours</th><th>Built-in leverage</th><th>Complexity</th></tr></thead><tbody>' +
          '<tr><td><strong>Stocks</strong></td><td>Regular + extended (ET)</td><td>None (margin optional)</td><td>Low</td></tr>' +
          '<tr><td><strong>ETFs</strong></td><td>Same as stocks</td><td>None (leveraged ETFs excepted)</td><td>Low</td></tr>' +
          '<tr><td><strong>Options</strong></td><td>Same as stocks</td><td>High (per contract)</td><td>High</td></tr>' +
          '<tr><td><strong>Futures</strong></td><td>~23h, Sun–Fri</td><td>High (built in)</td><td>Medium–High</td></tr>' +
          '<tr><td><strong>Forex</strong></td><td>24/5</td><td>High</td><td>Medium</td></tr>' +
          '<tr><td><strong>Crypto</strong></td><td>24/7</td><td>None spot / High derivatives</td><td>Medium</td></tr>' +
          '</tbody></table></div>' +
          '<p>There is no single “best” market, and this is not advice — but a common, sensible learning path is to build the fundamentals on the most <strong>transparent, regulated, lowest-leverage</strong> instruments first (cash-account stocks or major ETFs), where a mistake costs you a defined amount and no leverage multiplies it. Once reading price and managing risk are second nature, adding leverage (futures, forex) or complexity (options) is a deliberate step, not a starting point.</p>' +
          '<div class="callout info"><div><b>One principle carries across all of them.</b> Position size from your stop and risk a small, fixed fraction per trade. The instrument changes the mechanics; it never changes the math that keeps you in the game. See <a href="#/education/risk">Risk Management</a>.</div></div>'
      }
    ]
  };

  var FUNDED = {
    id: 'funded-accounts',
    title: 'Funded Accounts & Prop Firms',
    icon: 'dollar',
    blurb: 'What funded accounts and prop firms really are, the challenge rules that decide everything, and how to choose one without getting burned.',
    minutes: 13,
    sections: [
      {
        title: 'What a funded account is',
        html:
          '<p>A <strong>funded account</strong> lets you trade a firm’s capital instead of your own and keep a share of the profits. The appeal is obvious: access to larger size than you could fund yourself, without risking your personal savings on every trade.</p>' +
          '<p>There are two very different things wearing this name:</p>' +
          '<ul>' +
          '<li><strong>Traditional proprietary firms</strong> — you join a firm (often in-office, sometimes licensed), trade its real capital, and split profits. Selective and relationship-based.</li>' +
          '<li><strong>Online “funded challenge” firms</strong> — the modern, retail version: you pay a fee, pass an evaluation, and receive a funded account (frequently still a simulated account whose profits the firm pays out). This is what most people mean today, and what the rest of this lesson is about.</li>' +
          '</ul>' +
          '<div class="callout info"><div><b>The honest framing.</b> A challenge account is not free money — it is a paid test of your risk discipline. You are buying an opportunity to prove you can trade within strict rules, in exchange for a share of what you make.</div></div>'
      },
      {
        title: 'The evaluation (challenge) model',
        html:
          '<p>Almost every online funded offer is an <strong>evaluation</strong>: pay a one-time fee for an account of a chosen size, then hit a profit target <em>without breaking any risk rule</em>. Pass, and you move to a funded account with a profit split.</p>' +
          '<ul>' +
          '<li><strong>One-step</strong> — a single evaluation phase. Faster, usually stricter rules.</li>' +
          '<li><strong>Two-step</strong> — a “challenge” then a “verification” phase with a smaller target. Slower, often cheaper, a bit more forgiving.</li>' +
          '</ul>' +
          '<p>The catch that decides your outcome is almost never the profit target — it is the <strong>risk rules</strong> you must respect the entire time.</p>'
      },
      {
        title: 'The rules that decide everything',
        html:
          '<p>Breaching any one of these usually ends the account instantly — target progress and all. Understanding them <em>cold</em> is the whole game:</p>' +
          '<div class="table-wrap"><table class="table"><thead><tr><th>Rule</th><th>What it means</th></tr></thead><tbody>' +
          '<tr><td><strong>Profit target</strong></td><td>The gain you must reach to pass (often ~8–10% of account size).</td></tr>' +
          '<tr><td><strong>Max total drawdown</strong></td><td>The most your balance may fall from its start (or peak). <em>Static</em> = fixed floor; <em>trailing</em> = the floor rises as you profit, which is far easier to trip.</td></tr>' +
          '<tr><td><strong>Daily loss limit</strong></td><td>The most you may lose in a single day. Hit it and you are out, even mid-trade.</td></tr>' +
          '<tr><td><strong>Minimum trading days</strong></td><td>You must trade at least N days — you cannot pass in one lucky session.</td></tr>' +
          '<tr><td><strong>Consistency rule</strong></td><td>No single day may account for more than a set share of total profit — discourages one gamble carrying the pass.</td></tr>' +
          '<tr><td><strong>Prohibited strategies</strong></td><td>Many firms ban trading through high-impact news, automated/HFT bots, copy trading, or extreme hyper-scalping. Read this list.</td></tr>' +
          '</tbody></table></div>' +
          '<div class="callout warn"><div><b>Trailing drawdown is the classic killer.</b> When the loss floor follows your peak balance up, giving back too much of an open profit can fail you even while you are still net positive. Know exactly how your firm calculates it — end-of-day vs intraday, on balance vs equity.</div></div>'
      },
      {
        title: 'Fees, splits & payouts',
        html:
          '<p>Understand the economics before you pay:</p>' +
          '<ul>' +
          '<li><strong>Challenge fee:</strong> a one-time cost scaled to account size (roughly tens to several hundred dollars). Fail, and you buy another attempt — resets are a major revenue source for these firms.</li>' +
          '<li><strong>Profit split:</strong> commonly 80–90% to the trader, sometimes rising as you scale.</li>' +
          '<li><strong>Payout terms:</strong> minimum profit before a withdrawal, minimum days, and a payout schedule. The real question is not the advertised split — it is whether traders actually <em>get paid, on time,</em> consistently.</li>' +
          '</ul>' +
          '<div class="callout info"><div><b>Follow the money.</b> For many challenge firms, selling and re-selling evaluations is the core business. That is not automatically bad, but it means their incentive is for challenges to be <em>hard</em> — price the fee as tuition you may not get back.</div></div>'
      },
      {
        title: 'Futures firms vs forex/CFD firms',
        html:
          '<p>The two big categories work differently:</p>' +
          '<ul>' +
          '<li><strong>Futures evaluation firms</strong> — you trade futures (ES, NQ and their micros) on an evaluation, typically on simulated data, with the drawdown/daily-loss rules above. Popular with US day traders because futures suit the style.</li>' +
          '<li><strong>Forex / CFD firms</strong> — you trade currencies, indices and CFDs, usually on MetaTrader-style platforms. This corner is more lightly regulated and has seen more turnover among firms.</li>' +
          '</ul>' +
          '<p>Neither is inherently better; they demand different skills and carry different platform and regulatory considerations. Match the firm to the instrument you actually want to trade.</p>'
      },
      {
        title: 'How to choose one — and the red flags',
        html:
          '<p>Judge a firm on evidence, not marketing. A reasonable checklist:</p>' +
          '<ul>' +
          '<li><strong>Track record &amp; longevity</strong> — years in operation, not months.</li>' +
          '<li><strong>Verifiable payouts</strong> — documented, independent proof that traders are actually paid, on schedule.</li>' +
          '<li><strong>Clear, stable written rules</strong> — especially the exact drawdown mechanics. Rules that change often, or read ambiguously, are a liability.</li>' +
          '<li><strong>Realistic targets</strong> — a pass that requires reckless risk is designed to be failed.</li>' +
          '<li><strong>Responsive support and independent reviews</strong> — from real users, not affiliates.</li>' +
          '</ul>' +
          '<div class="callout danger"><div><b>Red flags:</b> guaranteed or “risk-free” language, opaque or frequently-changing rules, a wall of payout complaints, aggressive up-selling of resets, and targets so tight only gambling passes them. This is a young, lightly-regulated industry — firms have changed terms overnight, failed, and in some cases been shut down by regulators. Treat every fee as money you can lose.</div></div>'
      },
      {
        title: 'Which to start with, and how',
        html:
          '<p>This app will not point you at a single “best” firm — the list changes too fast to hard-code, and no one can honestly vouch for another company’s future payouts. What holds up is <em>how</em> you start:</p>' +
          '<ol>' +
          '<li><strong>Practice the rules first, for free.</strong> Most firms offer a free trial or you can replicate the rules on a demo. Prove you can hit a target <em>without</em> tripping the daily-loss or drawdown limit before you pay a cent.</li>' +
          '<li><strong>Start with the smallest account.</strong> The cheapest challenge teaches the same discipline as the largest, for a fraction of the fee. Scale up only after you can pass repeatably.</li>' +
          '<li><strong>Pick for durability.</strong> A multi-year track record with documented payouts beats a flashy new firm with a bigger split every time.</li>' +
          '<li><strong>Read every rule before paying,</strong> and know precisely how drawdown is measured on your account.</li>' +
          '</ol>' +
          '<div class="callout info"><div><b>The evaluation is a risk-management exam.</b> Most people fail not by failing to make money, but by breaking the daily-loss or drawdown rule chasing it. The <a href="#/education/risk">Risk Management</a> and <a href="#/education/psychology">Psychology</a> lessons here are the actual curriculum.</div></div>'
      },
      {
        title: 'Is it even right for you?',
        html:
          '<p>A funded account changes <em>whose</em> money is at risk; it does not create an edge you do not have. If you cannot trade a demo profitably within a fixed set of risk rules, a paid challenge simply converts fees into losses — often repeatedly.</p>' +
          '<p>The honest sequence is: build a strategy with positive expectancy, prove it on a journal over many trades (see the <a href="#/journal">Trade Journal</a> and <a href="#/insights">Insights</a>), and only then let a challenge test whether you can do it inside someone else’s guardrails. The firm is a funding mechanism, not a shortcut past the work.</p>'
      }
    ]
  };

  var STYLES = {
    id: 'trading-styles',
    title: 'Trading Styles & Timeframes',
    icon: 'clock',
    blurb: 'Scalping, day trading, momentum and swing trading — how long each holds, what it demands of you, and which fits your life.',
    minutes: 11,
    sections: [
      {
        title: 'How long you hold is your style',
        html:
          '<p>The same candlesticks, levels and risk math run through every style in this app. What separates a scalper from a swing trader is mostly one thing: <strong>how long a position is held</strong>, and therefore which chart timeframe you live on and how many decisions you make a day.</p>' +
          '<p>There is no “best” style — only the one that fits your <strong>available time, temperament and capital</strong>. A style that clashes with your life will lose money no matter how good the setup, because you will not be there to trade it well.</p>' +
          '<div class="callout info"><div><b>Pick the fit, not the fantasy.</b> Faster is not more profitable — it is just faster. Scalping looks exciting and is the hardest to do well; swing trading is quieter and often kinder to a beginner’s schedule and nerves.</div></div>'
      },
      {
        title: 'Scalping — seconds to minutes',
        html:
          '<p><strong>Scalping</strong> is the fastest style: many trades a day, each aiming for a small, fixed move (often just cents) with a very tight stop. Profit comes from doing a small edge <em>many times</em>, not from any one big win.</p>' +
          '<ul>' +
          '<li><strong>Hold time:</strong> seconds to a few minutes. <strong>Charts:</strong> 1-minute and tick.</li>' +
          '<li><strong>Demands:</strong> deep liquidity, low commissions and tight spreads (costs eat small targets alive), fast execution, and intense, sustained focus.</li>' +
          '<li><strong>Reality check:</strong> the highest skill and stress ceiling here. A single sloppy exit can erase many good scalps, so discipline and a daily loss limit matter more than anywhere else.</li>' +
          '</ul>' +
          '<p>TradeLab has a full playbook for this: see <a href="#/strategies/scalping">Scalping (level-to-level)</a>.</p>'
      },
      {
        title: 'Day trading — minutes to hours',
        html:
          '<p><strong>Day trading</strong> opens and closes positions within the same session and finishes <strong>flat by the close</strong> — no positions held overnight, so no overnight gap risk. This is the style most of this app is built around.</p>' +
          '<ul>' +
          '<li><strong>Hold time:</strong> minutes to hours. <strong>Charts:</strong> 1- to 15-minute.</li>' +
          '<li><strong>Trade-off:</strong> you sidestep overnight risk, but you must be at the screen during market hours, and the US <a href="#/education/order-types">Pattern Day Trader</a> rule applies to accounts under $25,000.</li>' +
          '<li>Most playbooks here — <a href="#/strategies/orb">ORB</a>, <a href="#/strategies/pullback">Pullback</a> — are day-trading setups.</li>' +
          '</ul>'
      },
      {
        title: 'Momentum trading — trade what is moving',
        html:
          '<p><strong>Momentum trading</strong> is less a timeframe than an <em>approach</em>: buy strength and sell weakness, entering names that are already moving hard on volume and a catalyst, and riding the continuation until it stalls. You can apply it intraday or over several days.</p>' +
          '<ul>' +
          '<li><strong>The idea:</strong> a stock in motion tends to stay in motion — fresh news pulls in more buyers, short sellers cover, and the move feeds itself, until it exhausts.</li>' +
          '<li><strong>What it needs:</strong> relative volume (<a href="#/glossary">RVOL</a>) and a real catalyst; momentum without participation fades. Entries come on continuation, not by guessing tops or bottoms.</li>' +
          '<li><strong>The risk:</strong> momentum reverses fast and late entries are brutal — chasing a move that already ran is the classic momentum mistake. It rewards decisiveness and punishes hesitation and greed.</li>' +
          '</ul>' +
          '<p>Momentum tools and setups here: <a href="#/strategies/macd">MACD Momentum</a>, <a href="#/strategies/orb">Opening Range Breakout</a>, and <a href="#/strategies/abcd">ABCD</a>.</p>'
      },
      {
        title: 'Swing trading — days to weeks',
        html:
          '<p><strong>Swing trading</strong> holds a position for <strong>several days to a few weeks</strong> to capture one larger “swing” in price — a multi-day leg of a trend or a bounce from support. Far fewer decisions than day trading, at the cost of accepting overnight and weekend risk.</p>' +
          '<ul>' +
          '<li><strong>Hold time:</strong> days to weeks. <strong>Charts:</strong> hourly and daily, with the weekly for context.</li>' +
          '<li><strong>Fits:</strong> people who cannot watch screens all day. You can plan trades in the evening, set orders, and check in once or twice a day.</li>' +
          '<li><strong>The catch — gap risk:</strong> holding overnight means news can gap the stock through your stop before you can act, so stops are wider and position sizes smaller. Earnings dates become landmines to plan around.</li>' +
          '<li><strong>Bonus:</strong> the PDT rule is a non-issue, since trades span multiple days rather than round-tripping intraday.</li>' +
          '</ul>'
      },
      {
        title: 'Position trading — weeks to months',
        html:
          '<p>For completeness: <strong>position trading</strong> holds for <strong>weeks to months</strong>, following major trends and often blending in fundamentals. It sits closest to investing — the widest stops, the fewest trades, and the least screen time of any active style.</p>'
      },
      {
        title: 'Which one fits you?',
        html:
          '<div class="table-wrap"><table class="table"><thead><tr><th>Style</th><th>Typical hold</th><th>Charts</th><th>Trades / day</th><th>Overnight risk</th></tr></thead><tbody>' +
          '<tr><td><strong>Scalping</strong></td><td>Seconds–minutes</td><td>Tick, 1-min</td><td>Many (dozens)</td><td>None</td></tr>' +
          '<tr><td><strong>Day trading</strong></td><td>Minutes–hours</td><td>1–15 min</td><td>A few</td><td>None</td></tr>' +
          '<tr><td><strong>Swing trading</strong></td><td>Days–weeks</td><td>Hourly, daily</td><td>&lt; 1 (a few a week)</td><td>Yes</td></tr>' +
          '<tr><td><strong>Position trading</strong></td><td>Weeks–months</td><td>Daily, weekly</td><td>Rare</td><td>Yes</td></tr>' +
          '</tbody></table></div>' +
          '<p><em>Momentum</em> is deliberately absent from the table — it is a way of choosing <em>what</em> to trade (things in motion) that you can layer onto day trading or swing trading alike.</p>' +
          '<p>Choose by honest self-assessment, not by which looks most thrilling:</p>' +
          '<ul>' +
          '<li><strong>Full days free and quick reflexes?</strong> Day trading or scalping are open to you — but start with day trading; scalping’s margins are unforgiving to learn on.</li>' +
          '<li><strong>A day job or limited screen time?</strong> Swing trading almost certainly fits better than fighting the market on a phone between meetings.</li>' +
          '<li><strong>Hate holding through uncertainty?</strong> The flat-by-the-close styles (day, scalp) will let you sleep; swing and position trading will not.</li>' +
          '</ul>' +
          '<div class="callout info"><div><b>The math does not change.</b> Whatever style you pick, size from your stop and risk a small fixed fraction per trade. Style sets the pace; <a href="#/education/risk">risk management</a> keeps you in the game long enough for an edge to show.</div></div>'
      }
    ]
  };

  window.EDUCATION_DATA = (window.EDUCATION_DATA || []).concat([TOPIC, MARKETS, FUNDED, STYLES]);
})();
