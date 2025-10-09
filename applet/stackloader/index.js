// Lambda handler for GPT-compatible Jarvis scroll stack bootstrap
// Dynamically reads a .txt scroll stack definition from S3 and resolves stones, scrolls, and ledgers.
// Example GPT-accessible URL:
//   https://stackloader.glyphspeak.com/vault/ai/agent/SLP/stack/bootstrap.txt

const { S3Client, GetObjectCommand } = require("@aws-sdk/client-s3");
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
        headers: { "Content-Type": "text/plain" },
        body: JSON.stringify(bundle, null, 2),
    };
}

/**
 * Optional Markdown reply handler (future use)
 */
function replyWithMarkdown(bundle) {
    return {
        statusCode: 200,
        headers: { "Content-Type": "text/markdown" },
        body: "```json\n" + JSON.stringify(bundle, null, 2) + "\n```",
    };
}

exports.handler = async (event) => {
    const s3 = new S3Client({ region: "us-east-1" });
    const accept = event.headers?.accept || "";
    const REPLY_FORMAT = accept.includes("text/markdown") ? "markdown" : "json";

    try {
        const requestPath = event.rawPath || event.path || "";
        const s3Key = requestPath.replace(/^\/+/, "vault/ai/");

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
                new GetObjectCommand({ Bucket: BUCKET_NAME, Key: s3Key })
            );
            manifestRaw = await streamToString(manifestResponse.Body);
        } catch (err) {
            return {
                statusCode: 404,
                headers: { "Content-Type": "application/json" },
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

        // === Load all scrolls ===
        const scroll_defs = {};
        if (Array.isArray(manifest.scrolls)) {
            for (const scrollFile of manifest.scrolls) {
                let scrollKey = scrollFile.startsWith("/")
                    ? scrollFile.replace(/^\/+/, "")
                    : `${scrollPrefix}${scrollFile}`;

                try {
                    const scrollResp = await s3.send(
                        new GetObjectCommand({ Bucket: BUCKET_NAME, Key: scrollKey })
                    );
                    const scrollContent = await streamToString(scrollResp.Body);
                    const scrollId = scrollFile.split("/").pop().replace(".txt", "");
                    scroll_defs[scrollId] = scrollContent;
                } catch (err) {
                    console.warn(`⚠️ Could not load scroll: ${scrollKey}`, err.message);
                }
            }
        }

        // === Load all stones ===
        const stone_defs = {};
        if (Array.isArray(manifest.stones)) {
            for (const stoneFile of manifest.stones) {
                let stoneKey = stoneFile.startsWith("/")
                    ? stoneFile.replace(/^\/+/, "")
                    : `${stonePrefix}${stoneFile}`;

                try {
                    const stoneResp = await s3.send(
                        new GetObjectCommand({ Bucket: BUCKET_NAME, Key: stoneKey })
                    );
                    const stoneContent = await streamToString(stoneResp.Body);
                    const stoneId = stoneFile.split("/").pop().replace(".txt", "");
                    stone_defs[stoneId] = stoneContent;
                } catch (err) {
                    console.warn(`⚠️ Could not load stone: ${stoneKey}`, err.message);
                }
            }
        }

        // === Load all ledgers (NEW) ===
        const ledger_defs = {};
        if (Array.isArray(manifest.ledger)) {
            for (const ledgerFile of manifest.ledger) {
                let ledgerKey = ledgerFile.startsWith("/")
                    ? ledgerFile.replace(/^\/+/, "") // Absolute path
                    : `${ledgerPrefix}${ledgerFile}`; // Relative to /ledger/

                try {
                    const ledgerResp = await s3.send(
                        new GetObjectCommand({ Bucket: BUCKET_NAME, Key: ledgerKey })
                    );
                    const ledgerContent = await streamToString(ledgerResp.Body);
                    const ledgerId = ledgerFile.split("/").pop().replace(".txt", "");
                    ledger_defs[ledgerId] = ledgerContent;
                } catch (err) {
                    console.warn(`⚠️ Could not load ledger: ${ledgerKey}`, err.message);
                }
            }
        }

        // === Assemble the final bundle ===
        const bundle = {
            stack_id: manifest.stack_id || "unknown_stack",
            glyph_runtime: manifest.glyph_runtime === true,
            format: manifest.format || "glyphspeak.scroll.v2",
            stone_defs,
            scroll_defs,
            ledger_defs, // ✅ New addition
        };

        return REPLY_FORMAT === "markdown"
            ? replyWithMarkdown(bundle)
            : replyWithJSON(bundle);
    } catch (err) {
        console.error("❌ Lambda error:", err);

        return {
            statusCode: 500,
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ error: "Internal Server Error", details: err.message }),
        };
    }
};