// Web Audio API Sound Synthesizer for Calling Tones
// No external mp3 assets needed - zero 404s, works reliably across all browsers.

class ToneGenerator {
  private ctx: AudioContext | null = null;
  private intervalId: NodeJS.Timeout | null = null;
  private activeOscillators: OscillatorNode[] = [];

  private initCtx() {
    if (!this.ctx && typeof window !== "undefined") {
      const AudioContextClass =
        window.AudioContext || (window as any).webkitAudioContext;
      if (AudioContextClass) {
        this.ctx = new AudioContextClass();
      }
    }
    if (this.ctx && this.ctx.state === "suspended") {
      this.ctx.resume().catch(() => {});
    }
  }

  // Incoming Call: Melodic two-step chime repeating every 2.5 seconds
  public playRingtone() {
    this.stopTones();
    this.initCtx();
    if (!this.ctx) return;

    const playChimeSequence = () => {
      if (!this.ctx) return;
      const notes = [
        { freq: 523.25, time: 0, duration: 0.15 }, // C5
        { freq: 659.25, time: 0.18, duration: 0.15 }, // E5
        { freq: 783.99, time: 0.36, duration: 0.2 }, // G5
        { freq: 1046.5, time: 0.58, duration: 0.35 }, // C6
      ];

      notes.forEach(({ freq, time, duration }) => {
        if (!this.ctx) return;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = "sine";
        osc.frequency.setValueAtTime(freq, this.ctx.currentTime + time);

        gain.gain.setValueAtTime(0, this.ctx.currentTime + time);
        gain.gain.linearRampToValueAtTime(0.25, this.ctx.currentTime + time + 0.03);
        gain.gain.exponentialRampToValueAtTime(
          0.0001,
          this.ctx.currentTime + time + duration
        );

        osc.connect(gain);
        gain.connect(this.ctx.destination);

        osc.start(this.ctx.currentTime + time);
        osc.stop(this.ctx.currentTime + time + duration);
        this.activeOscillators.push(osc);
      });
    };

    playChimeSequence();
    this.intervalId = setInterval(playChimeSequence, 2400);
  }

  // Outgoing Call: Gentle dial tone pulse (440Hz + 480Hz) repeating every 3 seconds
  public playDialTone() {
    this.stopTones();
    this.initCtx();
    if (!this.ctx) return;

    const playBeep = () => {
      if (!this.ctx) return;
      const osc1 = this.ctx.createOscillator();
      const osc2 = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc1.type = "sine";
      osc1.frequency.setValueAtTime(440, this.ctx.currentTime);
      osc2.type = "sine";
      osc2.frequency.setValueAtTime(480, this.ctx.currentTime);

      gain.gain.setValueAtTime(0.12, this.ctx.currentTime);
      gain.gain.linearRampToValueAtTime(0.0001, this.ctx.currentTime + 1.2);

      osc1.connect(gain);
      osc2.connect(gain);
      gain.connect(this.ctx.destination);

      osc1.start(this.ctx.currentTime);
      osc2.start(this.ctx.currentTime);
      osc1.stop(this.ctx.currentTime + 1.2);
      osc2.stop(this.ctx.currentTime + 1.2);

      this.activeOscillators.push(osc1, osc2);
    };

    playBeep();
    this.intervalId = setInterval(playBeep, 3000);
  }

  // Call End / Declined: Short descending double tone
  public playEndTone() {
    this.stopTones();
    this.initCtx();
    if (!this.ctx) return;

    const notes = [
      { freq: 440, time: 0, duration: 0.15 },
      { freq: 330, time: 0.18, duration: 0.25 },
    ];

    notes.forEach(({ freq, time, duration }) => {
      if (!this.ctx) return;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = "triangle";
      osc.frequency.setValueAtTime(freq, this.ctx.currentTime + time);

      gain.gain.setValueAtTime(0.2, this.ctx.currentTime + time);
      gain.gain.exponentialRampToValueAtTime(
        0.001,
        this.ctx.currentTime + time + duration
      );

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(this.ctx.currentTime + time);
      osc.stop(this.ctx.currentTime + time + duration);
    });
  }

  // Stop all active ringtones & tones
  public stopTones() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    this.activeOscillators.forEach((osc) => {
      try {
        osc.stop();
        osc.disconnect();
      } catch {}
    });
    this.activeOscillators = [];
  }
}

export const toneGenerator = new ToneGenerator();

