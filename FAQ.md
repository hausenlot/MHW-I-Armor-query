1. "Filter armor per slot → only relevant pieces" Does this mean equipment that has only that skills? how about an equipment with non relevant skill but high decoration slot? for example, just an example this might not exists but it might be possible in the future. an armor piece with 3-3-3 slots? is that included?
2.  Ok as for the loop nesting. Why are we starting on HEAD? or does it even matter where we start nesting?

Edited LOGIC.md
Viewed query.json:1-67

## 1. Yes, a 3-3-3 piece with zero relevant skills IS included

Here's the exact filter from [solver.js line 81-108](file:///d:/CLIENT FOR ASP/mhwildsbuilder/src/search/solver.js#L81-L108):

```js
return hasRelevantSkill || hasDecoSlots || hasRelevantSetBonus;
```

It's **OR** logic. A piece passes if it has **any** of:
- A skill you asked for, **OR**
- At least 1 decoration slot (any size), **OR**
- Belongs to a set whose bonus is a skill you want

So your hypothetical 3-3-3 piece with completely useless innate skills? **Included.** Because `hasDecoSlots = true` (it has slots). Those 3 size-3 slots could hold jewels for Burst, Constitution, Critical Boost, etc. The solver would be dumb to skip it.

The only pieces that get **excluded** are ones that have:
- ❌ No relevant skills AND
- ❌ No deco slots AND
- ❌ No relevant set bonus

Basically: a piece that can't contribute **anything** to your build. Think of a low-rank Bone Helm with zero slots and only Stun Resistance when you didn't ask for it — that gets filtered out.

---

## 2. Starting order doesn't matter for correctness. But it matters for speed.

The order is hardcoded as `['head', 'chest', 'arms', 'waist', 'legs']` at [line 70](file:///d:/CLIENT FOR ASP/mhwildsbuilder/src/search/solver.js#L70):

```js
const SLOT_ORDER = ['head', 'chest', 'arms', 'waist', 'legs'];
```

**For correctness** — it doesn't matter at all. Head-first or legs-first, you end up checking the same set of 5-piece combinations. It's just the order you explore them.

**For speed** — it *can* matter. Ideally you'd want to start with the **most constrained** slot (fewest candidates), because you prune earlier and skip more branches. Example:

- If only 5 head pieces are relevant but 40 legs pieces are relevant
- Starting with head means you make the "hard choice" first, prune early
- Starting with legs means you pick a leg, then explore 5 heads per leg — less pruning opportunity in the early levels

But the current code doesn't do dynamic ordering. It's always head → chest → arms → waist → legs. A potential optimization would be sorting `SLOT_ORDER` by candidate count ascending before the search starts — the slot with the fewest candidates goes first. This is a common trick in constraint solvers called **"fail-first"** or **"most constrained variable"** heuristic.

That said, the dominated-piece pruning already shrinks the candidate lists so much that the fixed order works well enough in practice.

hmm yea now that makes sense. now question on the algorithm

1. Isnt it much faster if we check if the armor has the set bonus required? meaning we check first the query if there's a skill related to set bonus? if not well we just do what we have here?
2. Why didnt we added the charm on nesting?

## 1. Pre-filtering for set bonus requirements — Yes, that would be faster

You're spotting a real optimization opportunity. Let me explain what happens now vs what you're suggesting.

**Currently:** Set bonus skills (like `Rathalos's Flare` or `Ebony Odogaron's Power`) are treated as "just another skill" in the query. The solver discovers it needs Rathalos pieces **reactively** during pruning — it picks some random head, then checks "can I still get enough Rathalos pieces in the remaining 4 slots?" If not, prune.

**Your idea:** Look at the query **upfront**, notice "Rathalos's Flare Lv1 requires 2 Rathalos set pieces", and **force** at least 2 of the 5 slots to be Rathalos. This front-loads the constraint.

This is a legit optimization for queries like yours where you're asking for:
- `Ebony Odogaron's Power` (needs 2 Ebony Odo pieces)
- `Rathalos's Flare` (needs 2 Rathalos pieces)  
- `Gogmapocalypse` (set bonus, weapon already counts as 1 piece)

If you enforced "at least 2 slots must be Rathalos, at least 2 must be Ebony Odo" upfront, you'd cut the candidate lists **massively** because most pieces aren't from those sets.

**Why it's not done currently:** The existing pruning via `maxFutureSetPieces` catches these cases within 1-2 levels of nesting anyway. A head piece that isn't Rathalos or Ebony Odo gets pruned quickly because the solver sees "I can't accumulate enough set pieces in the remaining slots." So in practice, the wrong branches die fast.

But you're right — it's doing extra work to "discover" what it could have known from the start. A proper pre-analysis of set requirements would skip those dead branches entirely.

---

## 2. Charm isn't nested because it's handled in the outer loop

Look at [solve()](file:///d:/CLIENT FOR ASP/mhwildsbuilder/src/search/solver.js#L799-L872) — the outer wrapper:

```
solve()
  ├── charm = specific → solveSingle() once
  └── charm = "search" → for each relevant charm:
                             solveSingle(with this charm)
```

So charm **IS** iterated — just **outside** the 5-slot nesting, not inside it.

**Why outside instead of inside?** Three reasons:

1. **Charm is purely subtractive.** A charm just gives skill points. It doesn't have deco slots, doesn't contribute to set bonuses, doesn't have defense stats that matter for pruning. So you can resolve its contribution **before** the search starts — just subtract its skills from the needs, then search with reduced needs. There's no interaction between "which charm" and "which head piece" that you'd miss.

2. **Charm changes the entire search landscape.** If you pick a charm that gives Constitution Lv3, your remaining needs change, your candidate lists change, your pruning bounds change. It's cleaner to recompute everything per charm rather than trying to adjust mid-search.

3. **Few charms, many armor pieces.** There might be 5-15 relevant charms but 30+ candidates per armor slot. Nesting charm inside would mean re-evaluating charm compatibility at every combination. Nesting it outside means you run 15 separate searches with simpler inner logic — and each search is faster because the needs are already reduced.

If you nested charm as a 6th level inside, the search tree would be:

```
for each HEAD:
  for each CHEST:
    for each ARMS:
      for each WAIST:
        for each LEGS:
          for each CHARM:    ← 15 iterations here, but ALL the above
                                work was already done identically
                                regardless of charm choice
```

The charm doesn't affect which armor pieces are valid — it only changes the skill math. So repeating the 5-armor loop per charm would be wasted work. Better to commit to a charm first, adjust the needs, then search.