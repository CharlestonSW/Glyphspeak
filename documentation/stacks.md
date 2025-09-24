# Stacks

Stacks are a combination of [scrolls](scrolls.md) that are loaded or merged in a specific order.

Stacks of scrolls can be served in a long merged scroll by using the Stack Loader documented below.

# Operation

## The Stack Loader

The stack loader is an applet that loads in a stack definition.
The applet returns a single combined text from all the scrolls listed on the stack.
This allows an AI agent to trust a single URL (the stack loader) that returns the contents from 2..n scrolls.

## Using Stack Loader

The Stack Loader lives here: https://stackloader.glyphspeak.com/

It accesses the vault/ai folder S3 glyphspeak bucket.

You will want to add path to the agent or personality stack you wish to load.

Some examples:
https://stackloader.glyphspeak.com/personality/jarvis/stack/bootstrap.txt
https://stackloader.glyphspeak.com/agent/SLP/stack/store_pages.txt

### Simplified Architecture

    GPT ↔️ fetches → https://stackloader.glyphspeak.com/agent/SLP/stack/store_pages.txt
    
        │
        ▼
    
    API Gateway (proxy + path params)
    
        │
        ▼
    
    Lambda Function
        │ - Parses path: vault/ai/agent/SLP  
        │ - Reads stack file from S3         
        │ - Loads scrolls from S3            
        │ - Builds scroll_bundle             
        │ - Returns as JSON (content-type: text/plain)
