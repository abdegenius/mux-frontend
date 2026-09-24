# Security UX Guards

This document describes the security and UX guardrails enforced across the Mux
frontend, and the invariants that contributors must preserve when touching
wallet, API key, and payment surfaces.

## API key usage analytics charts

The dashboard exposes per-API-key usage analytics charts. These charts are
backed by a typed analytics endpoint that returns a per-key usage time-series.

### Authz (deny-by-default)

- The analytics endpoint is a privileged read surface and is **deny-by-default**.
- Access is granted only to the key owner, or to a caller presenting a valid
  API key / JWT with the required role (owner/delegate/guardian).
- Revoked delegates and expired credentials are rejected; clients cannot bypass
  policy by supplying a key id they do not own.
- Authorization is evaluated server-side. The client never decides whether a
  chart may be rendered.

### Error contract

- Responses use stable error codes and a correlation id so failures are
  actionable and traceable in logs.
- Analytics reads surface actionable errors on dependency outage (RPC/DB/Horizon)
  rather than rendering empty or misleading charts.
- Write paths remain fail-closed on dependency outage; analytics is read-only and
  must never mutate key state.

### Observability

- Metrics/logs for the analytics path must not leak secrets or raw key material.
- API keys, JWTs, and webhook secrets are redacted in logs.

### Rollback / flags

- Any money-path or mainnet-affecting change must be feature-flagged or behind a
  kill-switch, with rollback documented in the PR description.
- Analytics charts are read-only and do not affect spends, recovery, or admin
  actions; the server/contract remains the source of truth.

## References

- `README.md`
- `tests/e2e/`
