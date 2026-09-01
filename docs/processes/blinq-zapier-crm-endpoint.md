# Blinq Zapier CRM Endpoint

Status: Implemented locally
Date: 2026-09-01

## Purpose

Receive Blinq contact captures through Zapier and add or update the person in the Mojo AI Summits CRM.

This replaces the earlier native mobile scanner direction for the first implementation. Blinq owns the scanning/contact exchange experience. Zapier delivers the normalized contact payload to Mojo.

## Endpoint

`POST /api/blinq-contact`

Production URL:

`https://mojoaisummits.com/api/blinq-contact`

## Authentication

Use API by Zapier when possible.

Set one of these Cloudflare environment secrets:

- `MOJO_BLINQ_ZAPIER_API_KEY` preferred
- `MOJO_ZAPIER_CRM_API_KEY`
- `BLINQ_ZAPIER_API_KEY`

Zapier may send the key with either header:

```http
Authorization: Bearer <api-key>
```

or:

```http
x-api-key: <api-key>
```

Do not put the API key in the URL or in the JSON payload.

## Required Payload

The endpoint accepts JSON, `application/x-www-form-urlencoded`, or multipart form payloads.

```json
{
  "name": "John Smith",
  "job_title": "Marketing Manager",
  "company": "Acme Corp",
  "email": "john@acmecorp.com",
  "phone": "+1234567890",
  "profile_photo": "https://example.com/photo.jpg"
}
```

Validation:

- `name` is required.
- `job_title` is required and maps to CRM `title`.
- `company` is required.
- `email` is required and must be valid.
- `phone` is required and normalized where possible.
- `profile_photo` is required and must be an `http` or `https` URL.

## Optional Routing Fields

Zapier can add these fields when Blinq or the Zap includes a selection step:

- `classification`
- `relationship_type`
- `contact_type`
- `crm_type`
- `type`
- `notes`
- `event_slug`
- `event_name`
- `relationship_owner`
- `next_action`
- `linkedin_profile_url`

Supported classification values and aliases:

- `potential-guest`
- `featured-guest`
- `speaker`
- `roundtable-leader`
- `partner-candidate`
- `strategic-partner-contact`

If no classification is sent, the endpoint defaults to `potential-guest`.

## CRM Behavior

- Upserts by verified email under `crm:contact:{email}`.
- Maps Blinq `profile_photo` to CRM `photoUrl` and `profilePhotoUrl`.
- Marks phone status as `verified` because Blinq sends verified email/contact data and Zapier is the trusted integration path.
- Appends a CRM activity record with source `blinq-zapier`.
- Appends a contact event named `Blinq contact capture`.
- Stores original Blinq/Zapier payload keys for audit/debugging.
- Updates a company rollup:
  - Guest-style classifications write to `crm:company:{company-slug}`.
  - Partner-style classifications write to `partner-company:{company-slug}`.

## Zapier Setup

Recommended Zapier product: API by Zapier.

Connection/auth:

- Base URL: `https://mojoaisummits.com`
- Authentication type: API key or bearer token
- Header: `Authorization: Bearer <api-key>`

Action:

- Method: `POST`
- URL path: `/api/blinq-contact`
- Body type: JSON
- Required fields: `name`, `job_title`, `company`, `email`, `phone`, `profile_photo`
- Optional classification field from a Zap step when Scott chooses potential guest vs partner.

Expected success response:

```json
{
  "ok": true,
  "source": "blinq-zapier",
  "contactKey": "crm:contact:john@acmecorp.com",
  "email": "john@acmecorp.com",
  "created": true,
  "classification": "potential-guest"
}
```

