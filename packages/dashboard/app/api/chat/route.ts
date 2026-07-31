import { NextRequest } from 'next/server';

export async function POST(req: NextRequest) {
  const { messages } = (await req.json()) as { messages: Array<{ role: string; content: string }> };

  const lastMessage = messages[messages.length - 1]?.content ?? '';

  // Simulated agent response based on the user's question
  let response = 'I analyzed the findings but need more specific context. Which finding or provider would you like me to investigate?';

  const q = lastMessage.toLowerCase();

  if (q.includes('prov_b') || q.includes('upcoding')) {
    response = 'Provider PROV_B (Riverside Medical Center) shows systematic upcoding across 3 DRG families. ' +
      'The provider codes 2.8x more MCC-qualifying diagnoses than peers in the Northeast region. ' +
      'Key DRGs affected: 193 (Pneumonia with MCC), 280 (AMI with MCC), 291 (Heart Failure with MCC). ' +
      'I recommend auditing DRG 193 claims first — it has the highest z-score deviation (z = 16.04).';
  } else if (q.includes('prov_d') || q.includes('readmission')) {
    response = 'Provider PROV_D (Oakwood Regional) has an 8.3% 30-day readmission rate, over 6x the peer mean of 1.3%. ' +
      'The quality hypothesis scored 85% confidence — shorter average stays (2.3 days vs 4.1 days peer mean) suggest premature discharge may be driving readmissions. ' +
      'I also detected a possible follow-up gap: only 2 peer providers in the South region for meaningful comparison.';
  } else if (q.includes('south') || q.includes('geo') || q.includes('er') || q.includes('spike')) {
    response = 'The South region saw a 200% week-over-week ER visit volume spike in week 40 of 2009, ' +
      'driven primarily by PROV_E (Pineview Health, FL) and PROV_D (Oakwood Regional, TX). ' +
      'The miscoding hypothesis scored only 35% confidence — the spike pattern is more consistent with a readmission cascade ' +
      'than intentional miscoding. I recommend cross-referencing with local public health data for any concurrent outbreak.';
  } else if (q.includes('severity') || q.includes('critical')) {
    response = 'Currently, 2 findings are classified as CRITICAL: PROV_B (upcoding) and PROV_D (readmission). ' +
      'One finding is MEDIUM: South region geographic spike. ' +
      'Critical findings should be prioritized for immediate audit review.';
  } else if (q.includes('recommend') || q.includes('next') || q.includes('action')) {
    response = 'Recommended actions:\n' +
      '1. [CRITICAL] Audit PROV_B medical records for DRG 193, 280, 291 — validate MCC diagnoses against clinical documentation.\n' +
      '2. [CRITICAL] Review PROV_D discharge protocols and post-discharge follow-up scheduling — LOS is 44% below peer mean.\n' +
      '3. [MEDIUM] Monitor South region ER volumes for 4 additional weeks to confirm spike trend and rule out seasonal variation.';
  }

  return new Response(
    JSON.stringify({
      role: 'assistant',
      content: response,
    }),
    { headers: { 'Content-Type': 'application/json' } },
  );
}
