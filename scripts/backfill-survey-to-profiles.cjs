/**
 * backfill-survey-to-profiles.js
 *
 * One-time script: reads every row in survey_responses and syncs the data
 * into the corresponding student_profile, using the same logic as
 * syncSurveyToStudentProfile in src/lib/db/users.ts.
 *
 * Safe to re-run: it never overwrites a field that already has a value,
 * except for countries_to_apply and application_cycle which are always
 * set from the survey (they are the core outputs of the questionnaire).
 *
 * Run from the Unisphere project root:
 *   node scripts/backfill-survey-to-profiles.js
 *
 * Requires: @supabase/supabase-js  (already a project dependency)
 *           .env.local              (read via dotenv)
 */

require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local');
  process.exit(1);
}

// Service-role client bypasses RLS so we can read/write all rows.
const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

// ── helpers ────────────────────────────────────────────────────────────────

function toJsonString(value) {
  if (!value) return null;
  if (Array.isArray(value)) return JSON.stringify(value);
  if (typeof value === 'string') {
    // Already a JSON string — normalise and return as-is
    try { JSON.parse(value); return value; } catch {}
    // Plain comma-separated string — leave as-is
    return value;
  }
  return String(value);
}

// ── main ───────────────────────────────────────────────────────────────────

async function run() {
  console.log('🔄  Starting survey → student_profile backfill…\n');

  // 1. Fetch all survey responses
  const { data: responses, error: fetchErr } = await supabase
    .from('survey_responses')
    .select('*');

  if (fetchErr) {
    console.error('❌  Failed to fetch survey_responses:', fetchErr.message);
    process.exit(1);
  }

  if (!responses || responses.length === 0) {
    console.log('ℹ️   No rows found in survey_responses — nothing to backfill.');
    return;
  }

  console.log(`📋  Found ${responses.length} survey response(s) to process.\n`);

  let updated = 0;
  let skipped = 0;
  let errors  = 0;

  for (const row of responses) {
    const userId = row.user_id;
    if (!userId) { skipped++; continue; }

    // 2. Fetch the current student_profile so we don't stomp existing data
    const { data: profile, error: profileErr } = await supabase
      .from('student_profile')
      .select('school_name, intended_major, country, countries_to_apply, application_cycle, universities_to_apply, planned_admissions_support')
      .eq('id', userId)
      .single();

    if (profileErr) {
      // Profile might not exist yet — skip gracefully
      console.warn(`  ⚠️  No student_profile for user ${userId} — skipping.`);
      skipped++;
      continue;
    }

    const update = {};

    // Always sync these — they are the core questionnaire outputs
    if (row.region)            update.countries_to_apply     = row.region;
    if (row.application_cycle) update.application_cycle      = row.application_cycle;

    // Universities: always sync from survey (it's the definitive source)
    const unis = row.universities;
    if (unis && (Array.isArray(unis) ? unis.length > 0 : true)) {
      update.universities_to_apply = toJsonString(unis);
    }

    // Services → planned_admissions_support: always sync
    const services = row.services;
    if (services && (Array.isArray(services) ? services.length > 0 : true)) {
      update.planned_admissions_support = toJsonString(services);
    }

    // Only fill blanks for school / major / country
    if (row.school  && !profile.school_name)    update.school_name    = row.school;
    if (row.course  && !profile.intended_major)  update.intended_major = row.course;
    if (row.country && !profile.country)         update.country        = row.country;

    if (Object.keys(update).length === 0) {
      console.log(`  ✓  User ${userId} — nothing new to write.`);
      skipped++;
      continue;
    }

    const { error: updateErr } = await supabase
      .from('student_profile')
      .update(update)
      .eq('id', userId);

    if (updateErr) {
      console.error(`  ❌  User ${userId} — update failed: ${updateErr.message}`);
      errors++;
    } else {
      const fields = Object.keys(update).join(', ');
      console.log(`  ✅  User ${userId} — updated: ${fields}`);
      updated++;
    }
  }

  // ── summary ──────────────────────────────────────────────────────────────
  console.log('\n─────────────────────────────────────');
  console.log(`Backfill complete.`);
  console.log(`  ✅  Updated : ${updated}`);
  console.log(`  ⏭️  Skipped : ${skipped}`);
  console.log(`  ❌  Errors  : ${errors}`);
  console.log('─────────────────────────────────────\n');

  if (errors > 0) process.exit(1);
}

run().catch(err => {
  console.error('Unexpected error:', err);
  process.exit(1);
});
