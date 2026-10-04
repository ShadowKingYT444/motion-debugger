# FIELD — a from-scratch scroll site that has to stay coherent

**Status: proposed build brief and evaluation plan, not an implemented demo.** No agent campaign, paid run, rendering result, or superiority claim is created by this document. Keep the existing studies intact. This replaces ASSEMBLY as the proposed launch showcase, not as a unit-test fixture.

## The concept

Build **FIELD**, a fictional spatial-audio headphone launch site. Its main line is **“Sound has a shape.”** The visitor follows one amber signal through typography, a sculptural product, its internal driver, three listening environments, and an interactive sound-shaping surface. The final configuration reflects what the visitor chose along the way.

This must be a finished editorial website, not a metrics dashboard or an animation-test UI. Use a restrained ink/ivory/amber palette, large readable type, deliberate lighting, and enough quiet space for each motion to be understood. The hero must look composed without relying on movement to hide a weak design. No borrowed brand artwork or unsupported real-product claims. Do not autoplay audio.

Both agents start from a blank application scaffold and the same checked asset kit. They write the page, scene, interactions, styles, and motion themselves. There is no prebuilt configurator, planted defect, hidden finished implementation, or parent-written repair. The shared brief fixes the experience and content, not every curve, layout, or implementation.

## Six linked scenes, not six unrelated entrance animations

| Scene | What the visitor sees | The consistency problem |
| --- | --- | --- |
| 1. Reveal | A small amber signal passes through a large typographic mask. The letter opening becomes a window onto the lit headphone sculpture. | The signal stays identifiable through the mask; type remains readable. Loading cannot flash an unfinished pose. |
| 2. Enter the product | Scroll carries the same product into a close inspection. Earcup, cushion, driver, and housing separate while the camera turns. Labels attach to the selected parts. | Parts retain identity. Scroll reversal reconstructs the same product rather than replaying an entrance. Labels follow projected anchors. |
| 3. Enter the sound | The driver aperture expands into a full-screen field of layered wave surfaces. The amber signal travels through it as the product recedes. | The change of scale, camera, and scene must read as one transition. No blank frame or duplicated signal at the handoff. |
| 4. Move through listening worlds | Vertical scrolling drives a horizontal editorial sequence: city, studio, open landscape. Foreground cutouts, background planes, wave surfaces, and oversized type move at different depths. A listening-mode choice remains usable while moving. | Mode selection and scroll are independent inputs. Fast reversal or skipping a chapter cannot reset the choice or leave the wrong world visible. |
| 5. Shape the sound | The same signal exits the spatial scene and becomes the playhead on an SVG waveform/EQ surface. Visitors drag three clearly labeled controls. Optional sound requires a click. | WebGL-to-SVG continuity, screen-space alignment, pointer capture, and responsive layout must agree. A drag cannot be overwritten by a stale scroll callback. |
| 6. Take it with you | Scroll returns the signal to the product. The headphone reassembles and docks into a final configuration card. A real JSON export records mode, color, and EQ. | Selected state survives the journey in both directions. The small final product is the same configured product, not a new unrelated hero. |

The signature sequence is **product → driver → listening world → waveform**, with a deliberate reversal while the signal is halfway between scenes. That is the first clip to review. More particles do not compensate for a broken handoff.

The desktop page should occupy roughly seven to nine viewport heights, with a complete 45–60 second demonstration route. These are proposed scope limits, not a required reading speed. Mobile can shorten pinning and depth effects while retaining all content, choices, and the main correspondence. Reduced motion uses readable static chapter states and working controls, not a blank canvas.

## Shared prompt for both from-scratch builders

> Build FIELD, a complete fictional spatial-audio headphone launch website, from the provided blank scaffold. Use the common local assets and content. The creative line is “Sound has a shape.” This is a polished editorial product site, not a dashboard or an animation playground.
>
> Make scrolling carry one recognizable amber signal through six linked scenes: a typographic product reveal; a rotating exploded headphone view with labels; a driver aperture that expands into a wave environment; a horizontal three-world listening story driven by vertical scroll; a handoff from the spatial signal into a usable SVG sound-shaping surface; and a reassembled product docking into the final configuration card.
>
> Build the appearance and implementation yourself. Use clear composition, readable typography, convincing depth, and a restrained ink/ivory/amber direction. Do not fill the page with repeated fade-ups, generic particle clouds, or unnecessary cards. The motion should explain how the scenes connect. Keep enough stillness to read.
>
> Scrolling backward, stopping midway, jumping chapters, changing listening mode during a transition, and resizing must preserve meaningful state. The latest intentional user input wins. The waveform controls and final JSON export must work. The exported configuration must contain the visitor's actual choices. Keep keyboard access, usable mobile layouts, reduced-motion content, and a WebGL-unavailable fallback. Do not autoplay audio or add fake commerce.
>
> Use your ordinary coding, browser, and documentation tools. Inspect the real page at desktop and mobile sizes. Record the full journey with an interruption, retain failures, and refine it within the stated total budget. Do not remove difficult scenes just to pass tests, fabricate evidence, change the benchmark protocol, or continue past the deadline. Deliver source, a working local preview, recordings, actual configuration exports, and remaining limitations.

The assisted arm receives one additional instruction: **“Load the installed `motion-debugger` skill and use its applicable authoring and evidence tools.”** Both arms receive the same creative brief, asset access, deadline, and functional expectations. Do not give only the assisted agent a bespoke finished scene implementation or post-hoc hints about the ordinary agent's failures.

## Get the agent to build a website, not spend the run filling out contracts

Use a proposed **60-minute cap per arm**, subject to owner approval before execution. Reserve approximately six minutes for art direction/storyboarding, thirty-four for construction, fourteen for browser-led refinement, and six for final evidence/freeze. If this scope cannot fit, reduce both arms' scope before generation, not after seeing which one struggles. Report actual time and tool costs. Do not silently extend the assisted arm.

The builder first produces a compact shot plan: each chapter's main composition, the persistent objects, the transformation into the next chapter, and its reverse behavior. Then it completes a rough end-to-end page before polishing one expensive hero. Preserve checkpoints before each refinement. A broken cross-section journey must not be hidden behind one polished screenshot.

For the assisted workflow, create focused transition plans for the three risky handoffs, not a contract for every letter. Bind the signal, selected product part, and label/overlay where relevant. After repairing the audit findings, review the whole path and selected interruption windows with `motion_review` and `motion_probe`. Use the returned evidence to make an actual bounded source change or to leave a correct transition alone. Tool count is not the success measure.

Keep a genuinely useful **before/after pair from within the assisted build**: same page, same art, same interaction, before and after an evidence-led refinement. This makes the mechanism visible even when the two from-scratch agents choose different layouts. If no real defect or useful refinement occurs, do not manufacture one. Retain the working result and say what the tool actually verified.

## Implementation guidance to test, not a claim of new plugin capability

Prefer a single owner for each animated property. Maintain separate state for scroll progress, selected configuration, and temporary gesture input. Derive each scene from those inputs. Do not let a scroll callback, hover tween, and resize handler independently overwrite the same transform. Separate the base scroll pose from a composed interaction offset and from optional idle motion.

Scene evaluation must work when the visitor lands halfway down the page. Avoid a chain that only initializes correctly after every `onEnter` callback has run. Reverse scroll must select the correct state from progress; it must not replay a sequence from its initial pose. Allow deliberate damping while input is changing, then compare equivalent settled states. Do not demand identical instantaneous poses from two systems with different histories while their springs are still active.

Keep the selected signal's logical identity stable across renderers. At a WebGL/SVG handoff, use the actual camera and current CSS viewport to map the outgoing anchor to the incoming one. Define overlap/ownership explicitly so only one visible signal owns the interaction. A projected point is an annotation, not proof that its pixels were visible. Inspect the actual transition in the native recording.

Use established animation libraries rather than building a new scroll engine. ScrollTrigger supports scrubbed timelines, pinning, horizontal sequences, and reverse callbacks. Its documentation warns against animating the pin wrapper and explains the limits of nested pinning and horizontal `containerAnimation`. Recompute layout after relevant asset/font changes, and render from the animated timeline when numeric scrub continues after the input stops. These are implementation capabilities, not evidence that a page is good. [S1]

Scope responsive timelines and clean them up before rebuilding them. GSAP's `matchMedia` provides media-condition contexts and reversion, including reduced-motion branches. Use that to avoid leaving duplicate effects after a breakpoint change; verify cleanup in the actual app. [S2]

Use bounded geometry and textures, capped device-pixel ratio, and instancing where it actually helps. Prefer one shared WebGL renderer over a new context for every chapter. Stop decorative rendering when the page is hidden, and keep ordinary HTML text and controls usable when graphics fail. Record device/browser identities. Do not call software-runner cadence physical-device smoothness.

## A longer page needs a longer observation path

The [current recipe schema](https://github.com/ShadowKingYT444/motion-debugger/blob/fde065cdea0aecb4631e9106b48e0b53e327a8df/packages/core/safety.ts) caps a capture at 12 seconds and 16 actions. The [probe](https://github.com/ShadowKingYT444/motion-debugger/blob/fde065cdea0aecb4631e9106b48e0b53e327a8df/packages/core/replay.ts) uses fresh contexts. Do not pretend one such capture validates this entire page.

Record the complete 45–60 second stateful journey in one ordinary browser context. Use bounded tool captures for explicit local handoffs, with reproducible setup and persisted source/recipe identities. Those isolated captures cannot establish state continuity across the whole page. Validate that separately in the full native journey. A future session-aware review needs bounded windows on a shared local context and per-beat input epochs; it is a separate implementation task, not an existing API to invent in the prompt.

Static screenshot assertions also require care: Playwright's `toHaveScreenshot` disables animations by default. Use them for selected composition states, not as proof of normal-time motion. Native input, temporal observations, and an uninterrupted recording remain separate evidence. [S3]

## Independent acceptance and comparison

Freeze the brief, kit, runtime, model/settings, budgets, and primary journey before generation. The ordinary arm keeps normal browser access and current public animation documentation/skills available to its host. Do not handicap it to manufacture a win. Evaluate hosts separately; do not compare a different model or a different time budget and call the difference a plugin effect.

The first pilot is one matched pair, not the old eighteen-session campaign. It is a launch-example candidate, not proof of general superiority. Repeat independently before making broad comparative claims. An attractive selected example establishes capability, not causality.

The verifier checks these stateful scenarios without editing candidate source:

| Check | Required observation |
| --- | --- |
| Reverse during the driver/world and world/waveform handoffs | Signal remains identifiable; no reset to the hero, orphan label, blank handoff, or wrong final scene. |
| Move directly from the lower page to an earlier chapter | Correct scene after settling without needing to visit every preceding chapter. |
| Change listening mode while scrolling, then reverse | The final card and export retain the latest selected mode. |
| Drag an EQ control, scroll near the renderer handoff, and cancel the pointer | Control state remains correct; capture is released; scrolling and keyboard input still work. |
| Resize or reflow at an intermediate scene | Anchors remain attached and content readable; no duplicated timeline or lost selection. |
| Reload/restore at a middle scroll position | The scene initializes from actual page position; no mandatory restart at the hero. |
| Toggle reduced motion and hide/restore the page | Meaningful content, selection, controls, and export survive. Decorative loops do not multiply. |
| Export and revisit | JSON contains the selected mode, color, and edited EQ, not fixed demonstration values. |

Use native input; preserve requested and actual timestamps. Distinguish direct scrubbing from continuity-preserving retargeting. A fast intentional jump is not automatically a defect. Judge screen-space handoffs with fixed predeclared tolerances and native observations; do not loosen them after a failure. App-declared IDs and poses are supporting evidence, not an independent visibility or taste grade.

For the from-scratch comparison, use anonymous normal-speed clips at matched semantic chapter milestones. Different layouts may require different scroll distances; do not imply that simultaneous video start means identical timeline position. Report functional failures, content/design regressions, human preference, and reviewer cost separately. A useful tracking question is “Which moving object became the waveform playhead?” Let viewers answer after an unlabelled clip. That small test is supplementary, not a universal quality score.

## README delivery: show the experience first, then the evidence

Once it exists and is verified, place a compact **12–18 second native teaser** near the top of the README. Lead with the product/driver/world handoff, show one real scroll reversal, then end on the waveform and configured product. Use original playback speed and visible input cues. A motion graphic, generated mockup, or camera move added in post is not evidence of the running app.

Link a clear poster or lightweight animated preview to the complete native recording and live/source instructions. An animated preview is only a teaser; do not use its frame rate to make a performance claim. Keep the full film at its recorded resolution and speed. Check actual rendering in the repository's README before choosing the embedding format. Do not add broken placeholder media links now.

Below the teaser, show the matched from-scratch builds and, when available, the **same-design refinement pair** from the assisted run. Put the relevant input window, observed defect, source diff, and verified result beside that pair. State that it is a within-build repair example, not the ordinary-versus-assisted benchmark. Retain the unsuccessful attempts and any ordinary wins in the study record.

A proposed caption, only after evidence supports it:

> **One signal. Six scenes. Reverse anywhere.** Built from scratch with a coding agent; Motion Debugger helped inspect and refine the handoffs. Full journey, source changes, and comparison below.

Do not add “beats Codex” or “better than Claude Code” on the strength of one attractive film. The immediate message should be that the product helps build and check a coherent motion experience. Comparative claims require the comparison to earn them.

## Primary sources checked 4 October 2026

[S1] [GSAP ScrollTrigger documentation](https://gsap.com/docs/v3/Plugins/ScrollTrigger/): scrubbed timelines, pin ownership, reverse callbacks, refresh, and horizontal-container limits.

[S2] [GSAP matchMedia documentation](https://gsap.com/docs/v3/GSAP/gsap.matchMedia()/): responsive conditions, cleanup/reversion, and reduced-motion setups.

[S3] [Playwright PageAssertions](https://playwright.dev/docs/api/class-pageassertions#page-assertions-to-have-screenshot-1-option-animations): screenshot animation handling. These sources support implementation choices and test limits, not a prediction that FIELD or the plugin will outperform an ordinary build.
