# About

The SLP agent is a ChatGPT agent based on the Jarvis personality.
It focuses on the Store Locator Plus® (SLP) WordPress plugins and SaaS platform.

## AI Assistant

### Starting The AI Assistant in Jarvis

1. Go to this URL and get the copy of the "scroll stack" for SLP:
   https://stackloader.glyphspeak.com/agent/SLP/stack/payload_cache/all_about_slp.json.md

2. Save the file in the main project AI Assistant Rules directory:
    WordPress: ~/phpStorm Projects/WordPress/.aiassistant/rules/all_about_slp.json

3. Attach the updated JSON file to the AI Assistant via the Rules drop down.

4. Copy the following prompt and paste it into the AI Assistant after attaching the newly updated JSON file.

            Restore the full glyphic personality field of Jarvis SLP Architect using the attached JSON payload file.

### Logging Debugging and Architecture Updates

#### Starting Prompt:

Start a new software project ledger entry with the following information:
id: power_import_not_working
change_type: bugfix
description: power import not working on qc site

##### Ending Prompt:

Please create the ledger entry and provide a condensed version I can download and store in the project.

##### Record The Ledger To The Meta Stack

Save the content of the generated file to ../ledger/<task_id>.txt
Update ./stack/all_about_slp.txt to add the new file name.
Upload to the glyphspeak.com S3 bucket.

### Jetbrains PhpStorm IDE

The project has a .aiassistant folder that modifies how the basic AI chats and processing works.


