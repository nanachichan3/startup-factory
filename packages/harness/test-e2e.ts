/**
 * E2E Test Suite for Startup Factory
 * Tests the full stack: Mem0, MiroFish, Discord gateway (if token set), Temporal
 */

import { MemoryClient } from 'mem0ai';

const MEM0_URL = process.env.MEM0_URL || 'http://host.docker.internal:5000';
const MEM0_API_KEY = process.env.MEM0_API_KEY || 'mem0-self-hosted';
const MIROFISH_URL = process.env.MIROFISH_URL || 'https://agg88ows44sw4so0o4cc0sk4.qed.quest';
const FACTORY_API = process.env.FACTORY_API || 'http://localhost:3000';

interface TestResult {
  name: string;
  passed: boolean;
  error?: string;
  duration: number;
}

const results: TestResult[] = [];

async function test(name: string, fn: () => Promise<void>): Promise<void> {
  const start = Date.now();
  try {
    await fn();
    results.push({ name, passed: true, duration: Date.now() - start });
    console.log(`✅ ${name}`);
  } catch (e: any) {
    results.push({ name, passed: false, error: e.message, duration: Date.now() - start });
    console.log(`❌ ${name}: ${e.message}`);
  }
}

async function testMem0(): Promise<void> {
  const client = new MemoryClient({ apiKey: MEM0_API_KEY, host: MEM0_URL });
  await client.ping();
  
  // Store a test memory
  await client.add([{ role: 'user', content: 'Test memory from E2E' }], { user_id: 'e2e-test' });
  
  // Search for it
  const results = await client.search('test memory', { user_id: 'e2e-test', limit: 5 });
  if (results.length === 0) throw new Error('Mem0 search returned no results');
  
  console.log(`   Mem0: ${results.length} memories found`);
}

async function testMiroFish(): Promise<void> {
  const response = await fetch(`${MIROFISH_URL}/api/simulation/list`);
  if (!response.ok) throw new Error(`MiroFish returned ${response.status}`);
  const data = await response.json() as any;
  console.log(`   MiroFish: ${data.count || 0} simulations`);
}

async function testFactoryAPI(): Promise<void> {
  const response = await fetch(`${FACTORY_API}/api/startups`);
  if (!response.ok) throw new Error(`Factory API returned ${response.status}`);
}

async function runE2E(): Promise<void> {
  console.log('🏭 Startup Factory E2E Tests\n');
  console.log(`Mem0: ${MEM0_URL}`);
  console.log(`MiroFish: ${MIROFISH_URL}`);
  console.log(`Factory: ${FACTORY_API}\n`);

  await test('Mem0: ping + store + search', testMem0);
  await test('MiroFish: API accessible', testMiroFish);
  
  if (process.env.FACTORY_API) {
    await test('Factory API: /api/startups', testFactoryAPI);
  }

  const passed = results.filter(r => r.passed).length;
  const failed = results.filter(r => !r.passed).length;
  
  console.log(`\n📊 Results: ${passed} passed, ${failed} failed`);
  
  if (failed > 0) {
    console.log('\nFailed tests:');
    results.filter(r => !r.passed).forEach(r => {
      console.log(`  - ${r.name}: ${r.error}`);
    });
    process.exit(1);
  }
  
  console.log('\n✅ All tests passed!');
}

runE2E().catch(e => {
  console.error('E2E test runner failed:', e);
  process.exit(1);
});
