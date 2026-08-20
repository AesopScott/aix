## 2026-08-20T09:07:30-06:00

- Agent: codex
- Project: aix
- Target: C:\Users\scott\Code\aix
- Source: completed turn
- Classification: valuable
- Information Type: Architecture
- Reason: durable storage upload behavior change

### Prompt Memory

Scott reported that `/files/` storage uploads still showed the browser-level `Failed to fetch` error when uploading normal documents, including a PDF selected in the upload form.

### Assistant Outcome

Changed the `/files/` upload frontend so every non-empty selected file uses the existing authenticated R2 multipart flow immediately. The browser now sends only metadata through `FormData`, then sends file contents as raw 16 MiB part request bodies. Zero-byte files remain eligible for the simple upload path.

This avoids the fragile single `multipart/form-data` request path that can fail before `/api/storage` returns a useful JSON error, and it covers PDFs and office documents as well as large media.

Updated `docs/processes/mojoaisummits-storage-process.md` to describe the new default multipart behavior.

Verified locally:
- `node --check functions/api/storage.js`
- inline `/files/` script parse check
- Wrangler Pages/R2 local test with a generated 256 KiB PDF-like payload: multipart create, upload part, complete, list, and delete all succeeded.
