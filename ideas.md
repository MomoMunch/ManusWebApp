# Athenaeum — Design Direction

## Three directions considered

| Theme Name | Very Brief Intro | Probability |
| --- | --- | --- |
| Sunlit Scholar | A lived-in reading room of parchment paper, inkwells, and quiet botanical notes. Information feels organized like annotations in a well-used academic folio. | 0.07 |
| Editorial Syllabus | A restrained academic journal with typographic rhythm, ruled-paper structure, and crisp ink details. It would feel like a curated course reader. | 0.04 |
| Hearthside Index | A warm archival catalogue inspired by card drawers, embossed labels, and soft wool textures. It would place the emotional warmth of a study nook first. | 0.09 |

## Chosen approach: Sunlit Scholar

**Design Movement.** Contemporary academic editorial design filtered through a softly hand-kept reading journal. It keeps the existing cozy dashboard while giving each new data surface a quiet sense of materiality.

**Core Principles.** Surfaces remain warm and paper-like, never clinical. Information is grouped in calm, generously padded 2xl containers with low-contrast borders and shadows. Data is conveyed through ink, moss, oxblood, and ochre rather than high-saturation dashboard colors. Motion rewards considered study actions but never competes with concentration.

**Color Philosophy.** Cream (#F2EBDD) acts as a reading-room ground, with lighter parchment cards (#FBF7EE) for clarity. Dark brown ink (#2B2620) carries structure. Muted ochre, slate, moss, oxblood, teal, and rose distinguish subjects, while the heatmap moves from nearly invisible parchment through warm ochre to deep library ink so effort reads as accumulated patina.

**Layout Paradigm.** A persistent library shelf sidebar anchors an asymmetrical worktable. The dashboard stacks a personal welcome and daily metrics above a flexible study archive: a broad calendar ledger beside narrower insight and task cards. Dense data is staged as individual folio sections rather than a rigid central widget grid.

**Signature Elements.** A monthly calendar heatmap with softly inset day cells, a tiny inkline beneath key section labels, and subject-colored catalogue dots create visual continuity. Progress rings and timer arcs read like ink gradually filling a vessel.

**Interaction Philosophy.** Every meaningful study action leaves a visible trace: finishing a timer writes a history entry, grading a recall card updates its due state, and logging a result moves the score forecast. Buttons feel tactile with short scale-down presses and understated color shifts.

**Animation.** Use 160–240ms custom ease-out transitions for hover, tabs, and progress. Flashcards flip in 420ms using a gentle 3D perspective. Calendar selection is immediate with a subtle background fade. Respect reduced-motion preferences and do not animate high-frequency navigation.

**Typography System.** Fraunces remains the expressive display face for page titles and key totals. Source Sans 3 is the legible workhorse for descriptions and controls. IBM Plex Mono labels dates, course codes, metrics, and status labels with small, generous letterspacing.

**Brand Essence.** Athenaeum is a calm study command centre for ambitious IB/AP learners who want evidence of meaningful progress, not noise. **Quiet, meticulous, encouraging.**

**Brand Voice.** Headlines are warmly observant; CTAs are concise and action-oriented; microcopy celebrates consistency rather than urgency. Example: “Your study trail, one thoughtful sitting at a time.” Example: “Turn the card when the answer feels ready.”

**Wordmark & Logo.** A compact open-book and leaf mark with hand-inked linework, paired with a distinctive Fraunces wordmark. The mark may stand alone as the app icon and never depends on default sans-serif lettering.

**Signature Brand Color.** **Library Ochre — #A9782F.**

## Style Decisions

- Preserve the original warm-neutral palette, 2xl rounding, subtle 1px parchment borders, and soft ambient shadows.
- Use the calendar as the primary representation of history; each tile must be keyboard reachable and reveal its daily log on selection.
- Keep visualizations custom-colored for the subject taxonomy rather than using generic chart hues.
- New features must share one browser-persisted data model so study actions synchronize across the dashboard, planner, focus station, recall deck, and question bank.
- Library Ochre (#A9782F) is reserved for primary actions, selected progress states, calendar patina, and meaningful study milestones rather than generic decoration.
- Every substantial data surface carries a journal cue: an inkline, folio mark, ruled division, catalogue dot, or annotation-style note.
- The reading-room image is treated as an archival material, with paper grain, botanical overlays, and warm tonal integration rather than as a generic productivity banner.
