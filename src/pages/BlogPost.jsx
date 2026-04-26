// src/pages/BlogPost.jsx — Single blog post renderer
import { C, F, useWindowWidth } from '../chc-design.js';
import { blogPosts } from '../data/blogPosts.js';
import Nav from '../components/Nav.jsx';

export default function BlogPost({ slug }) {
  const w = useWindowWidth();
  const m = w < 768;
  const post = blogPosts.find(p => p.slug === slug);

  if (!post) {
    return (
      <div style={{ background: C.bg, color: C.white, fontFamily: F.body, minHeight: '100vh' }}>
        <Nav route="/#/blog" />
        <div style={{ maxWidth: 640, margin: '0 auto', padding: m ? '80px 20px' : '120px 40px',
          textAlign: 'center' }}>
          <div style={{ fontFamily: F.display, fontSize: 72, color: C.red, marginBottom: 16 }}>404</div>
          <div style={{ color: C.white, fontSize: 20, fontWeight: 600, marginBottom: 8 }}>Post not found</div>
          <div style={{ color: C.slate, fontSize: 14, marginBottom: 32 }}>
            That post doesn&rsquo;t exist or may have moved.
          </div>
          <a href="#/blog" style={{ color: C.gold, textDecoration: 'none', fontSize: 14,
            border: '1px solid ' + C.gold + '44', padding: '10px 20px', borderRadius: 6 }}>
            &larr; Back to Blog
          </a>
        </div>
      </div>
    );
  }

  const formattedDate = new Date(post.date + 'T12:00:00Z').toLocaleDateString('en-US',
    { year: 'numeric', month: 'long', day: 'numeric', timeZone: 'UTC' });

  return (
    <div style={{ background: C.bg, color: C.white, fontFamily: F.body, minHeight: '100vh' }}>
      <Nav route="/#/blog" />

      <article style={{ maxWidth: 720, margin: '0 auto', padding: m ? '48px 20px 80px' : '72px 40px 120px' }}>

        {/* Breadcrumb */}
        <div style={{ marginBottom: 36 }}>
          <a href="#/blog" style={{ color: C.slate, textDecoration: 'none', fontSize: 13,
            display: 'inline-flex', alignItems: 'center', gap: 6 }}>
            <span style={{ fontSize: 16 }}>&larr;</span> Back to Blog
          </a>
        </div>

        {/* Header */}
        <header style={{ marginBottom: 48, borderBottom: '1px solid ' + C.border,
          paddingBottom: 36 }}>
          <time style={{ color: C.gold, fontSize: 11, letterSpacing: '0.15em',
            textTransform: 'uppercase', fontFamily: F.mono,
            display: 'block', marginBottom: 20 }}>
            {formattedDate}
          </time>
          <h1 style={{ fontFamily: F.body, fontSize: m ? 24 : 34, fontWeight: 700,
            lineHeight: 1.25, color: C.white, margin: '0 0 20px' }}>
            {post.title}
          </h1>
          <p style={{ color: C.slate, fontSize: 15, lineHeight: 1.7, margin: '0 0 24px' }}>
            {post.excerpt}
          </p>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ width: 36, height: 36, borderRadius: '50%',
              background: C.gold + '22', border: '1px solid ' + C.gold + '44',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: C.gold, fontWeight: 700, fontSize: 15 }}>
              {post.author.charAt(0)}
            </div>
            <span style={{ color: C.slate, fontSize: 13 }}>{post.author}</span>
          </div>
        </header>

        {/* Body */}
        <div
          dangerouslySetInnerHTML={{ __html: post.content }}
          style={{
            color: C.slate,
            fontSize: 16,
            lineHeight: 1.85,
          }}
        />

        {/* Inline style overrides for blog body elements */}
        <style>{`
          article h2 {
            color: #f1f5f9;
            font-size: ${m ? '18px' : '22px'};
            font-weight: 600;
            margin: 48px 0 16px;
            letter-spacing: 0.01em;
          }
          article h2:first-of-type { margin-top: 0; }
          article p { margin: 0 0 20px; }
          article ul {
            margin: 0 0 20px;
            padding-left: 24px;
          }
          article li { margin-bottom: 8px; }
          article strong { color: #f1f5f9; }
          article code {
            font-family: 'JetBrains Mono','Fira Code',monospace;
            font-size: 13px;
            background: #111827;
            color: #d4a843;
            padding: 2px 7px;
            border-radius: 4px;
            border: 1px solid #1f2937;
            word-break: break-all;
          }
        `}</style>

        {/* CTA footer */}
        <div style={{ marginTop: 72, padding: m ? 24 : 36,
          background: C.surface, border: '1px solid ' + C.border,
          borderRadius: 12, position: 'relative', overflow: 'hidden' }}>
          <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 2,
            background: `linear-gradient(90deg,${C.gold},${C.teal})` }} />
          <div style={{ color: C.gold, fontSize: 11, letterSpacing: '0.15em',
            textTransform: 'uppercase', marginBottom: 12 }}>
            Deploy with Confidence
          </div>
          <h3 style={{ color: C.white, fontSize: m ? 18 : 22, fontWeight: 600,
            margin: '0 0 12px', lineHeight: 1.3 }}>
            Ready to govern your AI agents with post-quantum infrastructure?
          </h3>
          <p style={{ color: C.slate, fontSize: 14, lineHeight: 1.7, margin: '0 0 24px' }}>
            Talk to the CoreIdentity advisory team about deploying sovereign-grade AI governance
            for your enterprise or government platform.
          </p>
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            <a href="https://coreidentitygroup.com/ciag"
              target="_blank" rel="noopener noreferrer"
              style={{ background: C.gold, color: C.bg, textDecoration: 'none',
                padding: '11px 22px', borderRadius: 6, fontSize: 13, fontWeight: 700,
                letterSpacing: '0.04em' }}>
              CIAG Advisory &rarr;
            </a>
            <a href="mailto:hello@coreidentitygroup.com"
              style={{ background: 'none', color: C.gold, textDecoration: 'none',
                padding: '11px 22px', borderRadius: 6, fontSize: 13, fontWeight: 500,
                border: '1px solid ' + C.gold + '44' }}>
              hello@coreidentitygroup.com
            </a>
          </div>
        </div>

      </article>
    </div>
  );
}
