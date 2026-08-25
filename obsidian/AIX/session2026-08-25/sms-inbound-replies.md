# 2026-08-25 SMS Inbound Replies

## Outcome

- Added a Cloudflare Pages Function plan for `/api/sms-inbound` that accepts AWS SNS HTTP notifications only after SNS signature verification and topic ARN matching.
- Created AWS SNS topic `arn:aws:sns:us-east-2:238043188139:mojo-sms-inbound-replies`.
- Active production SMS number remains `+18556268271`, phone number id `phone-7116c6268f1442c89cc4cd8a14c93bfa`, with `TwoWayEnabled=false` until the endpoint is deployed and subscribed.

## Wiring Order

1. Deploy the `/api/sms-inbound` endpoint.
2. Optional: set `MOJO_SMS_INBOUND_SNS_TOPIC_ARN` or `SMS_INBOUND_SNS_TOPIC_ARN` to override the default topic ARN `arn:aws:sns:us-east-2:238043188139:mojo-sms-inbound-replies`.
3. Subscribe `https://mojoaisummits.com/api/sms-inbound` to the SNS topic with protocol `https`.
4. Confirm the subscription is active. The endpoint auto-confirms signed `SubscriptionConfirmation` messages.
5. Enable two-way SMS on phone number id `phone-7116c6268f1442c89cc4cd8a14c93bfa` with the SNS topic ARN.

## Runtime Behavior

- Inbound SMS replies are stored under `sms:inbound:message:{id}`.
- Duplicate SNS deliveries are deduped with `sms:inbound:id:{id}`.
- Matching CRM contacts are found by normalized phone number and updated with an `sms` activity.
- Staff email notifications use `MOJO_SMS_INBOUND_NOTIFICATION_RECIPIENTS` or existing registration notification recipients, falling back to Scott and Angel only.
- STOP-style replies are classified as opt-outs and recorded under `sms:opt-out:{phoneDigits}`.
