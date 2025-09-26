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

/**
 * Reply with Markdown format
 * @param bundle
 * @returns {{statusCode: number, headers: {"Content-Type": string}, body: string}}
 */
function replyWithMarkdown(bundle) {
    let markdown = `# Scroll Stack: ${bundle.stack_id}\n\n`;
    markdown += `**Merge Order:** ${bundle.merge_order.join(" → ")}\n\n`;

    for (const scrollId of bundle.merge_order) {
        const scrollText = bundle.scrolls[scrollId];
        markdown += `## Scroll: ${scrollId}\n\n`;
        markdown += "```yaml\n";
        markdown += scrollText.trim() + "\n";
        markdown += "```\n\n";
    }

    return {
        statusCode: 200,
        headers: {
            "Content-Type": "text/markdown"
        },
        body: markdown,
    };
}

exports.handler = async (event) => {
    // IDE wants this explicitly typed, even though it's fine
    /** @type {import("@aws-sdk/client-s3").S3Client} */
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

        if (REPLY_FORMAT === "json") {
            return replyWithJSON(bundle);
        }

        if (REPLY_FORMAT === "markdown") {
            return replyWithMarkdown(bundle);
        }
    } catch (err) {
        console.error("❌ Lambda error:", err);

        return {
            statusCode: 500,
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ error: "Internal Server Error", details: err.message }),
        };
    }
};