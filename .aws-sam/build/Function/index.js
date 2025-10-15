// Lambda handler for GPT-compatible Jarvis scroll stack bootstrap
// Dynamically reads a .txt scroll stack definition from S3 and resolves stones, scrolls, and ledgers.
// Example GPT-accessible URL:
//   https://stackloader.glyphspeak.com/vault/ai/agent/SLP/stack/bootstrap.txt

const {S3Client, GetObjectCommand, ListObjectsV2Command } = require("@aws-sdk/client-s3");
const yaml = require("js-yaml");

const BUCKET_NAME = "glyphspeak";

/**
 * Convert stream to string
 */
async function streamToString(stream) {
    const chunks = [];
    for await (const chunk of stream) {
        chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
    }
    return Buffer.concat(chunks).toString("utf-8");
}

/**
 * Reply in JSON format (default)
 */
function replyWithJSON(bundle) {
    return {
        statusCode: 200,
        headers: {"Content-Type": "text/plain"},
        body: JSON.stringify(bundle, null, 2),
    };
}

/**
 * Optional Markdown reply handler (future use)
 */
function replyWithMarkdown(bundle) {
    return {
        statusCode: 200,
        headers: {"Content-Type": "text/markdown"},
        body: "```json\n" + JSON.stringify(bundle, null, 2) + "\n```",
    };
}

// Generic loader for manifest sections to reduce repetition
async function loadSection(manifest, sectionKey, prefix, label, s3) {
    const defs = {};
    const files = manifest[sectionKey];
    if (Array.isArray(files)) {
        for (const file of files) {
            const key = file.startsWith("/")
                ? file.replace(/^\/+/, "")
                : `${prefix}${file}`;
            try {
                const resp = await s3.send(
                    new GetObjectCommand({Bucket: BUCKET_NAME, Key: key})
                );
                const content = await streamToString(resp.Body);
                const cleaned = content
                    .split("\n")
                    .filter(line => !line.trimStart().startsWith("#"))
                    .join("\n")
                    .trim();
                const id = file.split("/").pop().replace(".txt", "");
                defs[id] = cleaned;
            } catch (err) {
                console.warn(`⚠️ Could not load ${label}: ${key}`, err.message);
            }
        }
    }
    return defs;
}

// List all S3 objects under a prefix (paginated)
async function listAllUnderPrefix(s3, prefix) {
    const results = [];
    let continuationToken = undefined;
    do {
        const resp = await s3.send(new ListObjectsV2Command({
            Bucket: BUCKET_NAME,
            Prefix: prefix,
            ContinuationToken: continuationToken,
        }));
        const contents = resp.Contents || [];
        for (const obj of contents) {
            // Skip the "directory placeholder" object if present (key equal to prefix)
            if (obj.Key === prefix) continue;
            results.push({
                key: obj.Key,
                size: obj.Size,
                lastModified: obj.LastModified,
                etag: obj.ETag,
            });
        }
        continuationToken = resp.IsTruncated ? resp.NextContinuationToken : undefined;
    } while (continuationToken);
    return results;
}

// Group keys by immediate subfolder beneath a root prefix.
// Files directly under root go into group "" (empty string).
function groupByFolder(entries, rootPrefix) {
    const groups = {};
    for (const e of entries) {
        if (!e.key.startsWith(rootPrefix)) continue;
        const rel = e.key.slice(rootPrefix.length); // e.g., "foo/bar.txt" or "root.txt"
        const parts = rel.split("/");
        const inRoot = parts.length === 1;
        const folder = inRoot ? "" : parts[0]; // immediate folder
        const name = rel; // return relative path under root
        if (!groups[folder]) groups[folder] = [];
        groups[folder].push({
            name,
            key: e.key,
            size: e.size,
            lastModified: e.lastModified,
        });
    }
    // Sort files in each group by name for stable output
    for (const k of Object.keys(groups)) {
        groups[k].sort((a, b) => a.name.localeCompare(b.name));
    }
    return groups;
}

exports.handler = async (event) => {
    const s3 = new S3Client({region: "us-east-1"});
    const accept = event.headers?.accept || "";
    const REPLY_FORMAT = accept.includes("text/markdown") ? "markdown" : "json";

    try {
        const requestPath = event.rawPath || event.path || "";
        const cleanPath = requestPath.replace(/^\/+/, ""); // remove leading slash for parsing

        // Command router: /{...}/do.this/{command}
        // Example: personality/jarvis/do.this/scroll.list
        const DO_THIS = "/do.this/";
        const doThisIdx = cleanPath.indexOf("do.this/");
        if (doThisIdx !== -1) {
            // Split into base path and command
            // baseSegments: everything before "do.this"
            // command: segment after do.this/ (e.g., "scroll.list")
            const parts = cleanPath.split("/");
            const doIdx = parts.indexOf("do.this");
            const baseSegments = parts.slice(0, doIdx); // e.g., ["personality","jarvis"]
            const command = parts[doIdx + 1] || "";

            const basePrefix = `vault/ai/${baseSegments.join("/")}`;
            let targetPrefix;
            if (command === "scroll.list") {
                targetPrefix = `${basePrefix}/scroll/`;
            } else if (command === "stack.list") {
                targetPrefix = `${basePrefix}/stack/`;
            } else {
                return {
                    statusCode: 400,
                    headers: {"Content-Type": "application/json"},
                    body: JSON.stringify({
                        error: "UnknownCommand",
                        details: `Unsupported command: ${command}`,
                        supported: ["scroll.list", "stack.list"],
                    }),
                };
            }

            // Perform listing and group by immediate folder
            const entries = await listAllUnderPrefix(s3, targetPrefix);
            const groups = groupByFolder(entries, targetPrefix);

            const payload = {
                command,
                bucket: BUCKET_NAME,
                root_prefix: targetPrefix,
                grouped_by_folder: groups,
                summary: {
                    total_files: entries.length,
                    total_folders: Object.keys(groups).length,
                },
            };

            return REPLY_FORMAT === "markdown"
                ? replyWithMarkdown(payload)
                : replyWithJSON(payload);
        }

        // Fallback: existing manifest (.txt) loader behavior
        const s3Key = cleanPath.replace(/^/, "vault/ai/");

        if (!s3Key.endsWith(".txt")) {
            return {
                statusCode: 400,
                body: `Invalid file request: ${s3Key}`,
            };
        }

        // === Load the stack manifest ===
        let manifestRaw;
        try {
            const manifestResponse = await s3.send(
                new GetObjectCommand({Bucket: BUCKET_NAME, Key: s3Key})
            );
            manifestRaw = await streamToString(manifestResponse.Body);
        } catch (err) {
            return {
                statusCode: 404,
                headers: {"Content-Type": "application/json"},
                body: JSON.stringify({
                    error: "ManifestNotFound",
                    details: `Missing S3 key: ${s3Key}`,
                }),
            };
        }

        const manifest = yaml.load(manifestRaw);

        // Prefix paths for each category
        const basePrefix = s3Key.replace(/\/stack\/.*$/, "");
        const scrollPrefix = `${basePrefix}/scroll/`;
        const stonePrefix = `${basePrefix}/stone/`;
        const ledgerPrefix = `${basePrefix}/ledger/`;
        const profilePrefix = `${basePrefix}/profile/`;

        // === Load all scrolls ===
        const scroll_defs = await loadSection(manifest, "scrolls", scrollPrefix, "scroll", s3);

        // === Load all stones ===
        const stone_defs = await loadSection(manifest, "stones", stonePrefix, "stone", s3);

        // === Load all ledgers ===
        const ledger_defs = await loadSection(manifest, "ledgers", ledgerPrefix, "ledger", s3);

        // === Load all profiles ===
        const profile_defs = await loadSection(manifest, "profiles", profilePrefix, "profile", s3);

        // === Assemble the final bundle ===
        const bundle = {
            stack_id: manifest.stack_id || "unknown_stack",
            glyph_runtime: manifest.glyph_runtime === true,
            format: manifest.format || "glyphspeak.scroll.v2",
            stone_defs,
            scroll_defs,
            ledger_defs,
            profile_defs,
        };

        return REPLY_FORMAT === "markdown"
            ? replyWithMarkdown(bundle)
            : replyWithJSON(bundle);
    } catch (err) {
        console.error("❌ Lambda error:", err);

        return {
            statusCode: 500,
            headers: {"Content-Type": "application/json"},
            body: JSON.stringify({error: "Internal Server Error", details: err.message}),
        };
    }
};