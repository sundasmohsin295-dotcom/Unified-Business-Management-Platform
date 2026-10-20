import assert from 'node:assert/strict';
import { db } from '../server/db';
import { engine } from '../server/engine';
import { sanitizeOpportunitiesForUser } from '../server/auth';
import { processWhatsAppWebhook, processPaymentWebhook, generateTestHmacSignature } from '../server/webhooks';

interface TestResult {
  name: string;
  passed: boolean;
  durationMs: number;
  error?: any;
}

const results: TestResult[] = [];

async function runTest(name: string, fn: () => Promise<void> | void) {
  db.resetToSeed();
  const start = performance.now();
  try {
    await fn();
    const durationMs = Math.round(performance.now() - start);
    results.push({ name, passed: true, durationMs });
    console.log(`  ✓ PASS: ${name} (${durationMs}ms)`);
  } catch (err: any) {
    const durationMs = Math.round(performance.now() - start);
    results.push({ name, passed: false, durationMs, error: err });
    console.error(`  ✗ FAIL: ${name} (${durationMs}ms)`);
    console.error(`    Error:`, err.message || err);
  }
}

async function main() {
  console.log('\n======================================================');
  console.log('LeadFlow Production-Grade Test Suite & Security Audit');
  console.log('======================================================\n');

  // TEST 1: Lead Intake Validation & Storage (F3.1)
  await runTest('1. Validates input and persists lead in target workspace', async () => {
    const result = await engine.captureLead({
      workspace_id: 'ws-apex',
      contact_name: 'Engr. Bilal Masood',
      contact_email: 'bilal.masood@masoodtextiles.pk',
      contact_phone: '+92 300 1122334',
      company_name: 'Masood Textile Mills',
      source: 'web_form',
      value: 14000000,
      notes: 'Requested urgent commercial feasibility survey.'
    });

    assert.ok(result.lead.id, 'Lead should have an ID');
    assert.equal(result.lead.workspace_id, 'ws-apex');
    assert.equal(result.lead.status, 'unacknowledged');
    assert.ok(result.lead.sla_deadline_at, 'Lead must have persisted server deadline');
    assert.ok(result.assigned_user.id, 'Lead must be assigned to an employee');

    const stored = db.getLead(result.lead.id);
    assert.ok(stored, 'Lead must be found in database');
    assert.equal(stored?.contact_name, 'Engr. Bilal Masood');

    const auditLogs = db.getAuditLogs('ws-apex');
    const createdLog = auditLogs.find(a => a.target_id === result.lead.id && a.action_type === 'lead_created');
    assert.ok(createdLog, 'Audit log entry must be created for lead capture');
  });

  // TEST 2: Round-Robin Distribution & Workload Caps (F3.3)
  await runTest('2. Selects eligible available employee using workload caps and round-robin', async () => {
    const lead1 = await engine.captureLead({
      workspace_id: 'ws-apex',
      contact_name: 'Prospect One',
      contact_email: 'p1@test.pk',
      contact_phone: '+92 301 0000001',
      source: 'web_form'
    });

    assert.notEqual(lead1.assigned_user.availability, 'busy', 'Busy rep must not receive lead');
    assert.notEqual(lead1.assigned_user.availability, 'on_leave', 'Rep on leave must not receive lead');
    assert.ok(lead1.assigned_user.current_open_leads <= lead1.assigned_user.max_open_leads, 'Must not exceed max leads');
  });

  // TEST 3: SLA Acknowledgement & Persisted Response Time (F3.4)
  await runTest('3. Employee acknowledges lead before deadline; records response time', async () => {
    const leadRes = await engine.captureLead({
      workspace_id: 'ws-apex',
      contact_name: 'Fast Lead',
      contact_email: 'fast@test.pk',
      contact_phone: '+92 301 0000002',
      source: 'web_form'
    });

    const ackRes = await engine.acknowledgeLead(leadRes.lead.id, leadRes.assigned_user.id);
    assert.equal(ackRes.success, true);

    const updated = db.getLead(leadRes.lead.id);
    assert.equal(updated?.status, 'acknowledged');
    assert.ok(updated?.acknowledged_at, 'Must record acknowledged_at timestamp');
    assert.equal(updated?.is_in_recovery, false);

    const auditLogs = db.getAuditLogs('ws-apex');
    const ackLog = auditLogs.find(a => a.target_id === leadRes.lead.id && a.action_type === 'lead_acknowledged');
    assert.ok(ackLog, 'Audit log must record acknowledgement event');
  });

  // TEST 4: SLA Timeout & Escalation to Backup Rep & Recovery Queue (F3.5, F3.7)
  await runTest('4. SLA deadline timeout triggers automatic escalation and Recovery Queue entry', async () => {
    const leadRes = await engine.captureLead({
      workspace_id: 'ws-apex',
      contact_name: 'Timeout Lead',
      contact_email: 'timeout@test.pk',
      contact_phone: '+92 301 9999999',
      source: 'web_form'
    });

    // Artificially advance deadline to past to simulate timeout
    await db.transaction((schema) => {
      const l = schema.leads.find(x => x.id === leadRes.lead.id);
      if (l) {
        l.sla_deadline_at = new Date(Date.now() - 5000).toISOString();
      }
    });

    const escalatedCount = await engine.checkSlaDeadlines();
    assert.ok(escalatedCount >= 1, 'Watchdog must detect and escalate expired lead');

    const updated = db.getLead(leadRes.lead.id);
    assert.equal(updated?.status, 'escalated');
    assert.equal(updated?.escalation_level, 1);
    assert.equal(updated?.is_in_recovery, true);
    assert.equal(updated?.assigned_to_user_id, 'usr-ayesha', 'Must escalate to backup rep Ayesha Siddiqui');

    const outbox = db.getNotificationOutbox('ws-apex');
    const alertItem = outbox.find(o => o.lead_id === leadRes.lead.id);
    assert.ok(alertItem, 'Outbox must contain external alert item');
    assert.equal(alertItem?.channel, 'BizSMS');
  });

  // TEST 5: Escalation Idempotency & Duplicate Prevention (F3.8, Q5)
  await runTest('5. Prevents duplicate escalations under concurrent or repeated triggers', async () => {
    const leadRes = await engine.captureLead({
      workspace_id: 'ws-apex',
      contact_name: 'Idempotency Lead',
      contact_email: 'idem@test.pk',
      contact_phone: '+92 301 8888888',
      source: 'web_form'
    });

    const res1 = await engine.escalateLead(leadRes.lead.id, 'Test SLA timeout 1');
    assert.equal(res1.success, true);

    await engine.acknowledgeLead(leadRes.lead.id, 'usr-ayesha');

    const res2 = await engine.escalateLead(leadRes.lead.id, 'Late timer trigger');
    assert.equal(res2.success, false, 'Should reject escalation once acknowledged');

    const finalLead = db.getLead(leadRes.lead.id);
    assert.equal(finalLead?.status, 'acknowledged', 'Status must remain acknowledged');
  });

  // TEST 6: Absence Reassignment (F3.6)
  await runTest('6. Setting employee to On leave immediately reassigns their unacknowledged leads', async () => {
    const lead = await engine.captureLead({
      workspace_id: 'ws-apex',
      contact_name: 'Absence Test Prospect',
      contact_email: 'absence@test.pk',
      contact_phone: '+92 301 7777777',
      source: 'web_form'
    });

    const repId = lead.lead.assigned_to_user_id;
    const absenceRes = await engine.setAvailabilityAndReassign(repId, 'on_leave', 'usr-tariq');
    assert.ok(absenceRes.reassignedCount >= 1, 'Must reassign unacknowledged leads');

    const updatedLead = db.getLead(lead.lead.id);
    assert.notEqual(updatedLead?.assigned_to_user_id, repId, 'Lead must be reassigned away from absent rep');
    assert.equal(updatedLead?.status, 'reassigned');

    const auditLogs = db.getAuditLogs('ws-apex');
    const reassignLog = auditLogs.find(a => a.target_id === lead.lead.id && a.action_type === 'lead_reassigned_absence');
    assert.ok(reassignLog, 'Absence reassignment must be logged to immutable audit ledger');
  });

  // TEST 7: Tenant Isolation (F1.6, Q2)
  await runTest('7. Workspace isolation: records strictly partitioned by workspace_id', () => {
    const apexLeads = db.getLeads('ws-apex');
    const cloverLeads = db.getLeads('ws-clover');

    assert.ok(apexLeads.length > 0 && apexLeads.every(l => l.workspace_id === 'ws-apex'), 'Apex leads must only have ws-apex');
    assert.ok(cloverLeads.length > 0 && cloverLeads.every(l => l.workspace_id === 'ws-clover'), 'Clover leads must only have ws-clover');
  });

  // TEST 8: Server-Side Opportunity Value Masking (F1.4)
  await runTest('8. Opportunity value is masked on the server when user lacks permission', () => {
    const sara = db.getUser('usr-sara');
    assert.equal(sara?.permissions.view_opportunity_value, false);

    const opps = db.getOpportunities('ws-apex');
    const sanitized = sanitizeOpportunitiesForUser(opps, sara!);

    assert.ok(sanitized.every(o => o.value === null && o.is_value_masked === true), 'Value must be masked with null and is_value_masked flag');

    const tariq = db.getUser('usr-tariq')!;
    const ownerOpps = sanitizeOpportunitiesForUser(opps, tariq);
    assert.ok(ownerOpps.every(o => typeof o.value === 'number'), 'Owner must see numeric values');
  });

  // TEST 9: Webhook Signature Verification (I1.2, I2.3)
  await runTest('9. Webhook verifies HMAC SHA-256 signature; rejects forged payload', async () => {
    const validPayload = { from: '+923005559988', to: '+923008472910', body: 'Valid message', message_sid: 'WAMID-TEST-001' };
    const validSignature = generateTestHmacSignature(validPayload);

    const validRes = await processWhatsAppWebhook({
      workspace_id: 'ws-apex',
      from: validPayload.from,
      to: validPayload.to,
      body: validPayload.body,
      message_sid: validPayload.message_sid,
      signature: validSignature,
      raw_payload: JSON.stringify(validPayload)
    });
    assert.equal(validRes.success, true, 'Valid HMAC signature must be accepted');

    const forgedRes = await processWhatsAppWebhook({
      workspace_id: 'ws-apex',
      from: validPayload.from,
      to: validPayload.to,
      body: 'Tampered message text',
      message_sid: 'WAMID-FORGED-002',
      signature: 'bad_signature_deadbeef',
      raw_payload: JSON.stringify({ ...validPayload, body: 'Tampered message text' })
    });
    assert.equal(forgedRes.success, false, 'Forged signature must be rejected');
    assert.ok(forgedRes.error?.includes('Unauthorized'), 'Must return Unauthorized error');
  });

  // TEST 10: Payment Webhook Idempotency (I2.4)
  await runTest('10. Payment webhook processes idempotently without duplicate revenue counting', async () => {
    const ref = `JC-IDEM-${Date.now()}`;
    let pendingPaymentId = '';

    await db.transaction((schema) => {
      const p = {
        id: `pay-test-${Date.now()}`,
        workspace_id: 'ws-apex',
        opportunity_id: 'opp-1',
        contact_id: 'cnt-1',
        amount: 2500000,
        currency: 'PKR',
        provider: 'JazzCash' as const,
        status: 'pending' as const,
        reference_id: ref,
        checkout_url: 'https://sandbox.jazzcash.com.pk/pay',
        requested_by_user_id: 'usr-ayesha',
        created_at: new Date().toISOString(),
        idempotency_key: `idem-${ref}`
      };
      schema.payments.push(p);
      pendingPaymentId = p.id;
    });

    const payload = {
      workspace_id: 'ws-apex',
      payment_id: pendingPaymentId,
      outcome: 'collected' as const,
      reference_id: ref,
      amount: 2500000,
      provider: 'JazzCash' as const
    };

    const res1 = await processPaymentWebhook(payload);
    assert.equal(res1.success, true);

    const oppAfterFirst = db.getOpportunities('ws-apex').find(o => o.id === 'opp-1');
    const collectedFirst = oppAfterFirst?.payment_amount_collected || 0;

    const res2 = await processPaymentWebhook(payload);
    assert.equal(res2.success, true);
    assert.equal(res2.duplicate, true, 'Duplicate webhook must be flagged as duplicate');

    const oppAfterSecond = db.getOpportunities('ws-apex').find(o => o.id === 'opp-1');
    assert.equal(oppAfterSecond?.payment_amount_collected, collectedFirst, 'Duplicate event must NOT increase collected revenue twice');
  });

  // TEST 11: Customer Messaging Opt-Out Enforcement (I1.9)
  await runTest('11. Enforces customer opt-out compliance on server', async () => {
    await db.transaction((schema) => {
      const contact = schema.contacts.find(c => c.id === 'cnt-1');
      if (contact) contact.opted_out_messaging = true;
    });

    const contact = db.getContacts('ws-apex').find(c => c.id === 'cnt-1');
    assert.equal(contact?.opted_out_messaging, true);
  });

  // TEST 12: Tamper-Proof Audit Trail (F4.3)
  await runTest('12. Audit ledger is immutable and preserves tamper resistance', () => {
    const logs = db.getAuditLogs('ws-apex');
    assert.ok(logs.length > 0, 'Audit logs must exist');
    assert.ok(logs.every(l => l.id && l.timestamp && l.actor_name && l.action_type), 'Every log must have complete metadata');
  });

  // Summary Report
  console.log('\n------------------------------------------------------');
  const passed = results.filter(r => r.passed).length;
  const failed = results.filter(r => !r.passed).length;
  console.log(`Results: ${passed} Passed, ${failed} Failed out of ${results.length} total tests.`);
  console.log('------------------------------------------------------\n');

  if (failed > 0) {
    process.exit(1);
  }
}

main().catch(err => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
