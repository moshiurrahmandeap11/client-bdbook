// ─────────────────────────────────────────────────────────────────────────────
// PART 1: utils/messageUtils.js
// Types, constants, audio helpers, formatters
// ─────────────────────────────────────────────────────────────────────────────

// ── Audio: Web Audio API ─────────────────────────────────────────────────────
export const playMessageSendSound = () => {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const o1 = ctx.createOscillator();
    const o2 = ctx.createOscillator();
    const gain = ctx.createGain();
    o1.connect(gain); o2.connect(gain); gain.connect(ctx.destination);
    o1.type = "sine"; o2.type = "sine";
    o1.frequency.setValueAtTime(600, ctx.currentTime);
    o1.frequency.exponentialRampToValueAtTime(900, ctx.currentTime + 0.08);
    o2.frequency.setValueAtTime(800, ctx.currentTime + 0.04);
    o2.frequency.exponentialRampToValueAtTime(1100, ctx.currentTime + 0.12);
    gain.gain.setValueAtTime(0.18, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.18);
    o1.start(ctx.currentTime); o1.stop(ctx.currentTime + 0.18);
    o2.start(ctx.currentTime + 0.04); o2.stop(ctx.currentTime + 0.18);
  } catch (e) {}
};

export const playMessageReceiveSound = () => {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const o = ctx.createOscillator();
    const gain = ctx.createGain();
    o.connect(gain); gain.connect(ctx.destination);
    o.type = "sine";
    o.frequency.setValueAtTime(440, ctx.currentTime);
    o.frequency.exponentialRampToValueAtTime(660, ctx.currentTime + 0.1);
    gain.gain.setValueAtTime(0.12, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.15);
    o.start(ctx.currentTime); o.stop(ctx.currentTime + 0.15);
  } catch (e) {}
};

export const createRingtone = () => {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    let playing = true;
    const ring = () => {
      if (!playing) return;
      [0, 0.3].forEach(offset => {
        const o = ctx.createOscillator();
        const g = ctx.createGain();
        o.connect(g); g.connect(ctx.destination);
        o.type = "sine"; o.frequency.value = 480;
        g.gain.setValueAtTime(0, ctx.currentTime + offset);
        g.gain.linearRampToValueAtTime(0.3, ctx.currentTime + offset + 0.05);
        g.gain.linearRampToValueAtTime(0, ctx.currentTime + offset + 0.25);
        o.start(ctx.currentTime + offset);
        o.stop(ctx.currentTime + offset + 0.25);
      });
      setTimeout(() => { if (playing) ring(); }, 2000);
    };
    ring();
    return { stop: () => { playing = false; ctx.close(); } };
  } catch (e) { return { stop: () => {} }; }
};

// ── Formatters ───────────────────────────────────────────────────────────────
export const formatTime = (date) => {
  const d = new Date(date);
  const now = new Date();
  const diff = Math.floor((now - d) / 86400000);
  if (diff === 0) return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  if (diff === 1) return "Yesterday";
  return d.toLocaleDateString();
};

export const formatCallDuration = (s) => {
  const m = Math.floor(s / 60).toString().padStart(2, "0");
  const sec = (s % 60).toString().padStart(2, "0");
  return `${m}:${sec}`;
};

export const formatVoiceDuration = (seconds) => {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, "0")}`;
};

// ── Helpers ──────────────────────────────────────────────────────────────────
export const blobToBase64 = (blob) =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });

// ── WebRTC Config ────────────────────────────────────────────────────────────
export const RTC_CONFIGURATION = {
  iceServers: [
    { urls: "stun:stun.l.google.com:19302" },
    { urls: "stun:stun1.l.google.com:19302" },
    {
      urls: "turn:openrelay.metered.ca:80",
      username: "openrelayproject",
      credential: "openrelayproject",
    },
    {
      urls: "turn:openrelay.metered.ca:443",
      username: "openrelayproject",
      credential: "openrelayproject",
    },
  ],
};

// ── Query Keys (TanStack Query) ──────────────────────────────────────────────
export const QUERY_KEYS = {
  conversations: ["conversations"],
  messages: (friendId) => ["messages", friendId],
};