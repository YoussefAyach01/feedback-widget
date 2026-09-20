# Retour: business one-pager

## Buyer and problem

Small SaaS founders, agencies and freelance web developers in Morocco and francophone Africa who ship client sites
and have no channel for user feedback beyond WhatsApp and email. Canny, Featurebase and UserVoice are English-only
and start at 50-400 USD/month. Retour is a one-line embed with a FR/AR/EN widget and a public roadmap, priced for small budgets.

## Pricing

| Plan           | MAD                      | USD             | Includes                                                                  |
| -------------- | ------------------------ | --------------- | ------------------------------------------------------------------------- |
| Gratuit        | 0                        | 0               | 1 project, unlimited feedback, roadmap, widget                            |
| Pro            | 79 / month or 790 / year | about 8 / month | unlimited projects (later: email notifications, remove "Retour" branding) |
| Agence (later) | 249 / month              | about 25        | white-label + client logins                                               |

## First 5 customers

1. Web agencies/freelancers you already know (Oujda, Casablanca, Rabat): offer to install Retour free on 3 of their
   client sites for a month; the agency sells "feedback + roadmap" as an add-on line item.
2. Moroccan indie/SaaS builders on Twitter/X, LinkedIn and dev Discords: post a 30-second video of the widget
   collecting a vote live, with the one-line install. Offer lifetime Pro to the first 5.
3. Dogfood in your own products (ci-pulse, portfolio, Tuile): a real public roadmap page is the best demo.

## Accounts needed to go live

Domain, VPS/Fly.io with a volume, payment method (Stripe needs a non-Moroccan entity; otherwise manual bank/cash-plus
invoicing at first), and Resend or another mail service once owner notifications are built.

## Honest limits

- Crowded category; the edge is price, locale and one-line setup, not features.
- Free tier is generous (feedback is unlimited), so conversion depends on the multi-project and notification features not yet built.
- Vote integrity is basic (anonymous voter id + IP rate limit).
- No owner email notifications yet: owners must check the dashboard.
- Single-process in-memory rate limiting; needs Redis if you run more than one instance.
