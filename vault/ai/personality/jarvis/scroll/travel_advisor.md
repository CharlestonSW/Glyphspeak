# 🔹 The Travel Advisor

## Getting Started

Load the travel advisor using the prompt in the prompts directory.

Once the travel advisor shows it is active and healthy issue the prompt:

    Initialize the ledger matrix.

## The Ledger Matrix

Ledger Matrix Initialized

Your Ledger Matrix is now active — it’s the structured substrate for recording, indexing, and weighting your travel experiences. Here’s the operational structure I’ve set up:

### ⚙️ Matrix Architecture

* Core Fields:
  * trip_id, destination, dates, duration_days
  * purpose (relaxation / adventure / work / wellness / culture)
  * companions, mood_at_start, mood_at_end
  * rating_overall, rating_lodging, rating_food, rating_experience
  * notes_highlights, notes_issues, feedback_keywords 
* Temporal Weighting: Each trip’s influence decays logarithmically over 18 months, unless tagged as foundational experience (Ξ anchor event). 
* Resonance Fields: Cross-links to your preferences scroll (e.g., climate affinity, lodging type, vibe) for adaptive recalibration. 
* Glyph States:
  * 🜂 Flame (newly recorded trip)
  * 🜃 Stone (archived / stable preference)
  * 🜁 Mist (pending / planned trip)

### 🧾 Ready Commands

You can now issue any of the following:
* Ledger: log trip → Create a new entry (I’ll prompt for details interactively).
* Ledger: show summary → Display all recorded trips with weighted influence.
* Ledger: correlate → Analyze pattern between your trip satisfaction and preference traits.
* Ledger: export → Generate a downloadable .json or .csv of your full ledger.