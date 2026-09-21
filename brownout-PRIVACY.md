# Brownout privacy policy

Effective date: 21 September 2026. Publisher: AfloraBora. Applies to Brownout 1.2.0.

Brownout filters the user's X feed using account-location rules. No separate Brownout account is required.

## Information processed

Brownout reads account handles, X-reported account country or region, location-accuracy information when supplied, and post context and links needed to label and filter posts. It processes the user's selected places, account exceptions, personal country notes, profiles and other settings. The current X page and encountered post links are processed for filtering and temporary review; Brownout does not access Chrome's browsing-history database or create a cross-site history log.

To obtain account-location information, Brownout observes relevant X GraphQL requests and responses. It temporarily uses existing session authentication, anti-CSRF and related request headers in page memory. It sends account-handle lookups over HTTPS directly to X using that session. These headers are not saved in extension storage, placed in settings exports or transmitted to the publisher. Brownout does not ask for or collect the user's password.

User interactions with Brownout's controls and nearby post visibility are processed to apply settings and pace lookups. There is no behavioural analytics, general keystroke logging or advertising tracking. Brownout does not intentionally extract private messages, health information or payment information. Its site permission technically permits page access on x.com, while the implemented features use the information described above.

## Storage and retention

Rules, notes, profiles and a bounded cache of up to 5,000 account-location records are stored in local browser storage. Cached known locations become eligible for an on-demand refresh after seven days; unavailable results after six hours. These are freshness intervals, not promises of deletion on those dates. Entries may remain until replaced, pruned, cleared or the extension is removed. Personal notes persist until edited or removed. Operational lookup and cooldown state is also stored locally. Per-tab status uses browser-session storage. The current tab's filtered-post drawer holds up to 100 match records in memory, including account handle, reason, post link and timestamp, but not post text; this drawer clears when the page reloads.

## Transfers and third parties

Brownout has no publisher-operated collection server and does not send browsing data, settings or notes to the publisher. It includes no advertising or analytics and does not sell user data. X receives the authenticated location requests and continues its normal website processing under its own policies. No other remote service is contacted by the extension's lookup code. All extension executable code is packaged locally.

Settings exports are created only when requested by the user and include personal country notes and profiles. Users control whether to share those files. Public support issues on GitHub are processed by GitHub and are visible publicly; do not include passwords, session tokens or private account data in them.

## User controls

Users can pause filtering, change selected places, remove personal notes, clear the location cache, turn off the extension or uninstall it. Removing the extension removes its browser-managed storage; independently saved exports and public support posts are not deleted by uninstalling. No cloud copy is maintained by the publisher.

Account-location estimates are not verified residence or nationality. User-supplied notes are labelled separately from X's information.

## Limited Use

Brownout's use and transfer of user information adhere to the Chrome Web Store User Data Policy, including its Limited Use requirements. Information is used only for the disclosed location-filtering features, not advertising, unrelated profiling, creditworthiness or lending.

## Contact and changes

Questions: https://github.com/AfloraBora/BrownOut/issues

This policy will be updated when data practices change. Material changes will be disclosed to users as required before the changed handling begins.
