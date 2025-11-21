#!/bin/bash

# Script to copy image files from /mnt/data/ to ./assets/images/
# Run this script after ensuring /mnt/data/ is accessible

SOURCE_DIR="/mnt/data"
DEST_DIR="./assets/images"

# Create destination directory if it doesn't exist
mkdir -p "$DEST_DIR"

echo "Copying image files from $SOURCE_DIR to $DEST_DIR..."

# Hero & About
if [ -f "$SOURCE_DIR/A_digital_photograph_for_DNA_Clinic's_homepage_ban.png" ]; then
    cp "$SOURCE_DIR/A_digital_photograph_for_DNA_Clinic's_homepage_ban.png" "$DEST_DIR/"
    echo "✓ Copied: Hero banner image"
else
    echo "✗ Not found: Hero banner image"
fi

if [ -f "$SOURCE_DIR/A_high-resolution_digital_photograph_captures_a_de.png" ]; then
    cp "$SOURCE_DIR/A_high-resolution_digital_photograph_captures_a_de.png" "$DEST_DIR/"
    echo "✓ Copied: Aesthetic Smile Intro / Teeth Whitening"
else
    echo "✗ Not found: Aesthetic Smile Intro / Teeth Whitening"
fi

# Dental Services
if [ -f "$SOURCE_DIR/A_high-resolution_digital_photograph_provides_a_de.png" ]; then
    cp "$SOURCE_DIR/A_high-resolution_digital_photograph_provides_a_de.png" "$DEST_DIR/"
    echo "✓ Copied: Dental Implants"
else
    echo "✗ Not found: Dental Implants"
fi

if [ -f "$SOURCE_DIR/8D1C1328-403D-4126-9E9C-D6EB77C06A79.jpeg" ]; then
    cp "$SOURCE_DIR/8D1C1328-403D-4126-9E9C-D6EB77C06A79.jpeg" "$DEST_DIR/"
    echo "✓ Copied: Orthodontics"
else
    echo "✗ Not found: Orthodontics"
fi

if [ -f "$SOURCE_DIR/A_high-resolution_digital_photograph_captures_a_yo.png" ]; then
    cp "$SOURCE_DIR/A_high-resolution_digital_photograph_captures_a_yo.png" "$DEST_DIR/"
    echo "✓ Copied: Cosmetic Dentistry / General Dentistry"
else
    echo "✗ Not found: Cosmetic Dentistry / General Dentistry"
fi

# Aesthetic Services
if [ -f "$SOURCE_DIR/D606A085-2626-409E-AE6D-C85057AB305B.jpeg" ]; then
    cp "$SOURCE_DIR/D606A085-2626-409E-AE6D-C85057AB305B.jpeg" "$DEST_DIR/"
    echo "✓ Copied: Botox & Fillers"
else
    echo "✗ Not found: Botox & Fillers"
fi

if [ -f "$SOURCE_DIR/A7216D23-6FEA-4E6C-960E-5FE1BAC60D73.jpeg" ]; then
    cp "$SOURCE_DIR/A7216D23-6FEA-4E6C-960E-5FE1BAC60D73.jpeg" "$DEST_DIR/"
    echo "✓ Copied: Dermal Fillers"
else
    echo "✗ Not found: Dermal Fillers"
fi

if [ -f "$SOURCE_DIR/A_photograph_captures_a_close-up_of_a_skincare_tre.png" ]; then
    cp "$SOURCE_DIR/A_photograph_captures_a_close-up_of_a_skincare_tre.png" "$DEST_DIR/"
    echo "✓ Copied: Chemical Peels"
else
    echo "✗ Not found: Chemical Peels"
fi

if [ -f "$SOURCE_DIR/A_photograph_showcases_a_young_Caucasian_woman_und.png" ]; then
    cp "$SOURCE_DIR/A_photograph_showcases_a_young_Caucasian_woman_und.png" "$DEST_DIR/"
    echo "✓ Copied: Laser Skin Treatments"
else
    echo "✗ Not found: Laser Skin Treatments"
fi

if [ -f "$SOURCE_DIR/A_high-resolution_digital_photograph_captures_a_young_Cauc.png" ]; then
    cp "$SOURCE_DIR/A_high-resolution_digital_photograph_captures_a_young_Cauc.png" "$DEST_DIR/"
    echo "✓ Copied: Facial Aesthetics"
else
    echo "✗ Not found: Facial Aesthetics"
fi

if [ -f "$SOURCE_DIR/A_high-resolution_close-up_photograph_captures_a_l.png" ]; then
    cp "$SOURCE_DIR/A_high-resolution_close-up_photograph_captures_a_l.png" "$DEST_DIR/"
    echo "✓ Copied: Anti-Aging Solutions"
else
    echo "✗ Not found: Anti-Aging Solutions"
fi

echo ""
echo "Copy operation complete!"
echo "Files copied to: $DEST_DIR"
ls -lh "$DEST_DIR"

