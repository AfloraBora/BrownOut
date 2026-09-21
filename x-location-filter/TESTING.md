# Verification — 21 September 2026

21 automated tests passed with Node 24 and jsdom 29.1.1:

- Requested default geography, translated aliases and country-code labels.
- Broad-region complete-membership versus overlap policy.
- Unknowns, paused filtering and per-account exceptions.
- Cache expiry and imported-setting sanitisation.
- All 250 countries/territories have an outline or coordinate dot; French Guiana and Svalbard are separate.
- Feed hiding, quote authors, collapse, Show once, recycled article identity and restoring paused posts.
- Strict unknown handling and optional quote filtering.
- Bridge uses the About field even when the profile location contradicts it; requests stay on X; headers never appear in emitted messages.
- Invalid handles, missing session and disabled requests.
- Rate-limit response handling.
- Passive About page observation refreshes the query identifier.
- Missing About profile becomes unknown rather than stopping the queue.
- Background write serialisation, cross-tab request reservations, cooldown, and isolation of settings writes from content-script messages.

Chrome UI checks: initial default selection; search; list-to-map synchronisation; region toggle; undo; map keyboard selection; settings controls; visual rendering. No JavaScript errors observed in the controls preview.

Live X inspection confirmed the standard author/quote DOM structure and the actual AboutAccountQuery response path, account_based_in and location_accurate fields. The implementation contains the query identifier observed during that inspection and refreshes it on future native About queries.

Brownout 1.1 was reloaded in the existing installed Chrome extension. Its identity and path remained unchanged. The control page retained 179 selected locations, collapse mode, balanced unknown handling, flag/code labels and the existing account exception. A fresh X page showed Brownout branding and X-sourced badges. A temporary manual note using the account’s already displayed X country was saved: the pill changed to “USA ✎”, and its detail panel showed “Set by you” and the underlying X value. Removing the note restored the original X-sourced badge. No test note was left behind.

Four additional automated tests cover manual precedence and removal, indefinite manual-note lifetime, bounded/deduplicated queue candidates, the Unknown-pill save/remove form, and preserving manual notes across X cache updates. (The two precedence/lifetime behaviours share one test.)

The live upgrade check used already cached X locations; it does not prove that X will continue to accept its undocumented lookup endpoint indefinitely. Future X changes can still require maintenance.

## Reproduce automated tests (optional, developers only)

The extension needs no npm dependencies to run. For its tests, in this folder:

```
npm install
npm test
```

Use Node 24 or a version supported by jsdom 29.1.1. Test credentials and posts are synthetic. No tests call X or another network service.

## First-use check

1. Load unpacked and refresh X.
2. Open a public account's About page. Verify its displayed location matches Atlas's badge/detail panel on that author's posts.
3. Select/deselect that country and check the post changes visibility. Use Collapse if you want a visible indication of the matching rule.
4. Pause Atlas and confirm the post returns. Resume, then restore your intended country selection.
5. Inspect connection status if any badge remains Pending. The README explains queue timing, endpoint refresh and rate-limit pauses.

Version 1.2 additionally tests quoted-card isolation, Show quote, allowed repost sharers, collapsed side-tab/drawer behavior, timed pause and profile normalization. Repost markup uses fixtures; real X markup can vary by language and site updates.

Live 1.2 verification: reloaded the same installed extension without new permissions. The existing Russia personal note remained visible. A fresh X tab displayed the 23×52px collapsed side tab midway down the left edge; opening it displayed the connected filtered-post drawer. Browser preview verified profile save/apply/delete and selected map fill rgb(114,222,246) after the pulse while still focused.
