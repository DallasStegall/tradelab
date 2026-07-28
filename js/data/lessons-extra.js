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
  window.EDUCATION_DATA = (window.EDUCATION_DATA || []).concat([TOPIC]);
})();
