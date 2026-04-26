// src/data/blogPosts.js — Blog post registry
// Prepend new posts at the top of the array. Never modify existing entries.

export const blogPosts = [
  {
    slug: 'quantum-vulnerability-closed-24-hours',
    title: "We Found Our Own Quantum Vulnerability \u2014 Here\u2019s How We Closed It in 24 Hours",
    date: '2026-04-26',
    author: 'Todd Morgan, Founder & CEO, CoreIdentity Development Group',
    excerpt: 'On April 26, 2026, we completed the retirement of ECDSA P-256 across our entire cryptographic surface \u2014 replacing it with ML-DSA-65 (FIPS\u00a0204), ML-KEM-768 (FIPS\u00a0203), and SLH-DSA-128s (FIPS\u00a0205). Here\u2019s exactly what we found, why it mattered, and how we closed it.',
    content: `
<h2>What We Found</h2>
<p>
  ECDSA P-256 remained in the active signing path for governance audit records.
  That algorithm is vulnerable to Shor&rsquo;s algorithm on a sufficiently powerful quantum computer.
  In the near term, that risk is theoretical. But CoreIdentity&rsquo;s core value proposition is
  <strong>cryptographic accountability for AI agent actions</strong> &mdash; audit records that
  enterprises, regulators, and sovereign governments can trust absolutely.
  A classically vulnerable signing algorithm in that chain is a category-level integrity gap.
  Not acceptable for sovereign or enterprise clients. Not acceptable for us.
</p>

<h2>Why It Mattered</h2>
<p>
  We didn&rsquo;t discover this from a customer audit or a CVE advisory. We found it ourselves,
  during an internal review of our cryptographic surface. That distinction matters. It tells you
  something about how we operate: we hold ourselves to the standard our clients need before they
  know to ask for it.
</p>
<p>
  The risk isn&rsquo;t just future-facing. Harvest-now-decrypt-later attacks are already documented
  doctrine for sophisticated nation-state adversaries. Any signed governance record created today
  under ECDSA P-256 could, in principle, be decrypted and forged in a post-quantum future.
  For a platform that exists to create permanent, tamper-evident audit trails of AI agent behavior,
  that is not a hypothetical risk &mdash; it is a structural liability.
</p>

<h2>What We Did</h2>
<p>We completed a full post-quantum cryptographic surface migration on April 26, 2026.</p>
<ul>
  <li><strong>Agent identity certificates:</strong> ML-DSA-65 (FIPS 204) &mdash; Live</li>
  <li><strong>Governance audit signatures:</strong> ML-DSA-65 (FIPS 204) &mdash; Live, rotated April 26</li>
  <li><strong>CA trust chain signing:</strong> ML-DSA-65 (FIPS 204) &mdash; Live</li>
  <li><strong>Key encapsulation:</strong> ML-KEM-768 (FIPS 203) &mdash; Live</li>
  <li><strong>Hash-based signatures:</strong> SLH-DSA-128s (FIPS 205) &mdash; Live</li>
  <li><strong>Entropy source:</strong> ANU Quantum Random Number Generator + OS CSPRNG (XOR-mixed)</li>
</ul>
<p>
  Rotation completed at <code>2026-04-26T13:01:11.481Z</code>.<br/>
  New signing key fingerprint (SHA3-256):<br/>
  <code>2260493039681046ef9b5069928039e8765c275157c6be693fdf2126dcde5b3d</code>
</p>
<p>
  ECDSA P-256 is retired. No classical asymmetric primitives remain in the active signing path.
</p>

<h2>What This Means</h2>
<p>
  CoreIdentity is now the only agentic AI governance platform implementing all three NIST FIPS
  post-quantum standards simultaneously in production:
</p>
<ul>
  <li>FIPS 203 (ML-KEM-768) &mdash; key encapsulation</li>
  <li>FIPS 204 (ML-DSA-65) &mdash; digital signatures</li>
  <li>FIPS 205 (SLH-DSA-128s) &mdash; hash-based signatures</li>
</ul>
<p>
  This isn&rsquo;t a roadmap item. It&rsquo;s live in production today. Every governance audit record
  signed from this point forward is quantum-resistant.
</p>

<h2>Why This Matters for Sovereign Clients</h2>
<p>
  No sovereign government will deploy national AI infrastructure &mdash; for healthcare,
  defense logistics, immigration, or judicial systems &mdash; without post-quantum cryptography.
  This isn&rsquo;t speculation; it&rsquo;s already procurement doctrine in several jurisdictions.
</p>
<p>
  We didn&rsquo;t wait for a government RFP to specify it. We didn&rsquo;t wait for a customer to ask.
  We found the gap ourselves and closed it in 24 hours.
</p>
<p>
  That&rsquo;s the standard we operate at. It&rsquo;s the standard your AI governance infrastructure
  should hold you to.
</p>
    `,
  },
];
