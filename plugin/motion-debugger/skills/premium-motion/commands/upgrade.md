# upgrade: vibe-coded to premium

The full pipeline. It works on any stack: plain HTML, React, Next.js, Vue, Svelte. Expect to rebuild most of the visual layer. Adding effects to a generic layout gives you a generic layout that moves.

## 0. Baseline: record what exists

1. Get the page running: a folder or file, or the dev server (`npm run dev`, then use its `localhost` URL).
2. Record it before you touch anything, into its own folder so it stays as the "before":

   ```bash
   motion-debugger critique <url-or-folder> --out .motion-critique/baseline
   ```

3. Open every image. Write a **tell list** in your notes: each trait of the two defaults (SKILL.md §Two defaults) the page shows, each critic finding, and what the first viewport actually is (a layout, or a scene?).

## 1. Inventory: what is true, what is generic

Make two lists before deciding anything:

- **Keep:** the product name, facts, numbers, real claims, the purpose of each section, every CTA and link, forms and their behaviour, and anything the user pinned or already owns: logo, brand colours, chosen fonts, photos, screenshots.
- **Replace:** the generic visual world. Default type, the palette, decorative gradients and glows, icon-card grids, placeholder visuals, uniform fade-ups, filler sections.

Then plan the content: which sections earn their place, which merge (three feature grids usually become one strong section and one demonstration), and what each must make the visitor understand. Do not invent facts or testimonials; label any illustrative figure as illustrative.

## 2. Direction

Run `direction` (commands/direction.md) and write `PREMIUM.md`. When upgrading, the direction may keep brand anchors, but the world must move far enough from both defaults that the before and after could not be mistaken for the same template.

## 3. The first viewport, alone

Build the hero first and get it right before touching anything else. It decides whether the page reads as premium.

1. `typeset`, then `palette`, then `imagery` for the hero visual (commands/typeset.md, palette.md, imagery.md).
2. Compose it as a scene: a dominant visual with depth, type set into it, the nav present, one primary action.
3. Choreograph its entrance and its exit (`motion`, hero section only).
4. Critique the hero quickly and look at `desktop-entrance.png` and the first detail frame:

   ```bash
   motion-debugger critique <target> --desktop-only
   ```

   Ask: would a design director stop scrolling here? If it could still be either default, change the visual or the type, not the spacing.

## 4. Rebuild the page, section by section

For each section from your content plan: `compose` it (commands/compose.md) with a layout unlike its neighbours, give it a real visual from `imagery`, and set its reveal by content type (`motion`). Delete leftover generic CSS as you go so old and new styles never mix.

## 5. The signature scene

Run `signature` (commands/signature.md) on the section that best explains the product. It is the moment people remember. At most two supporting scroll scenes elsewhere, each a different kind.

## 6. Finish

Run `polish` (commands/polish.md), then `harden` (commands/harden.md). Check that every link, form and interactive function from the Keep list still works.

## 7. Verify against the baseline

```bash
motion-debugger critique <url-or-folder>
```

Open the new images and the baseline images side by side: `desktop-scroll.png`, `desktop-detail-1.png` and `mobile.png`. For each pair, check:

- The after frame is not recognisably the same template as the before frame.
- Every frame passes the five questions in SKILL.md §Look.
- The critic's template-trait count went down, and no new blocker or major finding appeared.

Loop steps 3 to 6 on whatever fails. Do at least two full verify passes.

## 8. Report

Tell the user, briefly:

- What the direction is, in one sentence, and the signature scene in one more.
- The before and after: critic score, template traits, and blocker or major findings, plus the paths to the baseline and final `desktop-scroll.png`.
- What you kept from the original, and anything you could not do (missing assets, a claim you would not invent).
