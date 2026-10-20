import crypto from 'crypto';
import { db } from './db';
import { engine } from './engine';
import { PaymentRequest, ChatMessage, IntegrationSyncLog } from './types';

const SIGNING_SECRETS = {
  whatsapp: process.env.WHATSAPP_SIGNING_SECRET || 'whsec_whatsapp_sandbox_leadflow_demo_2026',
  stripe: process.env.STRIPE_WEBHOOK_SECRET || 'whsec_stripe_test_leadflow_demo_2026',
  jazzcash: process.env.JAZZCASH_SECURE_HASH || 'whsec_jazzcash_merchant_demo_2026'
};

// Cryptographic HMAC SHA256 Signature Verification (I1.2, I2.3)
export function verifyHmacSignature(payload: string | object, receivedSignature: string, secret: string): boolean {
  if (!receivedSignature) return false;
  try {
    const stringified = typeof payload === 'string' ? payload : JSON.stringify(payload);
    const expected = crypto.createHmac('sha256', secret).update(stringified).digest('hex');
    
    // Support raw hex or sha256= prefix
    const cleanReceived = receivedSignature.startsWith('sha256=') ? receivedSignature.slice(7) : receivedSignature;
    const bufExpected = Buffer.from(expected);
    const bufReceived = Buffer.from(cleanReceived);
    if (bufExpected.length !== bufReceived.length) return false;
    return crypto.timingSafeEqual(bufExpected, bufReceived);
  } catch (err) {
    return false;
  }
}

// Generate valid signature helper (for testing & sandbox simulation)
export function generateTestHmacSignature(payload: string | object, secret = SIGNING_SECRETS.whatsapp): string {
  const stringified = typeof payload === 'string' ? payload : JSON.stringify(payload);
  return crypto.createHmac('sha256', secret).update(stringified).digest('hex');
}

// WhatsApp Inbound Webhook Processor (I1.1, I1.2, I1.5, I1.8)
export async function processWhatsAppWebhook(data: {
  workspace_id: string;
  from: string; // customer phone
  to: string; // company phone
  body: string;
  message_sid: string;
  signature?: string;
  raw_payload?: string;
}): Promise<{ success: boolean; duplicate?: boolean; lead_id?: string; message_id?: string; error?: string }> {
  const { workspace_id, from, to, body, message_sid, signature, raw_payload } = data;

  // 1. Signature Verification (I1.2)
  if (signature) {
    const isValid = verifyHmacSignature(raw_payload || { from, to, body, message_sid }, signature, SIGNING_SECRETS.whatsapp);
    if (!isValid) {
      // Record failed verification log
      await db.transaction(async (schema) => {
        schema.sync_logs.unshift({
          id: `slog-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
          workspace_id,
          integration_type: 'whatsapp',
          direction: 'inbound_webhook',
          event_type: 'messages.incoming.rejected',
          reference_id: message_sid,
          signature_valid: false,
          status: 'failed',
          payload_preview: JSON.stringify({ from, body, error: 'Invalid HMAC signature' }),
          timestamp: new Date().toISOString(),
          retry_count: 0
        });
      });
      return { success: false, error: 'Unauthorized: Invalid HMAC SHA-256 signature' };
    }
  }

  // 2. Idempotency Guard (I1.8: duplicate webhook does not create duplicate messages or leads)
  const existingResponse = db.getIdempotentResponse(`whatsapp:${message_sid}`);
  if (existingResponse) {
    return { success: true, duplicate: true, ...existingResponse };
  }

  return await db.transaction(async (schema) => {
    // 3. Contact Matching (I1.5)
    let contact = schema.contacts.find(c => c.workspace_id === workspace_id && c.phone === from);
    let createdLeadId: string | undefined;

    if (!contact) {
      // Create new prospect contact and inbound lead (F3.1)
      contact = {
        id: `cnt-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        workspace_id,
        name: `Inbound WhatsApp (${from.slice(-4)})`,
        email: `${from.replace(/\D/g, '')}@leadflow.inbound`,
        phone: from,
        assigned_user_id: '',
        opted_out_messaging: false,
        created_at: new Date().toISOString(),
        tags: ['WhatsApp Inbound', 'New Prospect']
      };
      schema.contacts.unshift(contact);

      // Auto-assign via engine
      const captured = await engine.captureLead({
        workspace_id,
        contact_name: contact.name,
        contact_email: contact.email,
        contact_phone: from,
        source: 'whatsapp',
        value: 1500000,
        notes: `Inbound WhatsApp: "${body}"`
      });
      createdLeadId = captured.lead.id;
    }

    // 4. Store Inbound Message
    const msgId = `msg-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    const newMsg: ChatMessage = {
      id: msgId,
      workspace_id,
      contact_id: contact.id,
      direction: 'inbound',
      sender_number: from,
      recipient_number: to,
      body,
      timestamp: new Date().toISOString(),
      status: 'read',
      provider: 'WhatsApp Business'
    };
    schema.chat_messages.push(newMsg);

    // 5. Store Sync Log
    schema.sync_logs.unshift({
      id: `slog-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      workspace_id,
      integration_type: 'whatsapp',
      direction: 'inbound_webhook',
      event_type: 'messages.incoming',
      reference_id: message_sid,
      signature_valid: true,
      status: 'success',
      payload_preview: JSON.stringify({ from, body, message_sid }),
      timestamp: new Date().toISOString(),
      retry_count: 0
    });

    const response = { success: true, lead_id: createdLeadId, message_id: msgId };
    db.setIdempotentResponse(`whatsapp:${message_sid}`, response);
    return response;
  });
}

// Payment Webhook Processor with Idempotency & HMAC Verification (I2.2, I2.3, I2.4, I2.6)
export async function processPaymentWebhook(data: {
  workspace_id: string;
  payment_id: string;
  outcome: 'collected' | 'failed' | 'refunded';
  reference_id: string;
  amount: number;
  provider: 'JazzCash' | 'Stripe';
  signature?: string;
  raw_payload?: string;
}): Promise<{ success: boolean; duplicate?: boolean; payment?: PaymentRequest; error?: string }> {
  const { workspace_id, payment_id, outcome, reference_id, amount, provider, signature, raw_payload } = data;
  const secret = provider === 'JazzCash' ? SIGNING_SECRETS.jazzcash : SIGNING_SECRETS.stripe;

  // 1. Signature Verification (I2.3)
  if (signature) {
    const isValid = verifyHmacSignature(raw_payload || { payment_id, outcome, reference_id, amount }, signature, secret);
    if (!isValid) {
      await db.transaction(async (schema) => {
        schema.sync_logs.unshift({
          id: `slog-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
          workspace_id,
          integration_type: 'payments',
          direction: 'inbound_webhook',
          event_type: `payment.${outcome}.rejected`,
          reference_id,
          signature_valid: false,
          status: 'failed',
          payload_preview: JSON.stringify({ ref: reference_id, error: 'Invalid HMAC signature' }),
          timestamp: new Date().toISOString(),
          retry_count: 0
        });
      });
      return { success: false, error: 'Unauthorized: Invalid payment webhook signature' };
    }
  }

  // 2. Idempotency Check (I2.4: same event received more than once records payment once)
  const idempotencyKey = `payment:${reference_id}:${outcome}`;
  const existing = db.getIdempotentResponse(idempotencyKey);
  if (existing) {
    return { success: true, duplicate: true, payment: existing.payment };
  }

  return await db.transaction(async (schema) => {
    const payment = schema.payments.find(p => p.id === payment_id || p.reference_id === reference_id);
    if (!payment) {
      return { success: false, error: `Payment not found for ref ${reference_id}` };
    }

    // Guard duplicate status
    if (payment.status === outcome) {
      return { success: true, duplicate: true, payment };
    }

    const timestamp = new Date().toISOString();
    const prevStatus = payment.status;
    payment.status = outcome;
    if (outcome === 'collected') payment.paid_at = timestamp;
    if (outcome === 'refunded') payment.refunded_at = timestamp;

    // Update linked opportunity payment status & collected revenue (I2.6)
    const opp = schema.opportunities.find(o => o.id === payment.opportunity_id);
    if (opp) {
      let collected = opp.payment_amount_collected || 0;
      if (outcome === 'collected') {
        collected += payment.amount;
        opp.payment_status = 'collected';
      } else if (outcome === 'refunded') {
        collected = Math.max(0, collected - payment.amount);
        opp.payment_status = 'refunded';
      }
      opp.payment_amount_collected = collected;
    }

    // Sync Log
    schema.sync_logs.unshift({
      id: `slog-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      workspace_id,
      integration_type: 'payments',
      direction: 'inbound_webhook',
      event_type: `payment.${outcome}`,
      reference_id,
      signature_valid: true,
      status: 'success',
      payload_preview: JSON.stringify({ provider, ref: reference_id, amount, outcome }),
      timestamp,
      retry_count: 0
    });

    // Audit Log (F4.1)
    schema.audit_logs.unshift({
      id: `aud-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      workspace_id,
      timestamp,
      actor_user_id: 'system',
      actor_name: `${provider} Payment Webhook Engine`,
      action_type: outcome === 'collected' ? 'payment_received' : 'payment_refunded',
      target_type: 'payment',
      target_id: payment.id,
      target_label: `${provider} Ref: ${reference_id}`,
      details: `Payment transitioned from "${prevStatus}" to "${outcome}". Collected amount: ${amount}`,
      before_value: { status: prevStatus },
      after_value: { status: outcome, amount, ref: reference_id }
    });

    const result = { success: true, payment };
    db.setIdempotentResponse(idempotencyKey, result);
    return result;
  });
}
