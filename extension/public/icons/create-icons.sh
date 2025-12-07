#!/bin/bash
# Create simple placeholder icons using ImageMagick or base64

# Check if ImageMagick is available
if command -v convert &> /dev/null; then
    echo "Creating icons with ImageMagick..."
    convert -size 16x16 xc:#1a1a2e -fill white -pointsize 12 -gravity center -annotate +0+0 "BF" icon-16.png
    convert -size 48x48 xc:#1a1a2e -fill white -pointsize 32 -gravity center -annotate +0+0 "BF" icon-48.png
    convert -size 128x128 xc:#1a1a2e -fill white -pointsize 96 -gravity center -annotate +0+0 "BF" icon-128.png
    echo "Icons created successfully!"
else
    echo "ImageMagick not found. Creating minimal placeholder icons..."
    # Create 1x1 pixel PNG as placeholder (valid but minimal)
    # This is a valid 1x1 transparent PNG in base64
    echo "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==" | base64 -d > icon-16.png
    echo "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==" | base64 -d > icon-48.png
    echo "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==" | base64 -d > icon-128.png
    echo "Minimal placeholder icons created. Replace with actual icons before production."
fi
