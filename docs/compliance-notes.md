# Compliance Notes

The product should only report "likely empty" results. It must not guarantee that a showing is empty because seat maps can change quickly and because non-sellable seats can be blocked, accessible-only, house-reserved, or unknown.

Operational constraints:

- Do not purchase tickets.
- Do not reserve seats.
- Do not bypass authentication, CAPTCHA, rate limits, or access controls.
- Do not store Cineplex login credentials unless legal review explicitly approves it.
- Stop inspection if a seat map requires login or appears to create a temporary hold.
- Keep per-theatre cooldowns and a kill switch before production traffic.
- Review Cineplex Terms of Use and robots/traffic constraints before live collection.
- Use only read-only preview GET endpoints for live seat data.
- Do not call `reserve-seats`, `set-tickets`, cart mutation, payment, or authenticated account endpoints.

Classifier constraints:

- Count only `sold` and `reserved` as occupied.
- Count `available + sold + reserved` as sellable seats.
- Keep wheelchair, companion, blocked, and unknown seats in ambiguity buckets.
- Prefer high-confidence empty candidates over broad occupancy analytics.
