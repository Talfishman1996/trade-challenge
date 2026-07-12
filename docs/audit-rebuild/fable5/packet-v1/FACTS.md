# Factual Product Context

## Product and People

- Product name: TradeVault.
- Current deployment type: browser application with a React frontend and a
  Cloudflare Worker/KV synchronization service.
- Primary owner use: record and review personal BTCUSDT perpetual trades across a
  phone and other devices.
- Expected continuity: saved trades and changes remain available after navigation,
  reload, and device switching.
- Review use: invited reviewers will operate a prototype as though it were their
  personal tracker and provide criticism. Persistent individual reviewer accounts
  are not required.
- Primary form factor: mobile portrait. Mobile landscape, tablet, and desktop are
  compatibility surfaces.
- Current application source is preserved in `app-source/`.
- Screenshot data is synthetic. The packet does not include the owner's production
  trade dataset, credentials, or private sync payload.

## Current Tracked Application

- Current challenge identity in source: `$20,000` to `$10,000,000`.
- Current gross reward/risk constant: `1:1`.
- Current sizing implementation: piecewise sizing from `$20,000` to an `$87,500`
  anchor, followed by a two-thirds power decay. The exact implementation is
  `app-source/src/math/risk.js` and its constants are in
  `app-source/src/math/constants.js`.
- Current primary destinations: Home, Trades, Analysis, and Settings.
- Trade Entry is an overlay opened from the application shell.
- Analysis includes Milestones, Data Matrix, Risk Curves, Stress Test, Projections,
  and Compare surfaces in source.
- Trade records support manually entered realized profit/loss and a break-even
  outcome, plus optional metadata visible in Trade Entry.
- Local application data uses browser storage. Image attachments use IndexedDB.
- Cross-device synchronization uses the frontend contract in
  `app-source/src/sync.js` and the Worker contract in
  `app-source/worker/src/index.js`.

## Planned Challenge Model

The planned prototype identity differs from the current tracked implementation:

- Start equity: `$100,000`.
- Target equity: `$10,000,000`.
- Gross reward/risk: `1:1`. Example: if planned risk is `$15,000`, a gross win adds
  `$15,000` before fees, funding, slippage, and other execution costs; a gross loss
  subtracts `$15,000`.
- Planning trade frequency: `3.5` trades per month.
- Planning break-even share: `10%` of trades.
- Planning win-rate scenarios: `65%`, `70%`, and `75%` where evaluated.
- Intended sizing representation: continuous dollar risk against log equity using
  shape-preserving piecewise cubic Hermite interpolation between the anchors below.
- Intended percentage risk: interpolated dollar risk divided by current equity.

| Equity | Risk percent | Dollar risk |
|---:|---:|---:|
| `$100,000` | `15.0%` | `$15,000` |
| `$200,000` | `12.5%` | `$25,000` |
| `$500,000` | `10.0%` | `$50,000` |
| `$1,000,000` | `7.5%` | `$75,000` |
| `$2,000,000` | `6.0%` | `$120,000` |
| `$5,000,000` | `5.0%` | `$250,000` |
| `$10,000,000` | `3.0%` | `$300,000` |

The current source does not yet implement this planned curve. Endpoint behavior,
rounding, cost assumptions, model-version treatment for historical trades, and
break-even classification after costs have not been supplied in this packet as
final decisions.

## Trading Context

- Execution venue named by the owner: Phemex Pro.
- Typical current tier: VIP 2; VIP 3 can apply depending on rolling activity.
- Instrument context: BTCUSDT perpetuals.
- Trade frequency is not an adjustable planning lever for this review.
- Gross `1:1` reward/risk is not an adjustable planning lever for this review.
- Positions may use cross margin and liquidation rather than a conventional stop
  order. The tracker records realized outcomes; it does not execute orders.
- No authoritative fixed slippage, funding, maker/taker mix, or fee value is
  included. Recommendations that depend on those values should name the missing
  evidence and show sensitivity rather than assume a single value.

## Evidence Conditions

- Browser captures use deterministic synthetic fixtures and an isolated Worker
  replacement. No capture called the production Worker.
- Thirteen requested viewport classes are represented. The browser engine is a
  controlled Chromium-class environment with emulated viewport dimensions.
- The corpus contains no physical iOS capture, physical Android capture, genuine
  virtual-keyboard capture, or workflow video.
- Raw timing measurements are local laboratory observations, not field-user data.
- Raw automated geometry, naming, and contrast outputs are bounded scans rather
  than certification results.
- The large-history fixture contains 500 trades.
- All evidence files are listed and hashed in `ASSET-MANIFEST.tsv`.
