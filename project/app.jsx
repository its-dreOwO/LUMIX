const { useState, useEffect, useRef, useCallback } = React;

// ===================================================================
// TWEAK DEFAULTS (editable via Tweaks panel)
// ===================================================================
const TWEAK_DEFAULTS = /*EDITMODE-BEGIN*/{
  "screen": "nexus",
  "accent": "cyan-violet",
  "weatherMood": "smog",
  "orbStyle": "organic",
  "greeting": "Good morning, Dre"
}/*EDITMODE-END*/;

// ===================================================================
// Palettes
// ===================================================================
const PALETTES = {
  "cyan-violet": { a: "#00F0FF", b: "#8A2BE2", name: "Cyan × Violet" },
  "mint-rose":   { a: "#6FFFCE", b: "#FF6FB2", name: "Mint × Rose" },
  "amber-iris":  { a: "#FFC36F", b: "#6F8CFF", name: "Amber × Iris" },
  "ice-lime":    { a: "#9AE9FF", b: "#D4FF6F", name: "Ice × Lime" }
};

// ===================================================================
// AI Orb
// ===================================================================
// RaceBorder — single slow light traveling the perimeter of the input
function RaceBorder({ palette }) {
  const [dims, setDims] = useState({ w: 0, h: 0 });
  const ref = useRef(null);
  useEffect(() => {
    const update = () => {
      const el = ref.current?.parentElement;
      if (el) {
        const r = el.getBoundingClientRect();
        setDims({ w: r.width, h: r.height });
      }
    };
    update();
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, []);
  const perim = 2 * (dims.w + dims.h);
  const beamLen = Math.min(140, perim * 0.18);
  return (
    <div className="race-border" ref={ref}>
      {dims.w > 0 && (
        <svg width={dims.w} height={dims.h} style={{ overflow: 'visible' }}>
          <rect
            x="0.5" y="0.5"
            width={dims.w - 1} height={dims.h - 1}
            rx="28" ry="28"
            fill="none"
            stroke={palette.a}
            strokeWidth="1.2"
            strokeLinecap="round"
            strokeDasharray={`${beamLen} ${perim}`}
            style={{
              filter: `drop-shadow(0 0 6px ${palette.a}) drop-shadow(0 0 14px ${palette.a}88)`,
              animation: 'raceBorder 9s linear infinite'
            }}
          />
        </svg>
      )}
    </div>
  );
}

function AIOrb({ active, onPulse, palette }) {
  const ref = useRef(null);
  const [pulses, setPulses] = useState([]);

  useEffect(() => {
    if (!active) return;
    const id = setInterval(() => {
      triggerPulse();
    }, 1400);
    return () => clearInterval(id);
  }, [active]);

  const triggerPulse = useCallback(() => {
    const rect = ref.current?.getBoundingClientRect();
    if (rect && window.LUMIX_pulse) {
      window.LUMIX_pulse(rect.left + rect.width/2, rect.top + rect.height/2);
    }
    const id = Date.now() + Math.random();
    setPulses(p => [...p, id]);
    setTimeout(() => setPulses(p => p.filter(x => x !== id)), 1400);
    onPulse?.();
  }, [onPulse]);

  const gradient = `conic-gradient(from 0deg,
    transparent 0deg,
    ${palette.a}66 60deg,
    transparent 120deg,
    ${palette.b}88 200deg,
    transparent 260deg,
    ${palette.a}55 320deg,
    transparent 360deg)`;

  const innerGradient = `conic-gradient(from 180deg,
    ${palette.b}55 0deg,
    transparent 90deg,
    ${palette.a}88 180deg,
    transparent 270deg,
    ${palette.b}55 360deg)`;

  const shellBG = `
    radial-gradient(circle at 35% 30%, rgba(255,255,255,0.35), transparent 40%),
    radial-gradient(circle at 65% 70%, ${palette.b}99, transparent 55%),
    radial-gradient(circle at 40% 75%, ${palette.a}77, transparent 55%),
    #0a0a12`;

  return (
    <div className="orb-wrap">
      <div className="orb-glow" style={{
        background: `radial-gradient(circle, ${palette.a}2e 0%, ${palette.b}1f 40%, transparent 70%)`
      }} />
      <div
        ref={ref}
        className={`orb ${active ? 'active' : ''}`}
        onClick={triggerPulse}
        style={{ cursor: 'pointer' }}
      >
        <div className="orb-shell" style={{
          background: shellBG,
          boxShadow: `
            inset 0 0 40px ${palette.a}40,
            inset 0 0 80px ${palette.b}33,
            0 0 60px ${palette.a}40,
            0 0 120px ${palette.b}26`
        }}>
          <div className="orb-swirl" style={{ background: gradient }} />
          <div className="orb-inner-swirl" style={{ background: innerGradient }} />
          <div className="orb-core" style={{
            background: `radial-gradient(circle, rgba(255,255,255,0.6) 0%, ${palette.a}4d 40%, transparent 70%)`
          }} />
        </div>
        {pulses.map(id => (
          <div key={id} className="pulse-ring" style={{ borderColor: `${palette.a}80` }} />
        ))}
      </div>
    </div>
  );
}

// ===================================================================
// Top Nav
// ===================================================================
function TopNav({ screen, setScreen }) {
  return (
    <div className="topnav glass">
      <button className={screen === 'nexus' ? 'active' : ''} onClick={() => setScreen('nexus')}>Nexus</button>
      <button className={screen === 'dashboard' ? 'active' : ''} onClick={() => setScreen('dashboard')}>Dashboard</button>
    </div>
  );
}

// ===================================================================
// NEXUS SCREEN
// ===================================================================
const INITIAL_MESSAGES = [
  { role: 'ai', text: "I noticed your calendar is lighter today. Want me to block off a focus window for the Lumix deck?" }
];

const SUGGEST = [
  "Summarize overnight Slack",
  "Draft a reply to Priya",
  "Plan my focus block",
  "What's on my calendar?"
];

function NexusScreen({ palette, greeting }) {
  const [messages, setMessages] = useState(INITIAL_MESSAGES);
  const [input, setInput] = useState('');
  const [focused, setFocused] = useState(false);
  const [active, setActive] = useState(false);
  const transcriptRef = useRef(null);

  useEffect(() => {
    if (transcriptRef.current) {
      transcriptRef.current.scrollTop = transcriptRef.current.scrollHeight;
    }
  }, [messages]);

  const send = (text) => {
    const t = (text || input).trim();
    if (!t) return;
    setMessages(m => [...m, { role: 'user', text: t }]);
    setInput('');
    setActive(true);

    // fake response
    setTimeout(() => {
      const reply = generateReply(t);
      setMessages(m => [...m, { role: 'ai', text: reply }]);
      setActive(false);
    }, 1400);
  };

  return (
    <div className="nexus">
      <div className="greeting">
        <div className="time mono">06:48 · Wed · Oakland</div>
        <h1 className="display">
          {greeting.split(',')[0]}, <span className="em">{(greeting.split(',')[1] || 'Dre').trim()}</span>
        </h1>
        <p>Ask me anything, or pick a thread to continue.</p>
      </div>

      <AIOrb active={active} palette={palette} />

      <div className="transcript" ref={transcriptRef}>
        {messages.map((m, i) => (
          <div key={i} className={`msg ${m.role}`}>
            <span className="label">{m.role === 'ai' ? 'LUMIX' : 'DRE'}</span>
            {m.text}
          </div>
        ))}
      </div>

      <div className="input-dock">
        <div className={`input-box glass ${focused ? 'focused' : ''}`}>
          <RaceBorder palette={palette} />
          <input
            placeholder="Ask LUMIX anything…"
            value={input}
            onChange={e => setInput(e.target.value)}
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
            onKeyDown={e => e.key === 'Enter' && send()}
          />
          <button className="input-btn" title="Voice">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
              <rect x="9" y="3" width="6" height="12" rx="3" /><path d="M5 11a7 7 0 0 0 14 0" /><path d="M12 18v3" />
            </svg>
          </button>
          <button className="input-btn send" onClick={() => send()} title="Send">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M5 12h14M13 6l6 6-6 6" />
            </svg>
          </button>
        </div>
        <div className="quick-suggest">
          {SUGGEST.map(s => (
            <button key={s} className="chip" onClick={() => send(s)}>{s}</button>
          ))}
        </div>
      </div>
    </div>
  );
}

function generateReply(prompt) {
  const p = prompt.toLowerCase();
  if (p.includes('slack')) return "3 threads need you: Maya pinged about the Q3 roadmap, the design review was moved to 2pm, and ops flagged a billing edge case.";
  if (p.includes('calendar') || p.includes('focus')) return "You have 2h 40m free before your 2pm. I'll guard it. I'll surface only urgent signals.";
  if (p.includes('priya')) return "Drafting now — warm tone, confirms the thursday walk-through, suggests sharing the Figma ahead of time. Want to review?";
  if (p.includes('weather') || p.includes('air')) return "Air quality is moderate-to-poor — PM2.5 at 68. Mask recommended if you're walking more than 10 minutes.";
  return "Got it. I'll pull the threads and come back with options — give me a moment.";
}

// ===================================================================
// DASHBOARD SCREEN
// ===================================================================
const WEATHER_MOODS = {
  sun:  { class: 'sun',  line: "Clear skies and golden light — ", accent: "take the long way home", temp: 72, cond: "Clear", air: "Good", pm: 22 },
  smog: { class: 'smog', line: "The air is pretty dirty today, Dre. ", accent: "Make sure to bring a face mask!", temp: 68, cond: "Hazy", air: "Moderate", pm: 68 },
  cold: { class: 'cold', line: "Wind's biting and skies are gray — ", accent: "layer up before you head out", temp: 44, cond: "Overcast", air: "Good", pm: 18 }
};

function ProgressRing({ value, label, unit, sublabel, palette, size=130 }) {
  const stroke = 4;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const offset = c - (value / 100) * c;
  const gradId = `grad-${label.replace(/\s/g, '')}`;
  return (
    <div className="ring-wrap" style={{ width: size, height: size }}>
      <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
        <defs>
          <linearGradient id={gradId} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor={palette.a} />
            <stop offset="100%" stopColor={palette.b} />
          </linearGradient>
        </defs>
        <circle cx={size/2} cy={size/2} r={r} stroke="rgba(255,255,255,0.06)" strokeWidth={stroke} fill="none" />
        <circle
          cx={size/2} cy={size/2} r={r}
          stroke={`url(#${gradId})`}
          strokeWidth={stroke}
          fill="none"
          strokeDasharray={c}
          strokeDashoffset={offset}
          strokeLinecap="round"
          style={{
            filter: `drop-shadow(0 0 6px ${palette.a}99)`,
            transition: 'stroke-dashoffset 1s ease'
          }}
        />
      </svg>
      <div className="ring-center">
        <div className="pct display">{value}{unit && <span>{unit}</span>}</div>
        <div className="lbl">{label}</div>
      </div>
    </div>
  );
}

function DashboardScreen({ palette, weatherMood }) {
  const mood = WEATHER_MOODS[weatherMood] || WEATHER_MOODS.smog;
  const [btOn, setBtOn] = useState(true);
  const [batt, setBatt] = useState(78);

  // subtle live wiggle
  useEffect(() => {
    const id = setInterval(() => {
      setBatt(b => Math.max(76, Math.min(82, b + (Math.random() - 0.5))));
    }, 3000);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="dashboard">
      <div className="dash-grid">

        {/* Weather */}
        <div className={`card glass weather-card ${mood.class}`} style={{ animationDelay: '.02s' }}>
          <div className="card-label">
            <span className="live-dot" /> Forecast · Oakland, CA
          </div>
          <div className="weather-temp">
            <div className="big">{mood.temp}°</div>
            <div className="sub">{mood.cond}</div>
          </div>
          <h2>
            {mood.line}<em>{mood.accent}</em>
          </h2>
          <div className="weather-meta">
            <span>AIR <b>{mood.air}</b></span>
            <span>PM2.5 <b>{mood.pm}</b></span>
            <span>UV <b>{mood.class === 'sun' ? '7' : '3'}</b></span>
            <span>WIND <b>{mood.class === 'cold' ? '14 mph' : '6 mph'}</b></span>
          </div>
        </div>

        {/* Calendar + Notes (side-by-side on mobile) */}
        <div className="dash-pair">
          <div className="card glass calendar-card" style={{ animationDelay: '.08s' }}>
            <div className="card-label">Next up</div>
            <div className="event-row">
              <div className="event-time">09:30</div>
              <div className="event-dot cyan" />
              <div>
                <div className="event-title">Standup</div>
                <div className="event-sub">Lumix Core · 25m</div>
              </div>
            </div>
            <div className="event-row">
              <div className="event-time">11:15</div>
              <div className="event-dot violet" />
              <div>
                <div className="event-title">1:1 with Priya</div>
                <div className="event-sub">Weekly · remote</div>
              </div>
            </div>
            <div className="event-row">
              <div className="event-time">14:00</div>
              <div className="event-dot silver" />
              <div>
                <div className="event-title">Design Review</div>
                <div className="event-sub">Dashboard v3</div>
              </div>
            </div>
          </div>

          <div className="card glass notes-card" style={{ animationDelay: '.14s' }}>
            <div className="card-label">Capture</div>
            <div className="note-item">
              <span>Ship pulse tuning</span>
              <span className="tt">06:12</span>
            </div>
            <div className="note-item">
              <span>Ask Mira re: HUD</span>
              <span className="tt">Yday</span>
            </div>
            <div className="note-item">
              <span>Book SFO→JFK</span>
              <span className="tt">Yday</span>
            </div>
            <div className="notes-add">
              <div className="plus-mark">+</div>
              <span>New thought…</span>
            </div>
          </div>
        </div>

        {/* Briefing */}
        <div className="card glass briefing-card" style={{ animationDelay: '.2s' }}>
          <div className="card-label">
            <span className="live-dot" /> Daily Briefing · Live API
          </div>
          <div className="brief-item">
            <div className="brief-tag">Tech</div>
            <div className="brief-head">On-device multimodal models cross the 8B parameter line — latency halved QoQ.</div>
          </div>
          <div className="brief-item">
            <div className="brief-tag">Local</div>
            <div className="brief-head">BART weekend closures hit the Bay Bridge corridor — plan Saturday around it.</div>
          </div>
          <div className="brief-item">
            <div className="brief-tag">Markets</div>
            <div className="brief-head">Photonics index up 3.4% on new foundry partnership overnight.</div>
          </div>
        </div>

        {/* Telemetry HUD */}
        <div className="card glass telemetry-card" style={{ animationDelay: '.26s' }}>
          <div className="card-label">Hardware Telemetry · Local Device</div>
          <div className="telemetry-row">
            <ProgressRing value={Math.round(batt)} label="Battery" unit="%" palette={palette} size={96} />
            <div className="telemetry-gauges">
              <div className="gauge">
                <div className="gauge-head"><span>RAM</span><b>16.4 / 32 GB</b></div>
                <div className="gauge-bar"><div className="gauge-fill" style={{ width: '51%' }} /></div>
              </div>
              <div className="gauge">
                <div className="gauge-head"><span>Storage</span><b>412 / 1024 GB</b></div>
                <div className="gauge-bar"><div className="gauge-fill" style={{ width: '40%' }} /></div>
              </div>
              <div className="gauge">
                <div className="gauge-head"><span>CPU</span><b>22%</b></div>
                <div className="gauge-segs">
                  {Array.from({length: 16}).map((_, i) => (
                    <div key={i} className={`seg ${i < 4 ? 'on' : ''}`} />
                  ))}
                </div>
              </div>
            </div>
          </div>

          <div className="connectivity">
            <div className="conn-row">
              <div>
                <div className="name">Cloudforge-5G</div>
                <div className="sub">Wi-Fi · 842 mbps</div>
              </div>
              <svg width="16" height="12" viewBox="0 0 18 14" fill="none">
                <path d="M1 5 A12 12 0 0 1 17 5" stroke={palette.a} strokeWidth="1.3" strokeLinecap="round" />
                <path d="M3.5 8 A8 8 0 0 1 14.5 8" stroke={palette.a} strokeWidth="1.3" strokeLinecap="round" opacity=".8"/>
                <path d="M6 11 A4 4 0 0 1 12 11" stroke={palette.a} strokeWidth="1.3" strokeLinecap="round" opacity=".6"/>
                <circle cx="9" cy="13" r="1.2" fill={palette.a} />
              </svg>
            </div>
            <div className="conn-row">
              <div>
                <div className="name">Lumix Buds Pro</div>
                <div className="sub">{btOn ? 'Bluetooth · Connected' : 'Bluetooth · Off'}</div>
              </div>
              <div className={`toggle ${btOn ? 'on' : ''}`} onClick={() => setBtOn(!btOn)}>
                <div className="knob" />
              </div>
            </div>
            <div className="conn-row">
              <div>
                <div className="name">Focus Mode</div>
                <div className="sub">Blocking 14 sources</div>
              </div>
              <div className="toggle on"><div className="knob" /></div>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}

// ===================================================================
// TWEAKS PANEL
// ===================================================================
function TweaksPanel({ open, onClose, state, update }) {
  if (!open) return null;
  return (
    <div className="tweaks-panel glass open">
      <h3>Tweaks <span className="close" onClick={onClose}>×</span></h3>

      <div className="tweak-row">
        <label>Screen</label>
        <div className="tweak-options">
          {['nexus', 'dashboard'].map(s => (
            <button key={s}
              className={`tweak-opt ${state.screen === s ? 'active' : ''}`}
              onClick={() => update({ screen: s })}>
              {s[0].toUpperCase() + s.slice(1)}
            </button>
          ))}
        </div>
      </div>

      <div className="tweak-row">
        <label>Accent Palette</label>
        <div className="tweak-options">
          {Object.entries(PALETTES).map(([k, v]) => (
            <button key={k}
              className={`tweak-opt tweak-swatch ${state.accent === k ? 'active' : ''}`}
              title={v.name}
              onClick={() => update({ accent: k })}
              style={{ background: `linear-gradient(135deg, ${v.a}, ${v.b})` }}
            />
          ))}
        </div>
      </div>

      <div className="tweak-row">
        <label>Weather Mood</label>
        <div className="tweak-options">
          {['sun', 'smog', 'cold'].map(m => (
            <button key={m}
              className={`tweak-opt ${state.weatherMood === m ? 'active' : ''}`}
              onClick={() => update({ weatherMood: m })}>
              {m[0].toUpperCase() + m.slice(1)}
            </button>
          ))}
        </div>
      </div>

      <div className="tweak-row">
        <label>Greeting</label>
        <div className="tweak-options">
          {['Good morning, Dre', 'Welcome back, Dre', 'Hey, Dre'].map(g => (
            <button key={g}
              className={`tweak-opt ${state.greeting === g ? 'active' : ''}`}
              onClick={() => update({ greeting: g })}>
              {g}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

// ===================================================================
// APP ROOT
// ===================================================================
function App() {
  const [state, setState] = useState(TWEAK_DEFAULTS);
  const [tweaksOpen, setTweaksOpen] = useState(false);
  const [scale, setScale] = useState(1);
  const palette = PALETTES[state.accent] || PALETTES["cyan-violet"];

  // Compute scale to fit phone in viewport
  useEffect(() => {
    const update = () => {
      const s = Math.min((window.innerHeight - 40) / 820, (window.innerWidth - 40) / 390, 1.2);
      setScale(s);
    };
    update();
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, []);

  // Update particle palette + kick canvas resize after scale settles
  useEffect(() => {
    window.LUMIX_startParticles?.();
    window.LUMIX_setPalette?.(palette.a, palette.b);
    setTimeout(() => window.LUMIX_resize?.(), 50);
  }, [palette.a, palette.b, scale]);

  const update = (patch) => {
    setState(s => ({ ...s, ...patch }));
    window.parent?.postMessage({ type: '__edit_mode_set_keys', edits: patch }, '*');
  };

  // Edit-mode host protocol
  useEffect(() => {
    const handler = (e) => {
      if (e.data?.type === '__activate_edit_mode') setTweaksOpen(true);
      if (e.data?.type === '__deactivate_edit_mode') setTweaksOpen(false);
    };
    window.addEventListener('message', handler);
    window.parent?.postMessage({ type: '__edit_mode_available' }, '*');
    return () => window.removeEventListener('message', handler);
  }, []);

  return (
    <div className="phone-stage">
      <div className="phone-scale" style={{ transform: `scale(${scale})` }}>
      <div className="phone">
        <div className="phone-screen">
          <canvas id="particles"></canvas>
          <div className="phone-notch" />
          <div className="phone-status">
            <span>9:30</span>
            <div className="phone-status-icons">
              <svg width="14" height="11" viewBox="0 0 14 11" fill="none">
                <path d="M1 7 A9 9 0 0 1 13 7" stroke="#fff" strokeWidth="1.2" strokeLinecap="round"/>
                <path d="M3 8.5 A6 6 0 0 1 11 8.5" stroke="#fff" strokeWidth="1.2" strokeLinecap="round" opacity=".85"/>
                <circle cx="7" cy="10" r="1" fill="#fff"/>
              </svg>
              <svg width="14" height="10" viewBox="0 0 14 10" fill="none">
                <rect x="1" y="2" width="10" height="6" rx="1.5" stroke="#fff" strokeWidth="1" opacity=".85"/>
                <rect x="2.5" y="3.5" width="7" height="3" rx="0.5" fill="#00F0FF"/>
                <rect x="12" y="4" width="1.5" height="2" rx="0.5" fill="#fff"/>
              </svg>
            </div>
          </div>
          <div className="app-shell" data-screen-label={state.screen === 'nexus' ? '01 Nexus' : '02 Dashboard'}>
            <TopNav screen={state.screen} setScreen={(s) => update({ screen: s })} />
            {state.screen === 'nexus'
              ? <NexusScreen palette={palette} greeting={state.greeting} />
              : <DashboardScreen palette={palette} weatherMood={state.weatherMood} />}
          </div>
          <div className="phone-home" />
        </div>
      </div>
      </div>
      <TweaksPanel open={tweaksOpen} onClose={() => setTweaksOpen(false)} state={state} update={update} />
    </div>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(<App />);
