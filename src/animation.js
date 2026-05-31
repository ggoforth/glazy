// src/animation.js
// Pure motion math, decoupled from rAF so it is unit-testable.
// `step(t, lean)` mutates the donut/spinner transforms for frame time `t`,
// where `lean` is the eased pointer position in [-1, 1].
export function createMotionDriver({ donut, spinner, motion }) {
  const m = motion;
  return {
    step(t, lean) {
      // Absolute-time assignment (like wobble/bob below) → constant angular
      // velocity. Using += here would accelerate, since the loop feeds an
      // ever-growing accumulated `t`.
      if (m.spin.enabled) spinner.rotation.y = t * (m.spin.speed / 0.004) * m.spin.direction;
      const wob = m.wobble;
      const leanX = m.lean.enabled ? lean.y * m.lean.strength : 0;
      const leanZ = m.lean.enabled ? lean.x * m.lean.strength : 0;
      donut.rotation.x = (wob.enabled ? Math.sin(t * wob.speed) * wob.amplitude : 0) + leanX;
      donut.rotation.z = (wob.enabled ? Math.sin(t * (wob.speed - 0.2)) * (wob.amplitude * 0.8) : 0) - leanZ;
      donut.position.y = m.bob.enabled ? Math.sin(t * m.bob.speed) * m.bob.amplitude : 0;
    },
    renderStatic() {
      spinner.rotation.y = 0;
      donut.rotation.x = 0; donut.rotation.z = 0; donut.position.y = 0;
    },
  };
}
