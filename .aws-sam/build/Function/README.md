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


