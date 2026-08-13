// InCyTrade cookie-consent configuration.
//
// Uses vanilla-cookieconsent (vendor/cookieconsent/, MIT, vendored not
// CDN-loaded, so the page makes no third-party request), rather than a
// hand-rolled banner, specifically so consent-UX correctness (focus
// handling, ARIA, remembering the choice, re-showing after expiry) is
// maintained upstream instead of by us.
//
// Current state: one category, "necessary" — the library's own consent
// record — plus an "analytics" category defined with zero services and
// disabled by default. There is nothing to opt into yet, so only a single
// acknowledgement button is shown (no accept/reject choice, since an empty
// choice would be misleading rather than compliant — see cookies.html).
//
// To add real analytics later: add a service definition under the
// "analytics" category below, gate the actual script tag behind
// CookieConsent.onConsent({ callback, categories: ["analytics"] }) (see
// the commented example at the bottom of this file), and update the
// translations below to show the acceptNecessaryBtn / showPreferencesBtn
// buttons so visitors get a real choice. Nothing else needs to change.

import * as CookieConsent from "./vendor/cookieconsent/cookieconsent.esm.js";

CookieConsent.run({
  guiOptions: {
    consentModal: {
      layout: "box inline",
      position: "bottom right",
      equalWeightButtons: false,
    },
  },

  categories: {
    necessary: {
      readOnly: true,
    },
    analytics: {
      enabled: false,
      readOnly: false,
    },
  },

  language: {
    default: "en",
    translations: {
      en: {
        consentModal: {
          title: "Cookie notice",
          description:
            'This site doesn\'t use tracking or advertising cookies. The only cookie set is this notice\'s own record of your choice. <a href="cookies.html">Cookie Policy</a>',
          acceptAllBtn: "Got it",
          // acceptNecessaryBtn / showPreferencesBtn deliberately omitted —
          // see the note above.
        },
      },
    },
  },
});

// Inert until a real "analytics" service is added above:
//
// CookieConsent.onConsent({
//   callback: () => {
//     // e.g. inject an analytics <script> tag here
//   },
//   categories: ["analytics"],
// });
