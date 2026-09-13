/* LEVENTE — THE CREATOR · voice.js — hang: az emberek beszéde hallható (böngészős beszédszintézis), a Teremtő mikrofonon szólhat (beszédfelismerés) */
(function (LW) {
  'use strict';
  const Voice = {
    speakKey: 'lw.voice.speak', lastSpokeMs: 0, listening: false, rec: null, voicesLoaded: false, huVoices: [], anyVoices: [],
    get ttsSupported() { return typeof speechSynthesis !== 'undefined' && typeof SpeechSynthesisUtterance !== 'undefined'; },
    get sttSupported() { return typeof window !== 'undefined' && !!(window.SpeechRecognition || window.webkitSpeechRecognition); },
    get speakOn() { try { return localStorage.getItem(this.speakKey) !== '0'; } catch (e) { return true; } },
    setSpeak(on) { try { localStorage.setItem(this.speakKey, on ? '1' : '0'); } catch (e) { /* ignore */ } if (!on && this.ttsSupported) speechSynthesis.cancel(); },
    loadVoices() {
      if (!this.ttsSupported) return; const vs = speechSynthesis.getVoices() || []; if (!vs.length) return;
      const natural = (v) => /natural|online|neural|google|premium|enhanced|wavenet|siri/i.test(v.name);
      this.anyVoices = vs; this.huVoices = vs.filter((v) => /^hu/i.test(v.lang)); this.huNatural = this.huVoices.filter(natural);
      // a kitalált szavakhoz olyan nyelvek hangjai is jók, amelyek betű szerint ejtenek (finn, észt, török, olasz, spanyol, lengyel, cseh, román…)
      const phon = vs.filter((v) => /^(hu|fi|et|tr|it|es|pl|cs|sk|ro|hr|sl|lt|lv|eu|id|sw|ka)/i.test(v.lang));
      this.ownPool = (phon.filter(natural).length >= 2 ? phon.filter(natural) : phon.length ? phon : vs.filter(natural).length ? vs.filter(natural) : vs);
      this.voicesLoaded = true;
    },
    init() { if (!this.ttsSupported) return; this.loadVoices(); speechSynthesis.addEventListener('voiceschanged', () => this.loadVoices()); },
    /** Egy ember hangja: a nem és a kor adja a hangmagasságot, az azonosító a személyes színezetet. */
    voiceFor(world, a, purpose) {
      const age = LW.Time.ageYears(a.bornTick, world.tick); const h = (a.id * 2654435761) >>> 0;
      let pitch = a.sex === 'f' ? 1.2 : 0.85; if (age < 14) pitch += 0.4; else if (age > 55) pitch -= 0.15; pitch += ((h >> 8) % 20 - 10) / 60;
      const rate = 0.92 + ((h >> 4) % 10) / 45 - (age > 55 ? 0.1 : 0);
      let pool;
      if (purpose === 'own') pool = this.ownPool && this.ownPool.length ? this.ownPool : this.anyVoices;
      else pool = this.huNatural && this.huNatural.length ? this.huNatural : this.huVoices.length ? this.huVoices : this.anyVoices;
      // ha van női/férfi név a hangban, a nem szerint válogat; különben a hangmagasság adja a különbséget
      const fem = /no[eé]mi|zsuzsa|szabina|female|woman|nő|zira|eva|anna|laura|elsa|maria|sofia|mia|eda|emel|noora|paulina|alina|elena|zofia|vlasta/i, masc = /szabolcs|tam[aá]s|male|man|férfi|david|mark|george|diego|luca|giorgio|harri|ahmet|emre|marek|antonin|emil/i;
      const gp = pool.filter((v) => (a.sex === 'f' ? fem : masc).test(v.name)); const use = gp.length ? gp : pool;
      const voice = use.length ? use[h % use.length] : null;
      return { pitch: Math.max(0.5, Math.min(1.8, pitch)), rate: Math.max(0.6, Math.min(1.4, rate)), voice, lang: voice ? voice.lang : 'hu-HU' };
    },
    speak(text, o) {
      if (!this.ttsSupported || !this.speakOn || !text) return false; o = o || {};
      if (!o.priority && (speechSynthesis.pending || speechSynthesis.speaking)) return false; // a háttérbeszéd nem torlódik
      if (!o.priority && Date.now() - this.lastSpokeMs < (o.minGapMs || 2500)) return false;
      const u = new SpeechSynthesisUtterance(text); u.lang = o.voice ? o.voice.lang : (o.lang || 'hu-HU'); u.pitch = o.pitch ?? 1; u.rate = o.rate ?? 1; u.volume = o.volume ?? 0.9; if (o.voice) u.voice = o.voice;
      this.lastSpokeMs = Date.now(); try { speechSynthesis.speak(u); } catch (e) { return false; } return true;
    },
    /** Az emberek egymás közti szavai — a saját nyelvükön, ahogy hangzik. */
    speakUtterance(world, utt) {
      const a = world.agents.get(utt.a); if (!a || !utt.w.length) return false; const v = this.voiceFor(world, a, 'own');
      const fl = utt.f == null ? 0.3 : utt.f; const words = utt.w.map((x) => x[1]);
      if (utt.p && words.length >= 3) words.splice(1, 0, utt.p);
      // kezdetben akadozva, szavanként; gyakorlattal folyékonyan, dallammal (a mondat vége lejjebb)
      if (fl < 0.35) { if (!this.speak(words.join('. '), { ...v, rate: v.rate * 0.72, volume: 0.6, minGapMs: 3500 })) return false; return true; }
      const rate = v.rate * (0.85 + fl * 0.25);
      if (words.length >= 3 && fl > 0.6) { const head = words.slice(0, -1).join(' '), tail = words[words.length - 1]; if (!this.speak(head, { ...v, rate, volume: 0.65, minGapMs: 3500 })) return false; this.speak(tail, { ...v, rate, pitch: v.pitch * 0.9, volume: 0.65, priority: true }); return true; }
      return this.speak(words.join(fl < 0.6 ? ', ' : ' '), { ...v, rate, volume: 0.65, minGapMs: 3500 });
    },
    speakReply(world, a, text) { const v = this.voiceFor(world, a, 'hu'); const fl = LW.Speech.fluency(world, a); return this.speak(text, { ...v, rate: v.rate * (0.9 + fl * 0.15), priority: true }); },
    /** Elérhető hangok listája (a menünek). */
    describeVoices() { if (!this.ttsSupported) return 'Ebben a böngészőben nincs beszédszintézis.'; if (!this.voicesLoaded) this.loadVoices(); const hu = this.huVoices.map((v) => v.name).join(', '); return `${this.anyVoices.length} hang; magyar: ${hu || 'nincs'}${this.huNatural && this.huNatural.length ? '' : ' — természetes magyar hang (pl. „Microsoft Noémi/Tamás Online (Natural)”) az Edge böngészőben van'}.`; },
    /** A Teremtő szava mikrofonon: magyar beszédfelismerés; a végső szöveget adja vissza. */
    listen(onInterim, onFinal, onError) {
      const R = window.SpeechRecognition || window.webkitSpeechRecognition; if (!R) { onError && onError('Ebben a böngészőben nincs beszédfelismerés (Chrome-ban van).'); return null; }
      if (this.rec) { try { this.rec.stop(); } catch (e) { /* ignore */ } }
      const rec = new R(); rec.lang = 'hu-HU'; rec.interimResults = true; rec.continuous = false; rec.maxAlternatives = 1; this.rec = rec; this.listening = true;
      let finalText = '';
      rec.onresult = (ev) => { let interim = ''; for (let i = ev.resultIndex; i < ev.results.length; i++) { const r = ev.results[i]; if (r.isFinal) finalText += r[0].transcript; else interim += r[0].transcript; } if (interim && onInterim) onInterim(finalText + interim); };
      rec.onerror = (ev) => { this.listening = false; if (onError) onError(ev.error === 'not-allowed' ? 'A mikrofon használatát nem engedélyezted.' : ev.error === 'no-speech' ? 'Nem hallottam semmit.' : ev.error === 'network' ? 'A felismeréshez internet kell.' : 'Beszédfelismerési hiba: ' + ev.error); };
      rec.onend = () => { this.listening = false; this.rec = null; if (finalText.trim() && onFinal) onFinal(finalText.trim()); };
      try { rec.start(); } catch (e) { this.listening = false; onError && onError(String(e.message || e)); return null; }
      return () => { try { rec.stop(); } catch (e) { /* ignore */ } };
    },
    stopListening() { if (this.rec) { try { this.rec.stop(); } catch (e) { /* ignore */ } } },
  };
  LW.Voice = Voice;
})(globalThis.LW || (globalThis.LW = {}));
