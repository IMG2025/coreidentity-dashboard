// src/pages/Blog.jsx — CoreIdentity Blog index
import { C, F, useWindowWidth } from '../chc-design.js';
import { blogPosts } from '../data/blogPosts.js';
import Nav from '../components/Nav.jsx';

export default function Blog() {
  const w = useWindowWidth();
  const m = w < 768;

  return (
    <div style={{ background: C.bg, color: C.white, fontFamily: F.body, minHeight: '100vh' }}>
      <Nav route="/#/blog" />

      <div style={{ maxWidth: 800, margin: '0 auto', padding: m ? '48px 20px' : '72px 40px' }}>

        {/* Header */}
        <div style={{ marginBottom: 56 }}>
          <div style={{ color: C.gold, fontSize: 11, letterSpacing: '0.2em',
            textTransform: 'uppercase', marginBottom: 16,
            display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ width: 24, height: 1, background: C.gold }} />
            CoreIdentity Insights
          </div>
          <h1 style={{ fontFamily: F.display, fontSize: m ? 48 : 64, lineHeight: 0.95,
            color: C.white, margin: '0 0 16px', letterSpacing: '0.02em' }}>
            THE BLOG
          </h1>
          <p style={{ color: C.slate, fontSize: 15, lineHeight: 1.7, margin: 0 }}>
            Technical deep-dives, governance research, and product updates from the CoreIdentity team.
          </p>
        </div>

        {/* Post list */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {blogPosts.map((post, i) => (
            <a
              key={post.slug}
              href={`#/blog/${post.slug}`}
              style={{ textDecoration: 'none', display: 'block' }}
            >
              <div style={{
                background: C.surface,
                border: '1px solid ' + C.border,
                borderRadius: 10,
                padding: m ? '24px 20px' : '32px 36px',
                marginBottom: 16,
                transition: 'border-color 0.2s',
                position: 'relative',
                overflow: 'hidden',
              }}
                onMouseEnter={e => e.currentTarget.style.borderColor = C.gold + '66'}
                onMouseLeave={e => e.currentTarget.style.borderColor = C.border}
              >
                {/* Top accent */}
                {i === 0 && (
                  <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 2,
                    background: `linear-gradient(90deg,${C.gold},${C.teal})` }} />
                )}
                <div style={{ display: 'flex', justifyContent: 'space-between',
                  alignItems: 'flex-start', flexWrap: 'wrap', gap: 8, marginBottom: 12 }}>
                  <time style={{ color: C.slate, fontSize: 12, letterSpacing: '0.08em',
                    textTransform: 'uppercase', fontFamily: F.mono }}>
                    {new Date(post.date + 'T12:00:00Z').toLocaleDateString('en-US',
                      { year: 'numeric', month: 'long', day: 'numeric', timeZone: 'UTC' })}
                  </time>
                  {i === 0 && (
                    <span style={{ background: C.gold + '22', color: C.gold,
                      fontSize: 10, fontWeight: 700, letterSpacing: '0.12em',
                      textTransform: 'uppercase', padding: '3px 10px', borderRadius: 4,
                      border: '1px solid ' + C.gold + '44' }}>
                      Latest
                    </span>
                  )}
                </div>
                <h2 style={{ color: C.white, fontSize: m ? 18 : 21, fontWeight: 600,
                  lineHeight: 1.3, margin: '0 0 12px' }}>
                  {post.title}
                </h2>
                <p style={{ color: C.slate, fontSize: 14, lineHeight: 1.7,
                  margin: '0 0 20px' }}>
                  {post.excerpt}
                </p>
                <div style={{ display: 'flex', justifyContent: 'space-between',
                  alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
                  <span style={{ color: C.slate, fontSize: 12 }}>{post.author}</span>
                  <span style={{ color: C.gold, fontSize: 13, fontWeight: 500 }}>
                    Read More &rarr;
                  </span>
                </div>
              </div>
            </a>
          ))}
        </div>

      </div>
    </div>
  );
}
