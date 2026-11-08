# Rehearsal: report to care task

Gold: Stageshow's Share example for the window, panel, and cursor. The Mews version uses the app's brand, shared controls, and care-task flow. The wide view crops the window at the bottom; the compact view uses a 358 px design.

Beats: open a report, create a task, choose Alex, save the task, finish the report, and show the open task in My Tasks. The animation plays once and leaves the result visible. Replay has an explicit control. Reduced motion uses the result as a still.

Captured: a wide loop and a 390 px loop, a 390 px sheet of the marked states, and reduced-motion stills at 390 px and in the dark theme. The full light-theme loops and the state sheet were captured before the last list-transition change. A close-up of the My Tasks transition and a dark still were captured after the relevant fixes.

Gate: the loop and state captures printed `rehearsal passed`, but the reports returned **inconclusive** because the frame sampler missed intervals under system load. The wide loop had 9 gaps (largest 48.1 ms); the 390 px loop had 14 (largest 50.1 ms); the 390 px state sheet had 14 (largest 40.1 ms). A separate 12-second scan after the color change also had 6 gaps (largest 56.9 ms). The final My Tasks close-up had 19 gaps (largest 58.7 ms). Do not treat these as a complete motion pass.

Film observations: the browser URL and Mews wordmark have separate insets, as do the list heading and its rows. The scanner calls both `clipped: near aligned`; the captured frames show that neither is clipped. An earlier compact capture showed overlapping review and form text. Both now use one surface with separate exits and entrances. A dark-theme capture showed unreadable text. The stage now uses Mews foreground, surface, and ink tokens; the final dark still and contrast checks show readable text. A close-up showed overlapping page labels during the My Tasks handoff and the scan reported a jump in the exiting list. The labels now fade in place and the list no longer moves vertically. The final close-up did not report a jump, but its coverage was still inconclusive.

Review: the builder compared the wide and compact state sheets with the Share gold and reviewed the result, menu, review, and task frames. The Mews panel has more product text than the gold because the report and its assigned action are the subject. No independent fresh-eye review has been done.

Checks: the Storybook playback tests cover stop, replay, reduced motion, task outcome, compact width, and text contrast in the light and dark Mews themes. Type checking and the Storybook build ran in a clean snapshot. Re-run the full motion gate when the machine has enough free capacity to capture without gaps.

Not checked: a physical phone, real touch and safe-area behavior, every transition at 40–80 ms, and the motion in the missed sampling intervals.
