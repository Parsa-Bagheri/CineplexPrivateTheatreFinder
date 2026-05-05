# Cineplex Technical Discovery Report

Date: 2026-05-04

## Scope

This report records the current safe discovery boundary for the prototype. It avoids login, payment entry, seat holds, CAPTCHA bypass, rate-limit bypass, and automated purchase actions.

## Public Flow Observed

- Cineplex's promotions page describes the public path as selecting a theatre, date, movie, and showtime, then being taken to ticketing. It also says users may be prompted to log in before ticket purchase.
- Cineplex states online booking enables advanced seat selection.
- Cineplex's accessibility page describes wheelchair spaces, companion accommodations, closed captioning, described services, and sensory-friendly screenings. The classifier therefore keeps accessibility-related seats out of the default occupied estimate.

Sources:

- https://www.cineplex.com/promotions
- https://www.cineplex.com/theatres/accessibility
- https://www.cineplex.com/theatre/scotiabank-theatre-ottawa

## Findings

### Are showtimes visible without login?

Yes. Cineplex's public site bundle calls:

```text
GET https://apis.cineplex.com/prod/cpx/theatrical/api/v1/showtimes?language=en&locationId={theatreId}&date={date}
```

This returns theatre, movie, format, session, `vistaSessionId`, `ticketingUrl`, `seatMapUrl`, sold-out flag, in-past flag, and reserved-seating flag.

### Are seat maps visible without login?

Yes for the preview flow tested. Cineplex's public preview page calls read-only GET endpoints:

```text
GET https://apis.cineplex.com/prod/ticketing/api/v1/theatre/{theatreId}/showtime/{showtimeId}/seat-layout
GET https://apis.cineplex.com/prod/ticketing/api/v1/theatre/{theatreId}/showtime/{showtimeId}/seat-availability?preview=true
```

These were tested without login and returned layout and availability JSON.

### Does viewing the seat map create a temporary hold?

The verified preview calls do not create a hold. They are GET requests and are separate from the POST endpoint used by the site for reservation:

```text
POST /prod/ticketing/api/v1/theatre/{theatreId}/showtime/{showtimeId}/reserve-seats
```

The prototype does not call that endpoint.

### Is there a public JSON endpoint behind the page?

Yes. Public site bundles expose the theatrical showtime API and the ticketing preview seat APIs above. This prototype uses only those Cineplex public site GET endpoints and does not use MovieXchange directly.

### Are seat statuses explicit or visual-only?

Explicit in JSON. The layout includes seat ids, labels, and types such as `Standard`, `Wheelchair`, and `Companion`. Preview availability maps seat ids to values observed as `Available`, `Occupied`, and `Broken`.

### Does the flow differ by province, theatre, VIP, or event type?

Likely. The data model stores format, VIP, accessibility services, auditorium, theatre amenities, and unknown statuses separately so each theatre/format can be calibrated independently.

## Live Verification

Read-only verification on May 4, 2026 against Scotiabank Theatre Ottawa returned live occupancy estimates including:

- `499498`: 68 seats, 0 occupied, 68 available, not post-showtime.
- `499490`: 84 seats, 12 occupied, 72 available, not post-showtime.
- `499511`: 0 occupied / 64 sellable seats, with 4 accessibility seats tracked separately.
- `496465`: 0 occupied / 344 sellable seats, with 11 accessibility seats tracked separately.

## Compliance Risks

- Seat-map inspection may create temporary holds in some ticketing systems.
- Login prompts may appear before seat selection.
- Some statuses can mean sold, held, house-reserved, accessible-only, blocked, or unavailable for the selected ticket type.
- Frequent refreshes can create unnecessary load.

## Guardrails Implemented

- No auto-buy path exists.
- No login credential storage exists.
- Seat inspection uses only preview GET endpoints.
- The app does not call reserve, set-ticket, payment, or cart mutation endpoints.
- Wheelchair and companion seats are counted as accessibility ambiguity, not sold.
- Blocked, house-reserved, unavailable, aisle, and unknown seats are not counted as sold by default.
- Scheduler policy defaults to low concurrency, request delays, short retries, and no refresh after showtime start.
