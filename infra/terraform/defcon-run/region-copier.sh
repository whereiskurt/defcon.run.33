#!/bin/bash

## Run it like this:

# ./region-copier.sh us-east-1 use1 us-west-2 usw2
# ./region-copier.sh us-east-1 use1 ca-central-1 cac1

set -e

# Check if all required arguments are provided
if [ $# -ne 4 ]; then
    echo "Usage: $0 <input_long_region> <input_short_region> <output_long_region> <output_short_region>"
    echo "Example: $0 us-east-1 use1 us-west-2 usw2"
    exit 1
fi

SRC_LONG_REGION=$1
SRC_SHORT_REGION=$2
TGT_LONG_REGION=$3
TGT_SHORT_REGION=$4

echo "Copying from $SRC_LONG_REGION ($SRC_SHORT_REGION) to $TGT_LONG_REGION ($TGT_SHORT_REGION)..."

# Check if input folder exists
if [ ! -d "$SRC_LONG_REGION" ]; then
    echo "Error: Input folder '$SRC_LONG_REGION' does not exist."
    exit 1
fi

# Check if output folder already exists
if [ -d "$TGT_LONG_REGION" ]; then
    read -p "Output folder '$TGT_LONG_REGION' already exists. Do you want to overwrite it? (y/n): " confirm
    if [[ $confirm != [yY] ]]; then
        echo "Operation canceled."
        exit 0
    fi
    rm -rf "$TGT_LONG_REGION"
fi

# Copy the folder structure recursively
echo "Copying folder structure..."
rsync -av --exclude='*/.terragrunt-cache/*' "$SRC_LONG_REGION/" "$TGT_LONG_REGION/"

# Find and replace region names in project.json files
echo "Updating region references in project.json files..."
find "$TGT_LONG_REGION" -name "project.json" -type f -exec grep -l "\"name\":" {} \; | while read -r file; do
    echo "Processing: $file"
    # Replace "name": "input_region. with "name": "output_region.
    sed -i '' "s/\"name\":[[:space:]]*\"$SRC_SHORT_REGION\./\"name\": \"$TGT_SHORT_REGION\./g" "$file"
    sed -i '' "s/$SRC_LONG_REGION/$TGT_LONG_REGION/g" "$file"
done

echo "Updating region references in region.hcl files..."
find "$TGT_LONG_REGION" \( -name "region.hcl" -o -name "resource.hcl" \) -type f -exec grep -l "$SRC_SHORT_REGION" {} \; | while read -r file; do
    echo "Processing: $file"
    # Replace input_region with output_region
    sed -i '' "s/$SRC_SHORT_REGION/$TGT_SHORT_REGION/g" "$file"
    sed -i '' "s/$SRC_LONG_REGION/$TGT_LONG_REGION/g" "$file"
done


echo "Done! Folder structure has been copied from $SRC_LONG_REGION to $TGT_LONG_REGION with region updated from $SRC_SHORT_REGION to $TGT_SHORT_REGION."