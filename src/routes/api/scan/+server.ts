import type { RequestHandler } from '@sveltejs/kit';

// Web Crypto SHA-256
async function hashSHA256(data: string) {
  const encoder = new TextEncoder();
  const buffer = encoder.encode(data);
  const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
  return Array.from(new Uint8Array(hashBuffer))
    .map((x) => x.toString(16).padStart(2, '0'))
    .join('');
}

// Temporary in-memory visitor storage
const visitors: Record<string, any> = {};

// Compute similarity percentage
function computeSimilarity(a: Record<string, string>, b: Record<string, string>) {
  const keys = Object.keys(a);
  let matches = 0;
  for (const key of keys) {
    if (a[key] === b[key]) matches++;
  }
  return matches / keys.length; // 0–1
}

export const POST: RequestHandler = async ({ request }) => {
  const clientData = await request.json();

  // Hash all client values
  const clientHashes: Record<string, string> = {};
  for (const [key, value] of Object.entries(clientData)) {
    clientHashes[key] = await hashSHA256(
      typeof value === 'object' ? JSON.stringify(value) : String(value)
    );
  }

  // Hash server headers
  const headers = [
    request.headers.get('user-agent'),
    request.headers.get('accept'),
    request.headers.get('accept-encoding'),
    request.headers.get('accept-language'),
    request.headers.get('connection'),
    request.headers.get('sec-ch-ua'),
    request.headers.get('sec-ch-ua-platform'),
    request.headers.get('sec-ch-ua-mobile'),
    request.headers.get('referer')
  ].join('|');
  const serverhash = await hashSHA256(headers);

  // Hash IP
  const ip =
    request.headers.get('x-real-ip') ??
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ??
    '0.0.0.0';
  const iphash = await hashSHA256(ip);

  // Build the final fingerprint
  const combinedHashes = Object.values(clientHashes).concat([serverhash, iphash]).join('|');
  const finalFingerprint = await hashSHA256(combinedHashes);

  // Fuzzy visitor matching
  let visitor: any = null;
  let bestAccuracy = 0;

  for (const v of Object.values(visitors)) {
    const similarity = computeSimilarity(clientHashes, v.clientHashes);
    if (similarity > bestAccuracy) bestAccuracy = similarity;

    if (similarity >= 0.8) {
      visitor = v;
      visitor.seenBefore = true;
      visitor.lastSeen = new Date().toISOString();
      visitor.accuracy = Math.round(similarity * 100);
      break;
    }
  }

  if (!visitor) {
    visitor = {
      id: finalFingerprint,
      seenBefore: false,
      lastSeen: new Date().toISOString(),
      clientHashes,
      accuracy: Math.round(bestAccuracy * 100)
    };
  } else {
    visitor.clientHashes = clientHashes;
  }

  visitors[finalFingerprint] = visitor;

  return new Response(
    JSON.stringify(
      {
        clientHashes,
        serverhash,
        iphash,
        finalFingerprint,
        visitor
      },
      null,
      2
    ),
    { status: 200, headers: { 'Content-Type': 'application/json' } }
  );
};
