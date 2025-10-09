# Stack Loader Lambda Applet

The stack loader applet combines various YAML-like files into a single JSON file.

This is served up via a public URL with a txt file extension that determines which YAML file to load first.

Files are stored on the S3 glyphspeak bucket.

# Updating The Applet

Revise the index.js file

Zip the applet directory

    cd applet/stackloader
    zip -r scroll-loader.zip .

    Use AWS Toolkit to connect to Lambda

    Look for ScrollStackLoader on Lambda

    Update the function




# 📘 Stack Loader Manifest Reference
*Version 1.1 — updated for ledger support (October 2025)*  

---

## 🪶 Overview

A **stack manifest** defines the set of files needed to reconstruct a Jarvis AI personality or subsystem.  
It tells the **Stack Loader Lambda** which **stones** (glyph definitions), **scrolls** (functional behaviors), and **ledgers** (data archives or memory templates) to load.  

Each stack manifest is stored as a `.txt` or `.yaml` file inside the `stack/` directory, and fetched by the loader through S3 or the Stackloader API.  

---

## ⚙️ Manifest Structure

```yaml
{
  "stack_id": "example_stack",
  "glyph_runtime": true,
  "format": "glyphspeak.scroll.v2",
  "stones": [
    "/vault/stone/global.txt",
    "/vault/ai/personality/jarvis/stone/jarvis.txt"
  ],
  "scrolls": [
    "identity.txt",
    "do_not_guess.txt",
    "herald.txt",
    "forge.txt"
  ],
  "ledger": [
    "ledger.txt",
    "travel_ledger.txt"
  ]
}
```

---

## 🧱 Top-Level Properties

### 1. `stack_id`
Unique identifier for the stack. Used by the loader as the logical name for the returned `bundle`.  

### 2. `glyph_runtime`
Boolean flag (`true` / `false`) enabling glyphic execution mode during runtime validation.  

### 3. `format`
Optional. Describes the manifest structure version (e.g. `"glyphspeak.scroll.v2"`) for backward compatibility.

### 4. `stones`
Array of file paths pointing to *glyph definition* sources. These define the symbolic lexicon (`stone_defs`), e.g., glyph meaning and traits. Typically live under `/stone/`.

### 5. `scrolls`
Array of file paths pointing to *scroll definitions*. Scrolls define functional logic, behavioral rules, or modular personality components. Typically live under `/scroll/`.

### 6. `ledger`
Array of file paths pointing to *ledger templates*. Ledgers hold structured memory templates, logs, or persistence schemas. Usually stored under `/ledger/`.

---

## 🗂️ Directory Structure (Standardized)

```
jarvis/
│
├── stone/
│   ├── global.txt
│   └── jarvis.txt
│
├── scroll/
│   ├── persona/
│   ├── operational/
│   ├── hybrid/
│   ├── experimental/
│   ├── guardian/
│   ├── identity.txt
│   ├── do_not_guess.txt
│   └── forge.txt
│
├── ledger/
│   ├── ledger.txt
│   ├── travel_ledger.txt
│   └── research_ledger.txt
│
└── stack/
    ├── bootstrap.txt
    ├── software_architect.txt
    ├── travel_advisor_stack.txt
    └── ...
```

---

## ⚡ Loader Behavior Summary

The **Stack Loader (`index.js`)** performs the following steps:

| Step | Operation | Output |
|------|------------|---------|
| 1 | Load the manifest `.txt` from S3. | `manifestRaw` |
| 2 | Parse YAML → JS object. | `manifest` |
| 3 | Load all files listed in `stones[]`. | `stone_defs` |
| 4 | Load all files listed in `scrolls[]`. | `scroll_defs` |
| 5 | Load all files listed in `ledger[]`. | `ledger_defs` |
| 6 | Return a unified `bundle` to GPT or the requesting agent. | `{ stack_id, stone_defs, scroll_defs, ledger_defs }` |

---

## 🧩 Returned JSON Structure

```json
{
  "stack_id": "bootstrap",
  "glyph_runtime": true,
  "format": "glyphspeak.scroll.v2",
  "stone_defs": {
    "global": "<contents of global.txt>"
  },
  "scroll_defs": {
    "identity": "<contents of identity.txt>",
    "do_not_guess": "<contents of do_not_guess.txt>"
  },
  "ledger_defs": {
    "ledger": "<contents of ledger.txt>"
  }
}
```

---

## 🧭 Validation Rules

| Field           | Type    | Required | Notes                              |
|-----------------|---------|----------|------------------------------------|
| `stack_id`      | string  | ✅        | Must be unique per stack           |
| `glyph_runtime` | boolean | ✅        | Default `true`                     |
| `stones`        | array   | ✅        | At least one stone required        |
| `scrolls`       | array   | ✅        | At least one scroll required       |
| `ledger`        | array   | Optional | If none present, stack still valid |
| `format`        | string  | Optional | Default `glyphspeak.scroll.v2`     |

---

## 🪞 Backward Compatibility

Older manifests (pre–October 2025) without the `ledger` field remain valid.  
The updated loader (`index.js`) returns an empty `{}` for `ledger_defs` if none are found.  

---

## 📘 Example Minimal Manifest

```yaml
{
  "stack_id": "bootstrap",
  "glyph_runtime": true,
  "stones": ["/vault/stone/global.txt"],
  "scrolls": ["identity.txt", "do_not_guess.txt"],
  "ledger": ["ledger.txt"]
}
```

---

## 🧠 Developer Notes
- All referenced paths must exist in S3 under the same base path as the manifest (unless absolute).  
- Use lowercase, underscore-delimited file names for consistency.  
- **Ledgers** = persistent data and learned context.  
- **Scrolls** = behavioral and functional logic.  
- The **Archivist 📂 Scroll** relies on `ledger_defs` for persistent data reconstruction.

---

✅ Save this file at:  
`jarvis/docs/stackloader_manifest.md`
