# Stacks

Stacks are a combination of [scrolls](scrolls.md) that are loaded or merged in a specific order.

# Operation

## The Stack Loader

The stack loader is an applet that loads in a stack definition.
The applet returns a single combined text from all the scrolls listed on the stack.
This allows an AI agent to trust a single URL (the stack loader) that returns the contents from 2..n scrolls.

### Simplified Architecture

    GPT ↔️ fetches → https://stackloader.glyphspeak.com/vault/ai/agent/SLP/stack/store_pages.txt
    
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
