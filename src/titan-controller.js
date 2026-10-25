/* Titan Controller API 1 — browser + Node, no dependencies. */
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.TitanController = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';
  class InputState {
    constructor({ deadzone = 0.12 } = {}) {
      if (!Number.isFinite(deadzone) || deadzone < 0 || deadzone >= 1) throw new Error('deadzone must be 0 <= n < 1');
      this.deadzone = deadzone;
      this.keys = new Set();
      this.pointers = new Map();
    }
    key(code, pressed) { pressed ? this.keys.add(code) : this.keys.delete(code); }
    axis(id, x, y) {
      if (!Number.isFinite(x) || !Number.isFinite(y)) throw new Error('axis must be finite');
      const magnitude = Math.hypot(x, y);
      if (magnitude <= this.deadzone) { x = 0; y = 0; }
      else { const scale = Math.min(1, (magnitude - this.deadzone) / (1 - this.deadzone)) / magnitude; x *= scale; y *= scale; }
      this.pointers.set(id, { x, y });
    }
    action(id, name) { this.pointers.set(id, { action: name }); }
    release(id) { this.pointers.delete(id); }
    reset() { this.keys.clear(); this.pointers.clear(); }
    read() {
      const k = this.keys;
      let x = Number(k.has('ArrowRight') || k.has('KeyD')) - Number(k.has('ArrowLeft') || k.has('KeyA'));
      let y = Number(k.has('ArrowDown') || k.has('KeyS')) - Number(k.has('ArrowUp') || k.has('KeyW'));
      const actions = Object.create(null);
      if (k.has('Space')) actions.jump = true;
      if (k.has('KeyE')) actions.act = true;
      for (const p of this.pointers.values()) {
        if (p.action) actions[p.action] = true;
        else { x += p.x; y += p.y; }
      }
      const magnitude = Math.hypot(x, y);
      if (magnitude > 1) { x /= magnitude; y /= magnitude; }
      return { x, y, actions };
    }
  }
  function mount({ container, actions = { jump: 'ジャンプ', act: 'アクション' }, deadzone = 0.12 } = {}) {
    const doc = container ? container.ownerDocument : document;
    const win = doc.defaultView;
    container = container || doc.body;
    const state = new InputState({ deadzone });
    const cleanup = [];
    function listen(target, event, handler, options) {
      target.addEventListener(event, handler, options);
      cleanup.push(() => target.removeEventListener(event, handler, options));
    }
    const host = doc.createElement('div');
    host.dataset.titanControls = '1';
    host.style.cssText = 'position:fixed;inset:0;pointer-events:none;z-index:1000;user-select:none;-webkit-user-select:none;';
    const pad = doc.createElement('div');
    pad.setAttribute('role', 'group');
    pad.setAttribute('aria-label', '移動コントローラー。キーボードの矢印・WASDにも対応');
    pad.dataset.titanPad = '1';
    pad.dataset.dpad = '1';
    pad.style.cssText = 'position:absolute;left:max(20px,env(safe-area-inset-left));bottom:max(20px,env(safe-area-inset-bottom));width:116px;height:116px;border-radius:50%;background:#142530bb;border:2px solid #adc7d8aa;pointer-events:auto;touch-action:none;';
    const knob = doc.createElement('div');
    knob.style.cssText = 'position:absolute;width:44px;height:44px;left:34px;top:34px;border-radius:50%;background:#c5e9d9;pointer-events:none;';
    pad.appendChild(knob);
    host.appendChild(pad);
    const buttons = doc.createElement('div');
    buttons.style.cssText = 'position:absolute;right:max(20px,env(safe-area-inset-right));bottom:max(28px,env(safe-area-inset-bottom));display:flex;gap:12px;';
    host.appendChild(buttons);
    container.appendChild(host);
    let joystickPointer = null;
    let padBounds = null; // Local layout cache: no layout read per pointermove.
    const center = () => { knob.style.transform = ''; };
    function move(e) {
      const r = padBounds || pad.getBoundingClientRect();
      const radius = r.width / 2;
      const x = (e.clientX - r.left - radius) / radius;
      const y = (e.clientY - r.top - radius) / radius;
      state.axis(e.pointerId, x, y);
      const scale = 34 / Math.max(1, Math.hypot(x, y));
      knob.style.transform = `translate(${x * scale}px,${y * scale}px)`;
    }
    listen(pad, 'pointerdown', e => {
      if (joystickPointer !== null || (e.pointerType === 'mouse' && e.button !== 0)) return;
      e.preventDefault(); joystickPointer = e.pointerId; padBounds = pad.getBoundingClientRect();
      if (pad.setPointerCapture) pad.setPointerCapture(e.pointerId);
      move(e);
    });
    listen(pad, 'pointermove', e => { if (e.pointerId === joystickPointer) { e.preventDefault(); move(e); } });
    for (const [name, label] of Object.entries(actions)) {
      const button = doc.createElement('button');
      button.type = 'button'; button.textContent = label; button.dataset.titanAction = name;
      button.style.cssText = 'min-width:70px;min-height:70px;padding:12px;border-radius:50%;border:2px solid #d4dfec;background:#193850e8;color:white;font:bold 13px sans-serif;pointer-events:auto;touch-action:none;';
      listen(button, 'pointerdown', e => {
        if (e.pointerType === 'mouse' && e.button !== 0) return;
        e.preventDefault(); state.action(e.pointerId, name);
        if (button.setPointerCapture) button.setPointerCapture(e.pointerId);
      });
      buttons.appendChild(button);
    }
    function release(e) {
      state.release(e.pointerId);
      if (e.pointerId === joystickPointer) { joystickPointer = null; padBounds = null; center(); }
    }
    for (const event of ['pointerup', 'pointercancel', 'lostpointercapture']) listen(win, event, release, true);
    const codes = new Set(['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'KeyW', 'KeyA', 'KeyS', 'KeyD', 'Space', 'KeyE']);
    const editable = target => target && (target.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName));
    listen(win, 'keydown', e => { if (codes.has(e.code) && !editable(e.target) && !e.metaKey && !e.ctrlKey && !e.altKey) { e.preventDefault(); state.key(e.code, true); } });
    listen(win, 'keyup', e => { if (codes.has(e.code)) state.key(e.code, false); });
    function reset() { state.reset(); joystickPointer = null; padBounds = null; center(); }
    listen(win, 'resize', () => { padBounds = joystickPointer === null ? null : pad.getBoundingClientRect(); });
    listen(win, 'blur', reset);
    listen(doc, 'visibilitychange', () => { if (doc.hidden) reset(); });
    return { state, read: () => state.read(), reset, destroy() { cleanup.forEach(fn => fn()); reset(); host.remove(); } };
  }
  return { API_VERSION: 1, InputState, mount };
});
