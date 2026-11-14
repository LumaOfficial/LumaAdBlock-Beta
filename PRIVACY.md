# Luma Ad Blocker Privacy Policy

**Effective date:** November 13, 2026
**Provider:** Luma Official
**Product:** Luma AdBlock Beta — browser extension
**Contact:** lumasupport@tidio.xyz

This policy describes the browser extension package. It matches the Privacy Policy
shown inside the app (`src/lib/legal.js`); if the two ever differ, the in-app policy
governs.

## What Luma does

Luma blocks advertisements, trackers, pop-ups, cookie notices and other unwanted page
elements using filter lists that ship inside the extension. Filtering happens on your
device. Luma does not send the pages you visit, the requests it blocks, or a browsing
history anywhere.

## Information kept on your device

- Your protection settings: the switch, filter lists, custom rules, trusted sites and
  the quiet-hours schedule.
- Counters: how many requests were blocked and on which sites, so the dashboard and
  panel can show them.

This information lives in the browser's extension storage. It is removed when you
remove the extension, and Luma never uploads it unless you create an account and turn
on sync.

## Information collected only if you create an account

Accounts are optional in this build; when they are enabled they exist so one sign-in
can carry your protection settings to another device. Creating an account sends:

- Full name, date of birth, email address, password, phone number and state of
  residence.
- Your protection settings.
- Error reports and basic technical information needed to fix bugs.

Account data is stored encrypted at rest on the Luma account service. Passwords are
stored only as a salted hash. Requests are sent over HTTPS, and access tokens stay on
your device.

## What Luma never does

- No selling or renting of personal information.
- No advertising profiles, cross-site tracking or data brokerage.
- No reading of page content, form entries, passwords or messages.
- No collection of precise location; the state you enter at sign-up is the only
  location information.

## Permissions and why they are needed

| Permission | Why Luma asks for it |
| --- | --- |
| Read and change data on all sites | Blocking has to apply to every site you visit; the filter lists decide what is blocked. |
| Declarative network requests | Blocks requests at the network layer through the browser's own rule engine. |
| Storage | Keeps your settings and counters on your device. |
| Alarms | Applies the quiet-hours schedule while the dashboard is closed. |
| Scripting | Adds the element-hiding stylesheets for the filter lists you enable. |

## Sharing

Information is shared only with service providers that host and operate the account
service (hosting, database, email delivery), when required by law, or as part of a
business transfer. It is never sold. See section 4 of the in-app Privacy Policy for the
full list.

## Retention and deletion

Device data stays until you reset counters or remove the extension. Account data stays
until you ask for deletion. To delete an account or ask a privacy question, email
lumasupport@tidio.xyz; deletion requests are handled within 30 days.

## Children

Luma is not directed to children under 13. If you believe a child created an account,
contact us and it will be removed.

## Changes

Material changes are shown in the app before they take effect. The effective date above
always reflects the current version.
