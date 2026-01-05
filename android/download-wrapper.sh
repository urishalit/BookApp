#!/bin/bash
# Script to download the correct Gradle wrapper JAR

cd "$(dirname "$0")"

echo "Downloading Gradle wrapper JAR..."

# Download from GitHub releases (most reliable)
curl -L -o gradle/wrapper/gradle-wrapper.jar \
  https://github.com/gradle/gradle/raw/v8.11.1/gradle/wrapper/gradle-wrapper.jar

# Verify the download
if [ -f "gradle/wrapper/gradle-wrapper.jar" ]; then
    SIZE=$(stat -f%z gradle/wrapper/gradle-wrapper.jar 2>/dev/null || stat -c%s gradle/wrapper/gradle-wrapper.jar 2>/dev/null)
    if [ "$SIZE" -gt 50000 ]; then
        echo "✓ Successfully downloaded gradle-wrapper.jar ($SIZE bytes)"
        exit 0
    else
        echo "✗ Downloaded file is too small. Trying alternative method..."
        rm -f gradle/wrapper/gradle-wrapper.jar
    fi
fi

# Alternative: Download from Maven Central
echo "Trying alternative download source..."
curl -L -o gradle/wrapper/gradle-wrapper.jar \
  https://repo1.maven.org/maven2/org/gradle/gradle-wrapper/8.11.1/gradle-wrapper-8.11.1.jar

if [ -f "gradle/wrapper/gradle-wrapper.jar" ]; then
    SIZE=$(stat -f%z gradle/wrapper/gradle-wrapper.jar 2>/dev/null || stat -c%s gradle/wrapper/gradle-wrapper.jar 2>/dev/null)
    if [ "$SIZE" -gt 50000 ]; then
        echo "✓ Successfully downloaded gradle-wrapper.jar ($SIZE bytes)"
        exit 0
    fi
fi

echo "✗ Failed to download wrapper. Please download manually from:"
echo "  https://github.com/gradle/gradle/raw/v8.11.1/gradle/wrapper/gradle-wrapper.jar"
echo "  and save it to: android/gradle/wrapper/gradle-wrapper.jar"
exit 1

