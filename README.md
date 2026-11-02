# Only my eyes — for Aditi

**Live:** https://shauryaojaswa.github.io/eye-and-gold/

A phone-first, single-tap apology site that combines two ideas:

1. **Her Eye** — a real GLSL iris on black. It follows her finger (and the
   gyroscope when she tilts the phone), blinks when she taps, and each tear
   turns into a small light on the way down. Then the camera pushes into the
   pupil, through a tunnel of drifting light.
2. **Kintsugi** — at the end of the tunnel a glass heart falls, shatters in
   slow motion, drifts, then pulls back together with glowing gold seams. The
   break becomes the brightest part.

Then the gold blooms into the gift: **tulips and chocolate, on their way to her
door.**

No forgiveness is asked for. No guilt, no love-bombing — just the anger
acknowledged and a gift with no strings.

## Before you send it

Open `main.js` and set the delivery date:

```js
var CFG = {
  arrival: "Saturday, 7 November"   // when the tulips + chocolate reach her door
};
```

That string is the only thing that needs to change when you place the order.

## Run locally

```bash
python -m http.server 4173 --directory eye-and-gold
```

Open `http://localhost:4173/`.

## Structure

| file | role |
| --- | --- |
| `index.html` | acts 1–3 (the cinematic) and act 4 (the gift) |
| `eye.js` | the WebGL iris: aperture, fibers, limbal ring, catchlights, pupil dive |
| `main.js` | choreography, tear/tunnel particles, kintsugi shatter, gift reveal |
| `styles.css` | phone-first styling, reduced-motion and no-JS fallbacks |

## Accessibility & fallbacks

- **`prefers-reduced-motion`** → no animation at all: the eye renders one
  static frame, every line is visible, the heart is already mended in gold, and
  the gift sits at the bottom of a normal scrolling page.
- **No JavaScript** → a readable static summary plus the full gift section.
- Keyboard: a skip link jumps straight to the gift; every control is a real
  `<button>`.
- WebGL unavailable → the copy, heart and gift still play; only the iris is
  lost.

## Notes

- Zero dependencies, no build step, no backend. GSAP and three.js were
  considered and deliberately not used — everything here is plain JS, CSS
  transitions, one WebGL fragment shader and one 2D canvas.
- The iris detail is branched per-pixel (`if (t < 1.04)`) and DPR is capped at
  1.75 on phones so it holds 60fps on a mid-range Android.
- The shatter geometry is a seeded jittered grid clipped to the heart path, so
  the cracks are identical on every load and shards stay perfectly rigid as
  they fly.

Made for Aditi only.
