/* ==========================================================================
   TradeLab — Resources
   A cached, offline directory of reputable FREE / primary-source links. The
   page works offline like the rest of the app; following a link needs a
   connection. These are pointers for study, NOT endorsements, affiliations,
   or financial advice — verify anything before relying on it.

   Public API: Resources.render(container, sub)
   ========================================================================== */
(function () {
  'use strict';

  var GROUPS = [
    {
      cat: 'Company filings & news (primary sources)',
      icon: 'journal',
      note: 'Go to the source before you trust a headline. Filings are the record; a re-posted PR is not.',
      items: [
        { name: 'SEC EDGAR — full-text search', url: 'https://www.sec.gov/edgar/search/', desc: 'Every US public company filing. 8-K = material news; S-1 / 424B = share offerings and dilution risk; 10-Q / 10-K = the numbers.' },
        { name: 'SEC.gov', url: 'https://www.sec.gov/', desc: 'The regulator itself — press releases, enforcement actions, and investor alerts.' }
      ]
    },
    {
      cat: 'Economic data & event calendars',
      icon: 'calendar',
      note: 'Know the day’s scheduled catalysts before the open. An 8:30 AM or 2:00 PM ET release can invalidate any setup that trades into it.',
      items: [
        { name: 'Federal Reserve — FOMC calendar', url: 'https://www.federalreserve.gov/monetarypolicy/fomccalendars.htm', desc: 'Official dates for rate decisions and statements — the highest-impact scheduled events for US markets.' },
        { name: 'Bureau of Labor Statistics — release schedule', url: 'https://www.bls.gov/schedule/news_release/', desc: 'Exact dates and times for CPI (inflation) and the monthly jobs report (nonfarm payrolls).' },
        { name: 'FRED — Federal Reserve Economic Data', url: 'https://fred.stlouisfed.org/', desc: 'Free, charted economic data (rates, inflation, employment) straight from the St. Louis Fed.' }
      ]
    },
    {
      cat: 'Market hours, holidays & halts',
      icon: 'clock',
      items: [
        { name: 'NYSE — hours & holiday calendar', url: 'https://www.nyse.com/markets/hours-calendars', desc: 'Regular hours, half-days, and the full-day market holidays — plan around the early closes.' },
        { name: 'Nasdaq — trading halts', url: 'https://www.nasdaqtrader.com/trader.aspx?id=TradeHalts', desc: 'The live feed of halted stocks and halt reasons (volatility, news pending, LULD).' }
      ]
    },
    {
      cat: 'Investor education & safety',
      icon: 'shield',
      items: [
        { name: 'Investopedia', url: 'https://www.investopedia.com/', desc: 'Plain-language definitions and explainers for almost any market term — a good second reference alongside this app’s glossary.' },
        { name: 'FINRA BrokerCheck', url: 'https://brokercheck.finra.org/', desc: 'Check the background, licensing and complaint history of any US broker or financial professional — free.' },
        { name: 'Investor.gov (SEC)', url: 'https://www.investor.gov/', desc: 'The SEC’s investor-education site: basics, fee calculators, and fraud alerts. Start here if a “can’t-lose” opportunity finds you.' }
      ]
    },
    {
      cat: 'Charting & screening tools',
      icon: 'search',
      note: 'A scanner should let you filter by gap %, relative volume (RVOL), price, float and spread — the filters the Finding Trades lesson covers. The names below are widely-used free tiers; they are examples, not recommendations, and tools change over time. Verify features yourself and never enter broker credentials into a third-party site.',
      items: [
        { name: 'Finviz', url: 'https://finviz.com/', desc: 'A free stock screener and heat-map; useful for building and filtering a watchlist by fundamentals and technicals.' },
        { name: 'TradingView', url: 'https://www.tradingview.com/', desc: 'Free-tier charting with indicators (EMAs, VWAP, MACD) and drawing tools for marking levels.' }
      ]
    }
  ];

  function itemHtml(it) {
    return '<a class="res-item" href="' + App.esc(it.url) + '" target="_blank" rel="noopener noreferrer">' +
      '<div class="res-name">' + App.esc(it.name) + ' ' + App.icon('uploadIc', 13) + '</div>' +
      '<div class="res-desc small">' + App.esc(it.desc) + '</div>' +
      '<div class="res-url small muted">' + App.esc(it.url.replace(/^https?:\/\//, '').replace(/\/$/, '')) + '</div>' +
      '</a>';
  }

  function render(container, sub) {
    var root = document.createElement('div');
    var html =
      '<div class="page-header"><h1>Resources</h1>' +
      '<p class="lede">A short, curated shelf of reputable free tools and primary sources for your own research. This page works offline; the links open external sites, so following them needs a connection.</p></div>' +
      '<div class="callout warn"><div><b>Read before you click.</b> These are pointers for study, not endorsements, affiliations, or financial advice — and the internet changes, so verify anything before you rely on it. Links open in a new tab. Never enter a password, broker login, or payment details into a site you reached from a link.</div></div>';

    html += GROUPS.map(function (g) {
      return '<section class="card" style="margin-top:16px">' +
        '<div class="card-title">' + App.icon(g.icon || 'layers', 15) + ' ' + App.esc(g.cat) + '</div>' +
        (g.note ? '<p class="small muted" style="margin:6px 0 10px">' + App.esc(g.note) + '</p>' : '') +
        '<div class="res-list">' + g.items.map(itemHtml).join('') + '</div>' +
        '</section>';
    }).join('');

    root.innerHTML = html;
    container.innerHTML = '';
    container.appendChild(root);
  }

  window.Resources = { render: render };
})();
