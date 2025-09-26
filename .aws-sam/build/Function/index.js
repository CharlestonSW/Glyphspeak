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

exports.handler = async (event) => {
    // IDE wants this explicitly typed, even though it's fine
    /** @type {import("@aws-sdk/client-s3").S3Client} */
    const s3 = new S3Client({ region: "us-east-1" });

    try {
        const requestPath = event.rawPath || event.path || "";
        const s3Key = requestPath.replace(/^\/+/, "vault/ai/");

        if (!s3Key.endsWith(".txt")) {
            return {
                statusCode: 400,
                body: `Invalid file request: ${s3Key}`,
            };
        }

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

        const scrolls = {};
        const scrollPrefix = s3Key.replace(/\/stack\/.*$/, "/scroll/");

        for (const [scrollId, fileName] of Object.entries(manifest.scrolls || {})) {
            const scrollKey = `${scrollPrefix}${fileName}`;
            try {
                const scrollResponse = await s3.send(
                    new GetObjectCommand({ Bucket: BUCKET_NAME, Key: scrollKey })
                );
                const scrollContent = await streamToString(scrollResponse.Body);

                // Diagnostic logging
                if (!scrollContent || scrollContent.trim() === "") {
                    console.warn(`⚠️ Scroll loaded but appears empty: ${scrollId} (${scrollKey})`);
                } else {
                    console.log(`✅ Loaded scroll: ${scrollId} (${scrollKey})`);
                    console.log("Preview:", scrollContent.slice(0, 120).replace(/\n/g, " ") + "...");
                }

                scrolls[scrollId] = scrollContent;
            } catch (err) {
                console.error(`❌ Failed to load scroll: ${scrollId} → ${scrollKey}`, err);
                return {
                    statusCode: 404,
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        error: "ScrollNotFound",
                        details: `Missing S3 key: ${scrollKey}`,
                    }),
                };
            }
        }

        const bundle = {
            stack_id: manifest.scroll_id || "unknown_stack",
            merge_order: manifest.merge_order || Object.keys(scrolls),
            scrolls,
        };

        return {
            statusCode: 200,
            headers: { "Content-Type": "text/plain" },
            body: JSON.stringify(bundle, null, 2),
        };
    } catch (err) {
        console.error("❌ Lambda error:", err);

        return {
            statusCode: 500,
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ error: "Internal Server Error", details: err.message }),
        };
    }
};