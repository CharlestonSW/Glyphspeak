// Lambda handler for GPT-compatible Jarvis scroll stack bootstrap
// Dynamically reads a .txt scroll stack definition from S3 and resolves scrolls
// Example GPT-accessible URL:
//   https://stackloader.glyphspeak.com/vault/ai/agent/SLP/stack/store_pages.txt

const { S3Client, GetObjectCommand } = require("@aws-sdk/client-s3");
const yaml = require("js-yaml");

const BUCKET_NAME = "glyphspeak";

async function streamToString(stream) {
    const chunks = [];
    for await (const chunk of stream) {
        chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
    }
    return Buffer.concat(chunks).toString("utf-8");
}

/**
 * Reply with JSON format
 * @param {any} bundle
 * @returns {import("@aws-lambda/types").APIGatewayProxyResult}
 */
function replyWithJSON(bundle) {
    return {
        statusCode: 200,
        headers: { "Content-Type": "text/plain" },
        body: JSON.stringify(bundle, null, 2),
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

        // Load the scroll stack manifest
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
        const scrollPrefix = s3Key.replace(/\/stack\/.*$/, "/scroll/");
        const stonePrefix = s3Key.replace(/\/stack\/.*$/, "/stone/");

        // Load all scrolls
        const scroll_defs = {};
        if (Array.isArray(manifest.scrolls)) {
            for (const scrollFile of manifest.scrolls) {
                let scrollKey = scrollFile.startsWith("/")
                    ? scrollFile.replace(/^\/+/, "") // absolute S3 path
                    : `${scrollPrefix}${scrollFile}`; // relative to /scroll/

                try {
                    const scrollResponse = await s3.send(
                        new GetObjectCommand({Bucket: BUCKET_NAME, Key: scrollKey})
                    );
                    const scrollContent = await streamToString(scrollResponse.Body);
                    const scrollId = scrollFile.split("/").pop().replace(".txt", "");
                    scroll_defs[scrollId] = scrollContent;
                } catch (err) {
                    console.warn(`⚠️ Could not load scroll: ${scrollKey}`, err.message);
                }
            }
        }

        // Load all stones
        const stone_defs = {};
        if (Array.isArray(manifest.stones)) {
            for (const stoneFile of manifest.stones) {
                let stoneKey = stoneFile.startsWith("/")
                    ? stoneFile.replace(/^\/+/, "") // absolute S3 path
                    : `${stonePrefix}${stoneFile}`; // relative to /stone/

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

        const bundle = {
            stack_id: manifest.stack_id || "unknown_stack",
            glyph_runtime: manifest.glyph_runtime === true,
            format: manifest.format || "glyphspeak.scroll.v2",
            stone_defs,
            scroll_defs
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