/**
 * Procedural Ambient Focus Soundscape Synthesizer
 * Powered by Web Audio API — 100% self-contained, 0 external audio files needed.
 */

export type SoundscapeType = 'rain' | 'binaural' | 'ocean' | 'cafe' | 'campfire';

export interface SoundscapeOption {
  id: SoundscapeType;
  name: string;
  icon: string;
  description: string;
}

export const SOUNDSCAPE_OPTIONS: SoundscapeOption[] = [
  { id: 'rain', name: 'Gentle Rain', icon: 'water_drop', description: 'Soft raindrops for calming overthinking' },
  { id: 'binaural', name: '40Hz Gamma Focus', icon: 'graphic_eq', description: 'Binaural beats for high-level cognitive flow' },
  { id: 'ocean', name: 'Ocean Waves', icon: 'tsunami', description: 'Rhythmic tidal swells to steady breathing' },
  { id: 'cafe', name: 'Cafe Murmur', icon: 'local_cafe', description: 'Subtle ambient drone for background presence' },
  { id: 'campfire', name: 'Campfire', icon: 'local_fire_department', description: 'Warm crackling embers for cozy study blocks' },
];

class SoundscapeEngine {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private currentType: SoundscapeType | null = null;
  private activeNodes: (AudioNode | number)[] = [];
  private isPlaying = false;
  private currentVolume = 0.5;

  private initContext() {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      this.ctx = new AudioCtx();
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.setValueAtTime(this.currentVolume, this.ctx.currentTime);
      this.masterGain.connect(this.ctx.destination);
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  public setVolume(vol: number) {
    this.currentVolume = Math.max(0, Math.min(1, vol));
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setTargetAtTime(this.currentVolume, this.ctx.currentTime, 0.05);
    }
  }

  public getVolume(): number {
    return this.currentVolume;
  }

  public getCurrentSoundscape(): SoundscapeType | null {
    return this.currentType;
  }

  public getIsPlaying(): boolean {
    return this.isPlaying;
  }

  public stop() {
    if (!this.isPlaying) return;
    this.isPlaying = false;
    this.cleanupActiveNodes();
  }

  private cleanupActiveNodes() {
    this.activeNodes.forEach(item => {
      if (typeof item === 'number') {
        window.clearInterval(item);
      } else {
        try {
          if ('stop' in item && typeof (item as any).stop === 'function') {
            (item as any).stop();
          }
          item.disconnect();
        } catch {
          // ignore disconnect errors
        }
      }
    });
    this.activeNodes = [];
  }

  public play(type: SoundscapeType) {
    this.initContext();
    if (!this.ctx || !this.masterGain) return;

    // Clean up previous soundscape
    this.cleanupActiveNodes();
    this.currentType = type;
    this.isPlaying = true;

    switch (type) {
      case 'rain':
        this.startRain();
        break;
      case 'binaural':
        this.startBinaural();
        break;
      case 'ocean':
        this.startOcean();
        break;
      case 'cafe':
        this.startCafe();
        break;
      case 'campfire':
        this.startCampfire();
        break;
    }
  }

  // 1. Procedural Gentle Rain (Pink Noise filtered with resonant drops)
  private startRain() {
    if (!this.ctx || !this.masterGain) return;
    const bufferSize = this.ctx.sampleRate * 2;
    const noiseBuffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const output = noiseBuffer.getChannelData(0);

    let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;
    for (let i = 0; i < bufferSize; i++) {
      const white = Math.random() * 2 - 1;
      b0 = 0.99886 * b0 + white * 0.0555179;
      b1 = 0.99332 * b1 + white * 0.0750759;
      b2 = 0.96900 * b2 + white * 0.1538520;
      b3 = 0.86650 * b3 + white * 0.3104856;
      b4 = 0.55000 * b4 + white * 0.5329522;
      b5 = -0.7616 * b5 - white * 0.0168980;
      output[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362) * 0.11;
      b6 = white * 0.115926;
    }

    const whiteNoise = this.ctx.createBufferSource();
    whiteNoise.buffer = noiseBuffer;
    whiteNoise.loop = true;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(800, this.ctx.currentTime);

    const rainGain = this.ctx.createGain();
    rainGain.gain.setValueAtTime(0.7, this.ctx.currentTime);

    whiteNoise.connect(filter);
    filter.connect(rainGain);
    rainGain.connect(this.masterGain);

    whiteNoise.start();
    this.activeNodes.push(whiteNoise, filter, rainGain);
  }

  // 2. 40Hz Binaural Beat (Gamma Wave: 200Hz Left, 240Hz Right)
  private startBinaural() {
    if (!this.ctx || !this.masterGain) return;

    // Carrier frequency: 200Hz, difference: 40Hz (gamma wave for focus)
    const oscLeft = this.ctx.createOscillator();
    const oscRight = this.ctx.createOscillator();

    oscLeft.type = 'sine';
    oscRight.type = 'sine';

    oscLeft.frequency.setValueAtTime(200, this.ctx.currentTime);
    oscRight.frequency.setValueAtTime(240, this.ctx.currentTime);

    const merger = this.ctx.createChannelMerger(2);
    const binauralGain = this.ctx.createGain();
    binauralGain.gain.setValueAtTime(0.25, this.ctx.currentTime); // Gentle soothing volume

    oscLeft.connect(merger, 0, 0); // left channel
    oscRight.connect(merger, 0, 1); // right channel

    merger.connect(binauralGain);
    binauralGain.connect(this.masterGain);

    oscLeft.start();
    oscRight.start();

    this.activeNodes.push(oscLeft, oscRight, merger, binauralGain);
  }

  // 3. Ocean Waves (LFO-modulated lowpass filtered noise)
  private startOcean() {
    if (!this.ctx || !this.masterGain) return;
    const bufferSize = this.ctx.sampleRate * 2;
    const noiseBuffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const output = noiseBuffer.getChannelData(0);

    for (let i = 0; i < bufferSize; i++) {
      output[i] = Math.random() * 2 - 1;
    }

    const noise = this.ctx.createBufferSource();
    noise.buffer = noiseBuffer;
    noise.loop = true;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(450, this.ctx.currentTime);

    const waveGain = this.ctx.createGain();
    waveGain.gain.setValueAtTime(0.2, this.ctx.currentTime);

    // LFO for rhythmic swells (0.12 Hz ~ 8 seconds per wave swell)
    const lfo = this.ctx.createOscillator();
    lfo.type = 'sine';
    lfo.frequency.setValueAtTime(0.12, this.ctx.currentTime);

    const lfoGain = this.ctx.createGain();
    lfoGain.gain.setValueAtTime(0.35, this.ctx.currentTime);

    lfo.connect(lfoGain);
    lfoGain.connect(waveGain.gain);

    noise.connect(filter);
    filter.connect(waveGain);
    waveGain.connect(this.masterGain);

    noise.start();
    lfo.start();

    this.activeNodes.push(noise, filter, waveGain, lfo, lfoGain);
  }

  // 4. Cafe Murmur (Warm layered harmonic drones with soft random presence)
  private startCafe() {
    if (!this.ctx || !this.masterGain) return;

    const osc1 = this.ctx.createOscillator();
    const osc2 = this.ctx.createOscillator();
    osc1.type = 'triangle';
    osc2.type = 'sine';
    osc1.frequency.setValueAtTime(110, this.ctx.currentTime); // A2 warm drone
    osc2.frequency.setValueAtTime(164.81, this.ctx.currentTime); // E3 fifth

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(300, this.ctx.currentTime);

    const cafeGain = this.ctx.createGain();
    cafeGain.gain.setValueAtTime(0.18, this.ctx.currentTime);

    osc1.connect(filter);
    osc2.connect(filter);
    filter.connect(cafeGain);
    cafeGain.connect(this.masterGain);

    osc1.start();
    osc2.start();

    this.activeNodes.push(osc1, osc2, filter, cafeGain);
  }

  // 5. Cozy Campfire (Low rumble with crackle impulses)
  private startCampfire() {
    if (!this.ctx || !this.masterGain) return;

    // Background low warmth
    const osc = this.ctx.createOscillator();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(65, this.ctx.currentTime);

    const oscGain = this.ctx.createGain();
    oscGain.gain.setValueAtTime(0.15, this.ctx.currentTime);

    osc.connect(oscGain);
    oscGain.connect(this.masterGain);
    osc.start();
    this.activeNodes.push(osc, oscGain);

    // Crackle burst generator
    const intervalId = window.setInterval(() => {
      if (!this.ctx || !this.isPlaying || !this.masterGain) return;
      if (Math.random() > 0.45) return;

      const clickOsc = this.ctx.createOscillator();
      const clickGain = this.ctx.createGain();

      clickOsc.type = 'square';
      clickOsc.frequency.setValueAtTime(600 + Math.random() * 1800, this.ctx.currentTime);

      const now = this.ctx.currentTime;
      clickGain.gain.setValueAtTime(0.08 + Math.random() * 0.12, now);
      clickGain.gain.exponentialRampToValueAtTime(0.001, now + 0.04);

      clickOsc.connect(clickGain);
      clickGain.connect(this.masterGain);

      clickOsc.start(now);
      clickOsc.stop(now + 0.05);
    }, 180);

    this.activeNodes.push(intervalId);
  }
}

export const soundscapeEngine = new SoundscapeEngine();
