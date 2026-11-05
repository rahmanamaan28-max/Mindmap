# MINDTRAP — The Last Alibi (prototype 0.1)

A four-player, real-time psychological mystery prototype built with Node.js, Express and Socket.IO.

## Run locally

Requirements: Node.js 20+

```bash
npm install
npm start
```

Open http://localhost:3000 in four browser tabs/devices. Create a room, share the six-character code, and join with three other players. In automated mode, all four players ready up to start. In host mode, the host starts once four players have joined.

## Included in this prototype

- Private room creation and joining
- Four-player lobby and ready state
- Host and automated lobby modes
- Server-assigned private dossiers and missions
- Public chat and private messages
- Investigation actions
- Five timed phases
- Final voting and case reveal
- Responsive dark thriller UI
- Health endpoint at `/health`

## Current prototype limitations — do not treat as production-ready yet

This is a playable foundation, not a secure public launch. The first case is seeded and the case data currently resides in the server project. Before public deployment, implement persistent room/session storage, authenticated reconnect tokens, server-side private-message history, per-player action quotas, input validation/rate limiting, robust disconnect handling, server-authoritative role secrecy, private result delivery, automated test coverage, observability, and a proper case validation pipeline. The current prototype's `state` payload is intentionally simple for local testing and should be split into player-specific public/private payloads before production.

## Suggested project structure for production

```text
mindtrap/
  src/
    server.js
    config/
    game/
      engine.js
      phases.js
      scoring.js
      actions.js
      alliances.js
      memory-trap.js
      case-validator.js
    realtime/
      socket-handlers.js
      rooms.js
      auth.js
    data/
      cases.js
      campaigns/
    services/
      persistence.js
      moderation.js
      telemetry.js
  public/
    index.html
    style.css
    app.js
  tests/
    engine.test.js
    permissions.test.js
    cases.test.js
  package.json
  README.md
```

## Production implementation plan

### Milestone 1 — Secure multiplayer foundation
- Split public room state from player-private state; never broadcast dossiers, hidden roles, secret missions, private messages, culprit IDs or unrevealed solutions to all clients.
- Add signed reconnect tokens and stable player IDs independent of Socket.IO connection IDs.
- Add room expiry, host transfer, disconnect grace periods and reconnect recovery.
- Add input schemas, rate limits, message length limits and server-side phase/action permissions.

### Milestone 2 — Complete game engine
- Model case truth as an immutable server-only object.
- Add variable culprit configurations: solo culprit, culprit + accomplice, competing factions, and no fixed culprit objective cases.
- Add secret alliance proposals, acceptance, revocation and betrayal events.
- Add phase-specific actions, ability charges, investigation tokens and action logs.
- Implement deterministic scoring and end-of-case explanation.

### Milestone 3 — Campaign and content
- Create a campaign state tracking persistent clues, recurring characters and chapter unlocks.
- Build a case authoring schema and validator that checks clue reachability, timeline consistency, role knowledge boundaries and solvability.
- Add independent quick-play cases and campaign chapters tied to the ECHO conspiracy.

### Milestone 4 — Quality and launch
- Unit-test game transitions, scoring, clue access and role secrecy.
- Integration-test four clients, disconnect/reconnect, timer expiry, simultaneous votes and room isolation.
- Add structured logs, health checks, error reporting and deployment secrets.
- Load-test concurrent rooms and verify that one room cannot read or mutate another room's state.
- Add privacy policy, community rules, reporting and moderation controls before public release.

## Deployment

On Render: create a **Web Service**, connect the repository, set Build Command to `npm install`, Start Command to `npm start`, and use Node 20+. Set `NODE_ENV=production`. Use a persistent database before relying on rooms or campaign progression across restarts. Do not store secrets in source control.
