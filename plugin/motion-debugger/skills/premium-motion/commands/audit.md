# audit: what makes this page look generated

Review only. Do not edit anything.

1. Record the page:

   ```bash
   motion-debugger critique <url-or-folder>
   ```

2. Open every image the critic writes, and read its findings.
3. Walk the page against SKILL.md §Two defaults and §What premium actually is.

Report findings ranked, each with where it is (section and element), the evidence (image name and frame), and the command that fixes it:

| Rank | Means | Examples |
| --- | --- | --- |
| **P0 broken** | A visitor sees something wrong | Content that never appears, text over text, copy under a sticky header, sideways scroll on a phone, console errors |
| **P1 generic** | It reads as AI-made | Template traits (the critic counts them), a first viewport that is a layout rather than a scene, flat or missing imagery, uniform fade-ups or no motion past the hero, no signature moment |
| **P2 unfinished** | It reads as rushed | `craft.png` defects: hollow cards, dead space, near-miss alignment, mismatched buttons, faint or mid-animation stills, invisible hover or focus |
| **P3 polish** | It reads as almost there | Type details, rhythm between sections, timing inconsistencies, phone layout that is only a squeezed desktop |

End with the three commands that would raise the page most, in order, with one line each on what would change. If the page has no `PREMIUM.md` and P1 findings dominate, the first recommendation is `upgrade`.
