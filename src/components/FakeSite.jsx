/** Simulated pages rendered inside the test lab browser frame. */

function DailyByte() {
  return (
    <div className="fakesite">
      <div className="fakesite-head">
        <div className="fakesite-logo">The Daily Byte</div>
        <div className="fakesite-nav">
          <span>World</span>
          <span>Business</span>
          <span>Culture</span>
          <span>Opinion</span>
        </div>
        <button type="button" className="mini-btn" style={{ marginLeft: 'auto' }}>
          Subscribe
        </button>
      </div>
      <div className="fakesite-body">
        <div className="fake-ad leaderboard ad-leaderboard">
          Advertisement
          <strong>Lead the morning — 40% off your first year</strong>
        </div>
        <div>
          <div className="fakesite-hero-title">The quiet return of the night train</div>
          <div className="fakesite-dek">
            Sleeper carriages are back on the menu across Europe, and travellers are booking earlier
            than ever.
          </div>
        </div>
        <div className="hero-image" />
        <div className="fakesite-columns">
          <div className="fakesite-copy article-body">
            <p>
              At nine in the evening the platform at Gare de l&rsquo;Est is busier than it has been in a
              decade. Porters stack luggage, a conductor checks a paper list, and somewhere down the
              track a sleeper train waits to leave.
            </p>
            <p>
              Operators say bookings have doubled since spring, driven by travellers who would rather
              wake up in another country than spend a morning at an airport.
            </p>
            <div className="fake-ad inline ad-slot">
              Sponsored
              <strong>Open a smarter savings account</strong>
            </div>
            <p>
              The economics are still delicate — carriages are costly to maintain — but the mood on the
              platform is hard to mistake for anything other than optimism.
            </p>
          </div>
          <div className="fakesite-side">
            <div className="fake-ad tall sponsored-rail">
              Sponsored
              <strong>Is your VPN slowing you down?</strong>
            </div>
            <div className="newsletter-popup">
              <strong>Get the Byte in your inbox</strong>
              <br />
              One email, every morning.
              <br />
              <button type="button" className="mini-btn" style={{ marginTop: 8 }}>
                Sign up
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function Shoply() {
  return (
    <div className="fakesite">
      <div className="fakesite-head">
        <div className="fakesite-logo">Shoply</div>
        <div className="fakesite-nav">
          <span>Furniture</span>
          <span>Lighting</span>
          <span>Outdoor</span>
          <span>Sale</span>
        </div>
        <button type="button" className="mini-btn" style={{ marginLeft: 'auto' }}>
          Cart · 2
        </button>
      </div>
      <div className="fakesite-body">
        <div className="fake-ad leaderboard ad-slot">
          Advertisement
          <strong>You looked at a chair. Here are 40 more chairs.</strong>
        </div>
        <div>
          <div className="fakesite-hero-title">Small rooms, big ideas</div>
          <div className="fakesite-dek">Twelve pieces that make a 28 m² apartment feel generous.</div>
        </div>
        <div className="product-grid">
          <div className="fake-product product-card">
            <div className="thumb" />
            <div className="meta">
              <strong>Oak stool</strong>
              <span>$89</span>
            </div>
          </div>
          <div className="fake-product product-card">
            <div className="thumb" />
            <div className="meta">
              <strong>Paper lamp</strong>
              <span>$54</span>
            </div>
          </div>
          <div className="fake-product product-card">
            <div className="thumb" />
            <div className="meta">
              <strong>Linen throw</strong>
              <span>$120</span>
            </div>
          </div>
          <div className="fake-product sponsored sponsored-card">
            <div className="thumb" style={{ background: 'linear-gradient(140deg,#ffe6a6,#fff2cc)' }} />
            <div className="meta">
              <strong>Sponsored: 3-seat sofa</strong>
              <span>$1,499 · partner</span>
            </div>
          </div>
          <div className="fake-product product-card">
            <div className="thumb" />
            <div className="meta">
              <strong>Ceramic vase</strong>
              <span>$42</span>
            </div>
          </div>
          <div className="fake-product product-card">
            <div className="thumb" />
            <div className="meta">
              <strong>Wall mirror</strong>
              <span>$210</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function TubeTime() {
  return (
    <div className="fakesite">
      <div className="fakesite-head">
        <div className="fakesite-logo">TubeTime</div>
        <div className="fakesite-nav">
          <span>Home</span>
          <span>Shorts</span>
          <span>Subscriptions</span>
        </div>
        <button type="button" className="mini-btn" style={{ marginLeft: 'auto' }}>
          Sign in
        </button>
      </div>
      <div className="fakesite-body">
        <div className="video-frame player">
          <div className="pre-roll-ad fake-ad" style={{ width: '78%', minHeight: 120 }}>
            Pre-roll advertisement
            <strong>Your video starts after this message</strong>
            <span style={{ marginTop: 6, textTransform: 'none', letterSpacing: 0 }}>
              Skip in 5 seconds
            </span>
          </div>
        </div>
        <div className="video-meta">
          <div className="video-title">A 20-minute weeknight ramen, from scratch</div>
          <span className="badge plain">12:04</span>
        </div>
        <div className="fakesite-columns">
          <div className="fakesite-copy">
            <p>
              Tonight we are making a weeknight ramen that does not taste like compromise: a quick
              broth, a jammy egg, and whatever greens are in the fridge.
            </p>
            <div className="fake-ad inline companion-ad">
              Advertisement
              <strong>Meal kits — $4.50 per serving</strong>
            </div>
          </div>
          <div className="fakesite-side">
            <div className="sticky-social fake-ad" style={{ background: '#f7f7f5', borderColor: '#ddd' }}>
              Follow us everywhere
              <span style={{ textTransform: 'none', letterSpacing: 0 }}>
                @tubetime · 4.2M followers
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function DevNotes() {
  return (
    <div className="fakesite">
      <div className="fakesite-head">
        <div className="fakesite-logo">DevNotes</div>
        <div className="fakesite-nav">
          <span>Archive</span>
          <span>About</span>
          <span>RSS</span>
        </div>
      </div>
      <div className="fakesite-body">
        <div className="cookie-banner">
          <span>
            We value your privacy. We and our 412 partners may store cookies on your device.
          </span>
          <button type="button" className="mini-btn">
            Accept all
          </button>
        </div>
        <div>
          <div className="fakesite-hero-title">A tiny parser, explained</div>
          <div className="fakesite-dek">How a filter engine turns text rules into a decision in microseconds.</div>
        </div>
        <div className="fakesite-columns">
          <div className="fakesite-copy post-body">
            <p>
              Most blocking engines are, at heart, a very fast string matcher. Rules arrive as text,
              get compiled once, and are then tested against every outgoing request.
            </p>
            <div className="code-block">{`if (rule.regex.test(url)) {\n  return decision('block', rule)\n}`}</div>
            <p>
              The interesting part is the edge cases: exceptions, request types, and the difference
              between a first-party and a third-party request.
            </p>
          </div>
          <div className="fakesite-side">
            <div className="taboola-widget" style={{ border: '1px dashed #e0c68a', borderRadius: 6, padding: 10 }}>
              <div style={{ fontSize: 9.5, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#9a7b2a' }}>
                From around the web
              </div>
              <div style={{ fontSize: 11.5, marginTop: 6, color: '#444' }}>
                10 things your smart home knows about you
              </div>
              <div style={{ fontSize: 11.5, marginTop: 6, color: '#444' }}>
                This one trick made developers furious
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function FakeSite({ id }) {
  if (id === 'shoply') return <Shoply />
  if (id === 'tubetime') return <TubeTime />
  if (id === 'devnotes') return <DevNotes />
  return <DailyByte />
}
