# Rehearsal: classic report form

Gold: Stageshow Form error. The actual Mews PublicReportForm is used inside the kit Window and Phone. The illustration uses fictional text and a 1.8-second sending state. It sends no network request.

Beats: review the filled form, press Send report, wait with the shared loading button, then receive confirmation in the same card. The result is the reduced-motion poster.

The first capture exposed a shrinking success panel when the form was inside a scaled phone. Measuring CSS layout height with offsetHeight fixed that. It also exposed the abrupt form-to-success swap; the shared ContentSwap now crossfades the two task states for 140 ms and keeps inactive controls inert. Reduced motion switches immediately.

Real browser checks defer the network response and measure the card before, during, and after submission. They also test a failed submission, preserved text, a stable send-button position, a successful retry using the same idempotency key, and the cleared form after Start again. Light and dark themes pass. Capture sampling gaps are recorded separately and do not prove every motion frame.

Not checked: a physical phone or an independent human review.

Final shared-button pass: the label and the paw now crossfade in a fixed-size control. Phone captures reached `rehearsal passed`; the recorder still reported sampling gaps and an initial font swap, so complete frame coverage remains unproven. The form capture used a temporary copy of the Stageshow scanner with CSS.escape applied to Tailwind class selectors; the installed skill was unchanged.
