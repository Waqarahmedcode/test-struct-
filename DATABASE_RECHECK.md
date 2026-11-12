# KAWT database re-check — 11 November 2026

## What was checked
- All five local PostgreSQL migration files, Drizzle mappings, TypeScript seed, Next.js query/API code, and all six historical source JSON records derived from the uploaded `.md` dashboard.
- Python source arithmetic checks: **PASS** (`python3 tests/audit_data.py`).
- **Not tested:** connected Supabase database, actual applied migration state, trigger execution, Row Level Security roles in a deployed instance, production payment or WhatsApp integrations. The local project contains `.env.example` but no `.env`, and no database connection string was supplied.
- The original `KAWT-All-Camps-Complete-Report.html` was not attached; exact invoice-level reconciliation against the primary audit remains pending.

## Reconciled reported totals

| Camp | Patients | Total PKR | Zakat PKR | General PKR |
|---|---:|---:|---:|---:|
| FMC-01 | 320 | 257,500 | 181,000 | 76,500 |
| FMC-02 | 254 | 243,360 | 177,560 | 65,800 |
| FMC-03 | 577 | 505,160 | 401,260 | 103,900 |
| FMC-04 | 619 | 605,851 | 497,291 | 108,560 |
| FMC-05 | 548 | 419,506 | 267,806 | 151,700 |
| FMC-06 | 594 | 385,194 | 338,194 | 47,000 |
| **Total** | **2,912** | **2,416,571** | **1,863,111** | **553,460** |

## Source quality warnings
1. **FMC-01:** Gender subtotals cover 310 of 320 people; age subtotals cover 300 of 320.
2. **FMC-02:** Age subtotals cover 251 of 254; medicine detail rows cover 4,862 of 5,557 source-reported units.
3. **FMC-03:** Disease rows cover 566 of 577 attendees; medicine detail rows cover 11,360 of 11,590 source-reported units.
4. **FMC-04:** Gender subtotals cover only 330 of 619; age/sex were mixed. Dispensed medicine units **unknown**. Disease-share entries are inferred from medical purchasing categories, not individual consultations.
5. **FMC-05:** Gender subtotals cover only 260 of 548; medicine dispensing units and diagnoses are **unknown**.
6. **FMC-06:** Gender subtotals cover only 311 of 594; 4,191 source units are a partial product-group count, and 294 liquids/creams/sachets were excluded. Disease-share rows are medicine proxies, not diagnoses. Historical amount difference PKR 0.83 between printed bill and confirmed ledger needs a linked receipt for closure.

Treat 26,500 units as the sum of reported counts present in the dataset, **not proof of the full six-camp dispensing total**; FMC-04/05 quantities were not recorded.

## Corrections in this revision
- Added `202611110005_database_audit_fix.sql` migration:
  - `NULL` instead of falsely documented `0` for FMC-04/05 historical medicine counts; original source is kept in `source_snapshot`.
  - All FMC-04/FMC-06 historical disease rows marked `pharmacy_proxy_not_clinical_diagnosis`.
  - Cross-camp check for consultations and centre referrals.
  - Unique primary diagnosis per consultation.
  - A Zakat approval trigger that works when a different authorized manager screened the patient; does not grant broad profile reads to end users.
  - Prevents new patient registration against closed or unapproved camps.
- Updated `db/seed.ts` to represent source-unknown dispensing quantities as NULL and preserve disease provenance.
- Updated `lib/dashboard.ts`: **historical camps report their sealed source totals instead of summing newly digitized backfill records again**. Live registration totals are still available separately for reconciliation.
- Updated dashboard charts to exclude FMC-04 and FMC-06 pharmacy-proxy disease categories, including when a camp is individually selected.
- Expanded source audit tests and warnings in `tests/audit_data.py`.

## Additional production requirements
- Run every migration (001–005) in order against a fresh development Supabase instance, then run the seed and audit SQL below. Test with real admin, camp-manager, doctor, pharmacist, donor and anonymous roles.
- Add controlled financial reversal postings. Current ledger is append-only with positive amounts, and its `reversal_of` column **does not yet implement a working reversal workflow**.
- Add reliable historical correction and approval workflow; never retroactively regenerate lost patient sex or dispensing data.
- Reconcile each medicine invoice to stock movement; purchase receipts are not proof of patient-linked dispensing.
- Prove storage access to invoice/receipt attachments and confirm upload paths cannot leak patient or donor personal information.
- Verify backup/restore, audit logging, patient-consent retention, and disaster-recovery procedures before storing medical records.
- Webhook integration credentials, bank IBANs and certificate-validity claims require authorized verification; current external integrations should remain disabled or in test mode.

## Steps to verify after obtaining a database

```bash
cd KAWT_Growth_Ecosystem
cp .env.example .env
# Enter your own database/Supabase keys securely (never commit the file)
npm install
# Link to the correct test project with Supabase CLI before pushing migrations
npx supabase db push
npm run db:seed
npm run test:data
npm run typecheck
```

Example **read-only** SQL verification after applying migrations and seeding:

```sql
select count(*) as completed_camps from public.camps where status='completed';
select sum(total_patients) as patients,
       sum(total_spend_paisa)/100.0 as spending_pkr,
       sum(zakat_spend_paisa)/100.0 as zakat_pkr,
       sum(general_spend_paisa)/100.0 as general_pkr
from public.historical_camp_statistics;
select camp_id,medicine_units_reported,verification_status
from public.historical_camp_statistics order by camp_id;
select camp_id,provenance,count(*)
from public.historical_disease_summaries group by camp_id,provenance order by camp_id;
select camp_id,total_patients,
       total_patients-coalesce(male_recorded,0)-coalesce(female_recorded,0) as gender_gap,
       total_patients-coalesce(children_recorded,0)-coalesce(adults_recorded,0)-coalesce(elderly_recorded,0) as age_gap
from public.historical_camp_statistics order by camp_id;
```

**Do not run seeds against a production instance without a verified backup and migration review.**
