# ECONOMY MODEL

Covers spec item 10: Economy and Business Engine (spec §48–§56, §116).

The economy is *real* at every phase: every unit of value has a physical or service
origin, every price is the result of supply and demand between agents, and every
company has customers, revenue, costs, labour and inventory. Nothing is a counter.

---

## 1. Phase 1 — no economy, only physics and family

- Items have mass, spoilage (raw meat 2 days, berries 4, cooked 6, dried 60) and
  usefulness. Agents *own* what they carry and what is in their dwelling storage.
- Households share freely (`give` action driven by `careForChild`, `empathy`, `love`).
- Non-household sharing is emergent generosity: `P(give food) = empathy × mood ×
  (own surplus) × friendship`. This produces `gratitude` and later `trust`, which is
  the soil in which barter grows.

## 2. Phase 2 — ownership, barter, occupations

- **Ownership** becomes explicit: buildings, storage contents, tools, later land
  (farm plots). Theft is taking owned items when unobserved; the owner's discovery
  creates `resentment`, memories, and reputation effects (social memory `knownFacts`).
- **Barter** appears when two agents with complementary surpluses meet and both
  value the other's good more (subjective value = `need urgency × scarcity in own
  knowledge`). A completed exchange is a `Trade` event with both sides' valuations —
  this is the raw data from which *prices* later emerge.
- **Occupations** are not assigned: an agent's occupation label is the action class
  it spent the most time on in the last 30 days (`gatherer`, `hunter`, `builder`,
  `miner`, `crafter`, `farmer`…). Specialisation emerges from skills + local demand.

## 3. Phase 3 — markets, money, companies

- **Market** = a building where trade offers are posted. Price discovery: each good
  keeps a moving average of executed trade ratios; sellers/buyers anchor to it ±
  personality (`greed`, `patience`).
- **Money** emerges when a good is repeatedly accepted in trade not for use but for
  re-trade (`commodity money` detection: an item traded ≥ K times without consumption
  in a settlement). Coins/paper/bank money are discoveries + institutions
  (`minting`, `banking`) that attach to this behaviour rather than replacing it.
- **Companies**: an agent with `ambition`, capital (owned goods/money) and a
  recognised demand (market data shows sustained price > cost) founds a `Company`:

```ts
Company { id, name, founder, owners: {agentId: share}, kind, settlement,
          employees: agentId[], wages, inventory, capital, revenue, costs, profit (rolling),
          products: [{item|service, capacity, unitCost}], reputation, strategy: {price, invest, expand} }
```

  Each world day: buy inputs at market, produce with labour × tools × infrastructure,
  sell at its price, pay wages (employees are agents whose `work` goal selects the
  best offer near home), retain profit as capital. Loss for `N` months → downsizing →
  layoffs (real unemployment) → bankruptcy (assets sold). Competitors enter when
  margins are high; prices fall; innovation (funding `experiment` goals of employees
  = R&D) creates differentiation.

- **Wealth & inequality** are readouts of ownership; they feed politics (Phase 3) via
  `status` need and `resentment` toward wealthy neighbours, and culture (collectivism
  vs individualism drift).

## 4. Phase 3–4 — finance and state

- **Banking**: deposits, loans with interest, default risk from borrower's income
  history; credit accelerates company growth and creates crises when bubbles pop
  (asset prices detached from cash flows → `riskTolerance` × leverage).
- **Tax**: governments (politics module) levy on trade/income/property; spend on
  infrastructure, armies, institutions; deficits → debt → inflation if money is
  printed. All flows are ledgers, inspectable.
- **Investment**: agents/companies buy shares of companies; capital markets form when
  volume is sufficient (a `stock_exchange` building + `joint_stock` discovery).

## 5. Phase 4–5 — industry and digital economy

- Mass production: factories convert inputs with high throughput but require
  energy (grid) and machinery (capital goods produced by other companies).
- Digital goods: near-zero marginal cost, distribution requires network coverage.
- Business models are *strategies* a company can adopt when the prerequisites exist:
  `subscription` (recurring revenue vs churn), `advertising` (revenue ∝ attention ×
  advertiser demand), `marketplace` (take rate × GMV; network effects), `software
  sales`, `services`, `financial products`, `creator economy` (individuals monetising
  audience). None is mandatory or ordered; a company picks by expected profit given
  its capabilities, with `riskTolerance`/`creativity` noise.

## 6. Phase 6 — automated commerce

- Software of kind `automation` raises productivity of the occupation it targets and
  reduces labour demand; `ai_model` software (from the in-world AI) can run an
  *autonomous company*: a `Company` whose `strategy` is set by the AI entity rather
  than an agent, with capability-dependent quality. Virtual revenue and wealth accrue
  to the owner (a person, a company, or a state), with all the social effects wealth
  already has.

## 7. Consistency guarantees (spec §108, §116)

- Conservation: every item exists exactly once (inventory, storage, tile, or
  consumed/spoiled event). Money supply changes only via minting/banking events.
- Double-entry: every trade writes both sides; every company day writes a P&L
  record; tests assert `Σ assets − Σ liabilities` matches the ledger for each entity.
- Inspectability: any company's inspector shows customers (who bought), revenue,
  expenses, labour, demand estimate — the "no fake economy" rule.
