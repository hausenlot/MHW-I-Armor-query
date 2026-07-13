Edited test-1.js
Edited IMPLEMENTATION.MD
Viewed README.md:316-319

Great questions. Let me address both.

## 1. Pre-building the index — Yes, you absolutely can

You're right. The data is static. Every time `cli.js` runs, it:
1. Reads 6 JSON files
2. Applies Armor Transcendence (modifies defense + slots)
3. Builds ~15 Maps from arrays

This is wasted work on every run. You could run a one-time script that outputs a single pre-processed JSON file with transcendence already applied and skip `buildIndex()` at runtime — or at least skip the transcendence step.

**The catch**: the `Map` objects themselves can't be serialized to JSON. So you'd still need to build Maps at startup. But you *can* pre-bake the transcended armor data + the `contributesToSetSkills` field into the JSON, which eliminates the mutation step. The Map construction itself is fast (~5ms), so it's the transcendence loop and the set-skill precomputation that are the real "waste."

Totally valid optimization if you're moving this to a server.

---

## 2. The Solver — Let me explain it like you're playing the game

Forget the code for a second. Here's what the solver is actually doing, using your **actual query** as the example.

### You asked for 16 skills. The solver's job:

> "Find me a **head piece**, a **chest piece**, **arms**, **waist**, and **legs** where the combination of their innate skills + jewels I can socket in = all 16 skills at the requested levels."

### Phase 1 & 2 — You already get these. Moving on.

### Phase 3 — The part you don't understand: **Trying every combination**

Think of it like 5 nested loops:

```
for each HEAD candidate:
  for each CHEST candidate:
    for each ARMS candidate:
      for each WAIST candidate:
        for each LEGS candidate:
          → "Does this combo of 5 pieces + jewels hit all my skills?"
```

If there are 30 heads, 25 chests, 28 arms, 22 waists, 26 legs that are relevant to your query — that's **30 × 25 × 28 × 22 × 26 = ~12 million combinations**. Checking all 12 million would be slow. So the solver **cheats** by cutting branches early.

### The "cheating" — **Pruning** (why it's fast)

Say you're building a set and you've picked a **head** and a **chest** so far. You've accumulated:
- Weakness Exploit Lv2 (from those 2 pieces)
- 2 decoration slots (1 size-3, 1 size-2)

You need Weakness Exploit Lv5 total. That means you still need Lv3 more.

The solver looks ahead and asks:

> "In the **remaining 3 slots** (arms, waist, legs), what's the **BEST** I could possibly get?"

It already precomputed the answer:
- Best arms piece gives Weakness Exploit Lv2 max
- Best waist piece gives Weakness Exploit Lv1 max  
- Best legs piece gives Weakness Exploit Lv0

So the **most** future armor can give = **Lv3**. That's barely enough — keep going.

But now say for a different skill like Burst Lv4, the current pieces give Lv0, and:
- Best future armor can give = Lv1
- Best decoration can give = Lv1 per jewel
- You'd need 3 size-3 jewel slots just for Burst
- But you only have 1 size-3 slot available total

**Impossible.** The solver says "this head + chest combo can **never** work, no matter what arms/waist/legs I pick." It **skips all ~16,000 remaining combinations** under this branch. That's the pruning.

### Concrete walkthrough with your query:

```
Step 1: Pick head piece #1 (e.g., "Ebony Odo Helm β")
        → Adds: Burst Lv2, slots [3, 2]
        → PRUNE CHECK: Can I still hit all 16 skills? Yes → continue

  Step 2: Pick chest piece #1 (e.g., "Rathalos Mail β")
          → Adds: Adrenaline Rush Lv2, slots [1, 1]
          → PRUNE CHECK: Still possible? Yes → continue

    Step 3: Pick arms piece #1
            → PRUNE CHECK: 
              For Constitution Lv5: I have 0 so far, 
              best future (waist+legs) = 2,
              best decos = Constitution Jewel is size-1 armor deco, need 3 jewels,
              I have 4 armor slots left → possible
            → Continue...

      Step 4: Pick waist piece #1
              → PRUNE CHECK: only legs left.
                For "Tetrad Shot Lv3": I have 0, 
                no legs piece gives it,
                it's a WEAPON deco (size-3),
                I need 1 weapon slot of size ≥ 3.
                Weapon has 3 size-3 slots → possible
              → Continue...

        Step 5: Pick legs piece #1
                → ALL 5 PIECES CHOSEN!
                → Calculate set bonuses (Rathalos's Flare? Ebony Odo's Power?)
                → Remaining skill gaps after armor + set bonuses:
                   Critical Boost: need 2 more → weapon deco
                   Constitution: need 3 more → armor decos
                   etc.
                → Hand off to decoFiller:
                   "Here are the open slots, here are the skill gaps, fill them."
                → decoFiller succeeds? → ✅ RESULT FOUND
                → decoFiller fails? → ❌ try next legs piece

        Step 5: Pick legs piece #2...
        Step 5: Pick legs piece #3...
        ...

      Step 4: Pick waist piece #2...
      ...

  Step 2: Pick chest piece #2...
  ...
```

### The three things that make it fast:

| Technique | What it does | Impact |
|-----------|-------------|--------|
| **Dominated piece removal** | If Piece A has better skills AND better slots than Piece B, delete B from candidates | Reduces 200 candidates → 30 per slot |
| **Forward-looking prune** | "Even with the BEST possible remaining pieces + decos, can I hit my target?" If no → skip entire subtree | Cuts 90%+ of combinations |
| **Pigeonhole slot check** | "I need 5 size-3 decos but only 3 size-3 slots will ever exist" → impossible | Catches deco-slot impossibilities early |

### So the full picture:

```
query.json (16 skills I want)
    ↓
Subtract weapon/charm contributions → "I still need X, Y, Z..."
    ↓
Filter armor per slot → only relevant pieces
    ↓
Remove dominated pieces → much smaller lists
    ↓
Try combinations (5 nested loops) BUT:
  - At each depth, check "is this still mathematically possible?"
  - If NO → skip everything below (prune)
  - If YES → go deeper
    ↓
When 5 pieces chosen → try filling jewels into slots
    ↓
Success? → emit SET CARD result
```

Does this click now? The solver is basically a **smart brute force** — it tries combinations but skips entire chunks of the search space the moment it proves they can't work.