# Product Specification: Explorience (Explorience)

## 1. Project Overview & Evolution Strategy
Explorience is a multiplayer, multi-city location-based exploration app that turns physical geography into a "Fog of War" gamified map. 

**Draft Status:** High Fluidity. This document outlines structural responsibilities and data flow boundaries, *not* rigid data schemas. 
* **The Paradigm:** Thick Database / Thin Client. Data correctness, validation checks, and destructive cleanups (cascades) must live on the backend layer. The frontend focuses strictly on rendering UI state and capturing hardware inputs.
* **Extensibility Goal:** The core loop must support a transition from 2 players to many, from one city to any city, and from simple landmark hunts to rich, emergent gameplay mechanics.

---

## 2. Core Modules & Mechanics Boundaries

Your AI agents must treat the app as three decoupled modules. The internal data shapes of these modules can change, but how they interact with each other remains constant.

### A. The Identity & Session Module
* **What it does:** Authenticates users and groups them into shared contextual spaces (games/trips).
* **Flexible Boundary:** Initial builds use Supabase Anonymous Auth linked via a basic text invitation string. The architecture must allow swapping this for full OAuth (Google/Apple sign-in) or adding player metadata (team colors, avatars) entirely on the backend without changing the frontend navigation structures.

### B. The Discovery Engine (Passive Movement)
* **What it does:** Tracks real-time player location, updates local map visibility, and persists discovered territory.
* **Optimization Constraint:** The client must *not* stream continuous raw coordinates to the database. Instead, it must map continuous coordinate inputs to abstract, discrete spatial keys (e.g., mathematical grid hashing like `lat.toFixed(3), lng.toFixed(3)` or Geohashes). 
* **Data Flow:** The frontend buffers these spatial keys locally in memory and batches updates to the server via throttled intervals to protect device batteries and database bandwidth.

### C. The Gatekeeper Engine (Active Actions)
* **What it does:** Unlocks unique Points of Interest (POIs) using hardware validation.
* **The Logic Chain:**
  1. **Proximity Check:** A client cannot engage with an asset unless their local GPS is within a defined geometric threshold of that asset's origin.
  2. **Visual Verification:** Capturing an image fires a serverless request (Supabase Edge Function) which offloads the validation logic to an external AI vision agent (`gemini-2.5-flash`), comparing the user asset to a reference anchor.

---

## 3. Abstract Database Architecture

Instead of locking down explicit column names, the database must follow this relational ecosystem. *Agents are allowed to add columns, flags, or metadata fields as features evolve, provided they maintain these foundational associations:*

* **Core Registries (Static):** Contain spatial catalogs of environments (Cities, Regions) and physical anchors inside them (POIs, Landmarks).
* **Live Environments (Dynamic):** Map players to specific operational session states.
* **The Ledger Tables (Event Driven):** Track continuous user progression. 
  * *Rule:* Grid discoveries and landmark unlocks must be saved as independent chronological event rows rather than a single massive mutable JSON payload. This ensures compatibility with Supabase Realtime WebSockets and database auditing.
  * *Constraint:* Ledger tables must enforce relational composite keys (e.g., preventing duplicate records for the same player in the same square) to allow clean "insert or ignore" batch updates from the mobile app.

---

## 4. Development Jurisdictions (Agent vs. Human)

To keep development frictionless across architectural updates, follow this divide:

### AI Agent Jurisdiction (Automated Code & Generation)
* Create and update all React Native / Expo components, navigation structures, and local state management hook workflows.
* Handle native hardware permissions (`expo-location`, `expo-camera`).
* Write the JavaScript API client queries to push and pull data from Supabase.
* **Schema Evolution:** When a new feature requires database modifications, the agent must *generate the raw PostgreSQL migration scripts* (`CREATE`, `ALTER`, `CONSTRAINT`) for the developer to review and run, rather than guessing or attempting direct data manipulations.

### Human Developer Jurisdiction (Manual System Controls)
* **Infrastructure Security:** Manually manage Auth providers and Row Level Security (RLS) policies within the Supabase Dashboard.
* **Pipeline Deployment:** Set up and store secret environment keys (like the Gemini API credentials) safely via the Supabase CLI/Dashboard environment variables.
* **Migration Execution:** Run the SQL scripts provided by the agent inside the Supabase SQL Editor.