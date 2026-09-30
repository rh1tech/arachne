# @arachne/storage

File storage for uploads and generated files: one `Storage` interface with
memory, local-disk and S3 drivers. S3 uses Bun's built-in `S3Client`, so AWS
S3, Cloudflare R2, MinIO, Backblaze B2 and DigitalOcean Spaces all work.

```ts
import { diskStorage, s3Storage, saveUpload, toResponse } from "@arachne/storage";

const storage =
  process.env.NODE_ENV === "production"
    ? s3Storage({ bucket: "uploads", endpoint: process.env.S3_ENDPOINT }) // creds from S3_* / AWS_* env
    : diskStorage({ root: "./data/uploads", baseUrl: "/uploads" });

// In a route with body: s.object({ avatar: s.file({ maxSize: 2_000_000, types: ["image/*"] }) })
const saved = await saveUpload(storage, ctx.body.avatar, { prefix: `users/${user.id}` });
// saved.key = "users/42/3f0e….png", saved.originalName = "Me.PNG"

const file = await storage.get(saved.key);
return file ? toResponse(file, { download: saved.originalName }) : notFound();

await storage.url(saved.key, { expiresIn: 300 });           // S3: presigned GET
await storage.url("incoming/x.bin", { method: "PUT" });     // S3: presigned upload
```

| Method | |
|---|---|
| `put(key, data, { contentType })` | `data`: Blob/File, bytes, string, stream |
| `get(key)` | `StoredFile` (`stream()`, `arrayBuffer()`, `text()`) or `undefined` |
| `head(key)` / `exists(key)` | metadata only |
| `delete(key)` | no error if missing |
| `list(prefix)` | sorted keys |
| `url(key, { expiresIn, method })` | presigned (S3), `publicUrl`/`baseUrl` otherwise |

- Keys are `/`-separated relative paths; `..`, empty segments, backslashes and
  control characters are rejected (`assertKey`).
- `saveUpload` never uses the client's file name as a path; it generates a
  UUID key and keeps the (path-stripped) name as `originalName`.
- `toResponse` streams with `Content-Type`, `Content-Length`, `nosniff`, and an
  RFC 6266 `Content-Disposition` for downloads.

## MCP

`arachne_storage_check_key`, `arachne_storage_api_summary`.
