# Safari WebGPU: first frame stays blank until a resize triggers swapchain

## Summary
On Safari (WebKit), `@cazala/party` running with WebGPU can **simulate correctly** (FPS ~60, particles updating) but the canvas remains **blank until the user resizes** the viewport (even by 1px). After any resize, rendering starts immediately.

This is reproducible with the `demo6` session (large particle count) and manifests as a **swapchain/present initialization quirk**: the first `getCurrentTexture()`/present path appears “stuck” until the canvas size changes.

## Observed behavior
- App initializes engine successfully (`engine.initialize()` resolves).
- `engine.play()` runs (FPS updates, particle count is correct).
- Canvas is blank.
- As soon as the viewport height changes (e.g. `857 → 856`), rendering begins.
- When rendering begins, it appears at the *current simulation time* (so the sim was running the whole time).

## Expected behavior
Rendering should start immediately after `engine.play()` without requiring any resize.

## Minimal workaround in app code (what we used to unblock)
After starting WebGPU on Safari, do a one-time **1px canvas size jiggle**:

1. `engine.setSize(w, h - 1)`
2. wait one animation frame
3. `engine.setSize(w, h)`
4. wait one animation frame

This simulates the “real resize” Safari needs to start presenting.

## Why this should be fixed in `@cazala/party` instead
Applications should not need UA-specific “swapchain warmup” hacks.
The library already contains Safari-specific handling in `GPUResources` (see comments around ensuring the canvas is visible and sized), so it’s reasonable to encapsulate this present warmup in the core runtime.

## Proposed core fix (recommended)
Add a one-time “swapchain warmup” inside the WebGPU runtime, executed once after context configuration / before first present, **only on Safari**:

### Option A (preferred): warmup by canvas size jiggle inside the WebGPU engine
In `WebGPUEngine.initialize()` (or immediately after resources init), do:

- Determine the current device-pixel size (the engine already has `view.getSize()` and writes `resources.canvas.width/height`).
- If height > 1:
  - call `this.setSize(width, height - 1)`
  - then `this.setSize(width, height)`

If `initialize()` is not `async` enough to await frames, schedule it to happen on the first `requestAnimationFrame` tick before calling `present()`.

### Option B: do it at the WebGPU context layer
In `GPUResources.initialize()` right after `this.context.configure(...)`:

- If Safari and canvas height > 1:
  - `this.canvas.height = this.canvas.height - 1`
  - `this.canvas.height = this.canvas.height + 1`

This forces Safari to re-bind the swapchain to a “changed” canvas.

## Notes / rationale
- The simulation is running even when the canvas is blank, so this is not a simulation init issue.
- The fact that a 1px resize immediately fixes rendering points to swapchain configuration/present, not particle state.
- The library already has Safari-specific comments and defaults around canvas sizing, indicating known WebKit quirks.

## Repro checklist (for validating the core fix)
- Safari (macOS + iOS), WebGPU enabled.
- Load `demo6` (or any large particle config).
- Verify the first frame renders without user resize.
- Verify no regressions in Chrome/Edge/Firefox (WebGPU) and CPU fallback.

