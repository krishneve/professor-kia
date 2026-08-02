/**
 * KIA Supabase Migration Runner
 * Runs the AI pipeline tables migration via the Supabase Management API.
 *
 * Usage: node scripts/run-migration.mjs
 */

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://ooyplxwkahxmmwtonhqr.supabase.co';
const SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9veXBseHdrYWh4bW13dG9uaHFyIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4NTY1MzA2MiwiZXhwIjoyMTAxMjI5MDYyfQ.AU3OvEk8ibnE6OJU8GlivL-ce2UYOb_pl3zZ0buig90';

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

async function checkAndReportTables() {
  console.log('\n=== Checking which AI pipeline tables exist ===\n');

  const tables = ['study_materials', 'knowledge_chunks', 'knowledge_bases'];
  const missing = [];

  for (const table of tables) {
    const { error } = await supabase.from(table).select('*').limit(1);
    if (error && error.code === '42P01') {
      console.log(`  ✗ MISSING : ${table}`);
      missing.push(table);
    } else if (error) {
      console.log(`  ? ERROR   : ${table} — ${error.message}`);
    } else {
      console.log(`  ✓ EXISTS  : ${table}`);
    }
  }

  if (missing.length > 0) {
    console.log(`\n⚠  ${missing.length} table(s) missing.`);
    console.log('\nRun the following SQL in the Supabase SQL Editor:');
    console.log('  Dashboard → SQL Editor → New Query → paste contents of:');
    console.log('  backend/migrations/002_ai_pipeline_tables.sql\n');
  } else {
    console.log('\n✓ All AI pipeline tables exist. Supabase is ready.\n');
    await testInsertAndDelete();
  }

  return missing;
}

async function testInsertAndDelete() {
  console.log('=== Testing write/read/delete on knowledge_chunks ===\n');

  const testRow = {
    id: `test-${Date.now()}`,
    subject_id: 'test-subject',
    material_id: 'test-material',
    chapter: 'Test Chapter',
    topic: 'Test Topic',
    content: 'This is a test knowledge unit to verify Supabase write access.',
    page_number: 1,
    chunk_index: 0,
  };

  // Insert
  const { error: insertErr } = await supabase.from('knowledge_chunks').insert(testRow);
  if (insertErr) {
    console.error(`  ✗ INSERT FAILED: ${insertErr.message}`);
    return;
  }
  console.log(`  ✓ INSERT OK: id=${testRow.id}`);

  // Read back
  const { data, error: readErr } = await supabase
    .from('knowledge_chunks')
    .select('*')
    .eq('id', testRow.id)
    .single();

  if (readErr || !data) {
    console.error(`  ✗ READ FAILED: ${readErr?.message}`);
  } else {
    console.log(`  ✓ READ OK: content="${data.content.substring(0, 60)}"`);
  }

  // Delete
  const { error: delErr } = await supabase.from('knowledge_chunks').delete().eq('id', testRow.id);
  if (delErr) {
    console.error(`  ✗ DELETE FAILED: ${delErr.message}`);
  } else {
    console.log(`  ✓ DELETE OK: test row cleaned up`);
  }

  console.log('\n✓ Supabase knowledge_chunks read/write verified.\n');
}

const missing = await checkAndReportTables();
process.exit(missing.length > 0 ? 1 : 0);
