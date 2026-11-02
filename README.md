# Healthcare Accessibility Simulator

**Synthetic proof of concept** - the gap between the *availability* of healthcare providers and a patient's practical *accessibility* to them.

## Quick start

Requirements: **Node.js 20+**, npm, and a network connection to install JavaScript packages the first time.

```bash
npm install
npm run dev
```

Open the local address shown by Vite (usually **http://localhost:5173**). To make a production build, use `npm run build`, then `npm run preview` to view it. Run `npm test` for model logic tests (requires `tsc` from the installed dev dependencies, or a globally available TypeScript compiler).


## Two-minute guided demo

1. Select **Patient A**, who has Plan A insurance and relies on transit. Inspect the colored provider markers (each displays a 0–100 score).
2. Click **Westside Counseling**. It is nearby but scores 0 because it does not accept Plan A. The **Score explainer** shows the constraint.
3. Switch the patient to **Plan B**. Westside becomes eligible; scores and rankings update immediately.
4. Press **Reset baseline**, select **Add a new clinic**, and click on the schematic map. A fictional provider is created exactly where you clicked.
5. Edit the clinic's appointment wait, accepted plans, and available slots. Compare provider rankings before/after.
6. Change transportation from **Transit** to **Car**. Observe the travel-time and access-score changes.
7. Select the **Population** tab to compare baseline vs. scenario for all four fictional patients. Reset to experiment again.

## Model and equations

For patient *i* and provider *j*:

```
A(i,j) = I(i,j) × C(j) × [ 0.60 × T(i,j) + 0.40 × W(j) ]
T(i,j) = max(0, 100 − 2 × travel_minutes(i,j))
W(j)   = max(0, 100 − 2 × wait_days(j))
I(i,j) = 1 if the provider accepts the patient's plan, otherwise 0
C(j)   = 1 if the provider has at least one open slot, otherwise 0
```

Scores are rounded to **one decimal place**, from **0 (blocked/low access)** to **100 (high modeled access)**. A provider is labeled **viable** only if it accepts the patient's insurance, has a nonzero number of slots, **and scores at least 50**. This threshold is **arbitrary** and only for demonstration.

**Travel-time approximation** (invented coordinates, no real roads or transport schedules):

```
straight_line_miles = hypot(x_patient − x_provider, y_patient − y_provider) × 0.12
transit_minutes     = round(10 + straight_line_miles /  9 × 60)
car_minutes         = round( 5 + straight_line_miles / 18 × 60)
```

The 10-minute transit and 5-minute car constants are toy access/parking overheads. The speeds (9 and 18 mph), score penalties (2 points per minute/day), weights (60%/40%), threshold (50), and map scale (0.12 miles per unit) are **hypothetical, not researched or calibrated**. The synthetic model treats accepted insurance and remaining capacity as absolute constraints. Out-of-network self-pay, telehealth, affordability, provider quality, clinical compatibility, and patient preferences are omitted.

### Score example

If a covered, available provider is **20 minutes** away and has a **10-day wait**, its travel score is 60 and wait score is 80, so:

`A = 1 × 1 × (0.6 × 60 + 0.4 × 80) = 68`.

If that provider does not accept the patient's plan, the score becomes **0 regardless of travel time or wait**.

### Intervention impacts

All interventions recompute scores using the **same equations**. They do not artificially add points.

- **Switch insurance:** updates eligibility and may make some providers score 0 while unlocking others.
- **Switch transport:** changes estimated travel minutes across all providers.
- **Place clinic on map:** creates a new provider with default 7-day wait, 12 slots, and acceptance of the selected patient's current plan. Edit all three in the sidebar.
- **Change appointment wait:** modifies the wait subscore for that provider.
- **Change available slots:** a zero count blocks the provider; any positive count permits it. Slots do **not** represent capacity-constrained assignment in this baseline.
- **Change accepted insurance:** toggles eligibility on a per-provider basis.
- **Reset baseline:** restores the initial four patients and six providers, removes proposed clinics, and clears all interventions.

### Reported outcomes

**Individual:** best provider score, count of eligible providers scoring at least 50, top-ranked provider, complete rankings, and explainable provider-level scores.

**Population:** mean of each patient's *best* provider score; count of patients with at least one viable provider; and before→after best-provider scores for each of the four individuals.

For population *P* with provider set *H*:

```
Mean best-provider access = (1 / |P|) × Σ over i∈P [ max over j∈H A(i,j) ]
```

Baseline comparison always uses the **original** population/provider lists, even when the current scenario contains multiple simultaneous interventions. If you want to compare interventions independently, press Reset between them.

> **Important distinction:** A best-provider score is a **modeled comparative index**, NOT a probability that the patient will receive care. A greater score does not imply an equivalent improvement in attendance, treatment initiation, or health outcomes.

## Architecture

```text
src/
  data/scenario.ts           # All synthetic patients, providers and types
  model/accessibility.ts     # Pure scoring, travel, rankings and summary functions
  components/CityMap.tsx    # Scalable SVG schematic map + clickable provider markers
  App.tsx                   # UI controls, interventions, before/after comparison
  styles.css                # Responsive UI styling
  main.tsx                  # React entry point
tests/
  model.test.mjs            # Model invariants and basic regression tests
```

Tech stack: **React 18 + TypeScript + Vite + Lucide icons**. No charting or mapping SDK is required for this initial demonstration. We intentionally chose a scalable SVG map so the demo requires **no online basemap requests**, is easy to share, and allows click-to-place clinics reliably. The neighborhood labels are illustrative. Google Fonts may load if internet is available; the browser falls back to system fonts if not.

## Model limitations and next steps

1. **Literature review and validation:** quantify empirically supported effects of travel burden, wait times, insurance, affordability, and referral completion. Test nonlinear formulations and interaction effects rather than assume additive linear scores.
2. **Actual geographic data:** replace schematic coordinates with validated Philadelphia population locations and healthcare provider coordinates; use a routing engine or travel-time API for road/transit times.
3. **Clinical relevance:** distinguish specialty, service type, appointment type, language availability, referral requirements, accepting-new-patients status, and telehealth suitability.
4. **Capacity-aware networks:** currently any provider with ≥1 open slot can count as viable for every patient, which overstates accessibility when many patients compete for finite slots. Build a patient→provider matching algorithm (bipartite matching/min-cost flow, time windows, capacity constraints).
5. **Equity metrics:** compute intervention effects by subgroup, geographic area, and insurance; examine variance and lowest-decile improvement, not only averages.
6. **Uncertainty and sensitivity:** vary model coefficients, missing data, and patient preferences; report scenario ranges and check whether conclusions are robust.
7. **Real map and richer frontend:** later swap the SVG map for MapLibre GL JS or React Leaflet without changing the scoring logic. Plan for privacy/security review if transitioning beyond synthetic data.

## Appropriate classroom framing

This is an interactive *explanation of a proposed method*, not evidence of actual access disparities. You can use it to show the logic of an individualized accessibility score, its representation as weighted patient–provider links, and how hypothetical interventions change rankings. In the written report, distinguish toy demonstrations from evidence-backed results and describe assumptions prominently.

---

## Network optimization 

**Optimize network** tab inside the **Accessibility results** panel. Adds computed network optimization to the initial scoring demonstration. The original Individual and Population modes remain available.

### A. Capacity-constrained matching (minimum-cost flow)

In this extension, each of the four fictional patient profiles stands for a **cohort of synthetic care seekers**, with arbitrary demand: Patient A = 21, B = 18, C = 23, D = 17 (79 total). Provider `slots` now constrain the **number of simulated care seekers who may be assigned**, rather than merely checking whether at least one slot exists.

Let `x_ij` be the nonnegative integer number of care seekers from cohort `i` assigned to clinic `j`, `d_i` the demand in cohort `i`, `c_j` the appointment slots at clinic `j`, and `A_ij` the original access score.

Constraints:

```
0 <= x_ij (integer)
Σ_j x_ij <= d_i                    for each cohort i
Σ_i x_ij <= c_j                    for each clinic j
x_ij = 0 if A_ij < 50 or pair is ineligible
```

**Lexicographic objective:** (1) maximize the total number of patients assigned; (2) among maximum-coverage assignments, maximize the sum `Σ_ij A_ij * x_ij`.

Implementation: a directed min-cost flow network with `source → cohorts → clinics → sink` and a separate `cohort → sink` arc representing unserved patients. Served arcs cost `1000 − 10*A_ij`, and unserved arcs cost `(totalDemand + 1) × 1001`. This large penalty exceeds the maximum possible aggregate difference in score cost for the finite simulated population, ensuring that served headcount is prioritized above score improvements. Successive shortest augmenting paths are found with Bellman–Ford on the residual network. This is small enough for our toy data; more scalable implementations may use specialized min-cost flow packages.

The display includes: matched and unmatched headcounts, average realized accessibility per care seeker (zero for unserved), least-served cohort coverage, an assignment network (line thickness proportional to count), cohort fulfillment bars, and clinic utilization bars.

A provider's score may be high for many patients, but its appointment slots cannot be simultaneously allocated to everyone. This model handles demand competition globally instead of treating each patient as independent.

### B. Facility location and scenario optimization

The optimizer evaluates **10 fictional candidate clinic sites**. At each site it adds a hypothetical clinic that:

- has 18 available slots,
- accepts all three fictional insurance plans,
- has a 7-day appointment wait,
- uses the same schematic travel-time and score calculations as existing providers.

It then reruns the full capacity-constrained matching problem. Select one of two objectives:

- **Efficiency:** maximize the number served, then maximize total realized accessibility (`Σ A_ij*x_ij`).
- **Equity:** maximize **the minimum fraction of demand served among the four patient cohorts**, then maximize number served, then realized accessibility.

The **equity objective compares sites based on the output of the same efficiency-first allocation algorithm**. It does not solve a separately fairness-constrained matching optimization; a future upgrade could optimize patient allocations under an explicit minimum-coverage constraint. Because the model is small and the capacity structure is constrained, both objectives can select the same clinic site. That is an allowable result, not a bug.

You can manually select other sites, compare the prospective outcomes, and click **Add this clinic to the live scenario** to apply its location and attributes to the existing map and scoring models. Applying a site with the same id again replaces the earlier copy rather than duplicating it. Reset baseline removes new clinics.

### C. Key modeling and interpretation distinctions

| Quantity | What it means |
| --- | --- |
| Accessibility score `A_ij` | *Potential* attractiveness of a single patient–provider relationship (0–100 synthetic index) |
| Best-provider score | Highest *potential* score for a patient, **ignores competition for slots** |
| Matched headcount | Number of synthetic care seekers **assigned** to a provider subject to capacity |
| Mean realized access per seeker | Sum of assigned-edge scores / total demand, assigning zero to unserved seekers |
| Minimum cohort coverage | Smallest served/demand ratio among the four cohorts |

This optimization illustrates model-based **assignment**, not observed clinical attendance, completed referrals, health outcomes, or the availability of actual appointments.

Important limitations: cohorts are homogeneous internally; the model permits dividing a cohort across clinics; wait time remains fixed after assigning appointments; patients do not express preferences; the threshold of 50 is arbitrary; there is no temporal queuing, provider specialty variation, geographic routing, or objective/weight calibration. The solver is intentionally small-scale. Neither objective is inherently an ethically correct allocation policy.

### Additional source modules

```text
src/model/network.ts              # Min-cost flow, assignments, facility-location search
src/components/OptimizationLab.tsx # Assignment graph, capacity metrics, site optimizer UI
tests/network.test.mjs             # Matching invariants and site-analysis regression tests
```

Run `npm test` for the original scoring tests and the new network tests.
