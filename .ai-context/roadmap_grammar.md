# Atomic Grammar Roadmap: "Grammar as Intuition"

## Core Philosophy
Shift from "textbook" grammar modules to "atomic" interactions where grammar is a property of words and the skeleton of sentences.

## 1. Dynamic Particle Tiles (Magnetic "Connect the Dots")
**Pain Point**: Users know "Coffee" and "Drink" but struggle with the particle in between.
- **Interaction**: On the Word Detail page, words act as magnets.
- **Action**: When a verb (e.g., 飲む) is clicked, semi-transparent particle slots appear.
- **User Action**: Drag particles (e.g., を, に) into slots.
- **Feedback**: AI generates the corresponding phrase immediately.
- **Visuals**: Puzzle-piece edges to hint at connection logic.

## 2. The Conjugation Dial (Time/Dimension Dial)
**Pain Point**: Overwhelming verb conjugation tables.
- **Interaction**: A vertical or circular dial below the verb card.
- **Dimensions**:
    1.  **Tone**: Affirmative / Negative / Question
    2.  **Time**: Past / Non-Past
    3.  **Politeness**: Plain / Polite (Teineigo)
- **Animation**: Morphing text (e.g., る flies away, ます flies in) with tweening.
- **Context**: Selecting a form updates a "Minimalist Lifestyle Example Sentence" below.

## 3. The Grammar Skeleton (Cloze-Over-Structure)
**Pain Point**: Example sentences look like a wall of text.
- **Design**: Color-coded "Skeleton" – distinct shades for Verbs, Particles, Nouns.
- **Interaction**:
    - **Long Press**: Reveals the "Connection Formula" bubble (e.g., {stem} + \text{なさい}$).
    - **Cloze Challenge**: System removes particles or suffixes; user taps to fill them in during word review.

## 4. Playground (Sentence Lab)
New product section for experimentation.
- **Phrase Lab**: Pick two words, AI offers 3 particle options, click to see semantic differences.
- **Conjugation Lab**: Input a dictionary form, generate N5-N1 conjugation list.
- **Scenario Switcher**: Toggle a sentence between "Office" (Keigo) and "Friend" (Plain) modes to see grammar shifts.

## 5. UX & Technical Implementation
- **VS Mode**: Comparative component for similar grammar (e.g., ～ように vs ～ために).
- **JLPT Progress Bar**: Persistent progress bar on word cards (e.g., highlight N3 usage frequency).
