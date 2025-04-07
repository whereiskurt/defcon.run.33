#!/bin/bash

## ESCAPE THE REGULAR EXPRESSIONS!!!!
## Run it like this:
#
#   ./domain-rename.sh 'defcon\.run' 'defcon\-run' 'guelph\.run' 'guelph\-run'
#   ./domain-rename.sh 'guelph\.run' 'guelph\-run' 'defcon\.run' 'defcon\-run'
#
## ESCAPE THE REGULAR EXPRESSIONS!!!!

# Check if all required arguments are provided
if [ $# -ne 4 ]; then
    echo "Usage: $0 <original_domain> <original_domain_label> <new_domain> <new_domain_label>"
    echo "Example: $0 defcon.run defcon-run guelph.run guelph-run"
    exit 1
fi

ORIG_DOMAIN=$1
ORIG_DOMAIN_LABEL=$2
NEW_DOMAIN=$3
NEW_DOMAIN_LABEL=$4

sed -i '' "s/$ORIG_DOMAIN/$NEW_DOMAIN/g" infra/terraform/defcon-run/account.hcl

echo \#1. Finding project.json files and do the ORIG_DOMAIN_LABEL to NEW_DOMAIN_LABEL replacement 👀 
find apps/ -type f -name 'project.json' \
    -exec grep -lie "$ORIG_DOMAIN_LABEL" -l {} \; \
    | while read -r file; do
    echo "  ✅ Processing '$file' - replaced '$ORIG_DOMAIN_LABEL' with '$NEW_DOMAIN_LABEL'"
    sed -i '' "s/$ORIG_DOMAIN_LABEL/$NEW_DOMAIN_LABEL/g" $file
done

echo \#2. Etherpad folder 👀 
find apps/etherpad -type f -name 'deploy*.sh' -o -name 'docker-compose.yaml' -o -name 'mkcerts.sh' \
    | while read -r file; do
    if grep -qlie "$ORIG_DOMAIN" "$file"; then
        echo "  ✅ Processing '$file' - replaced '$ORIG_DOMAIN' with '$NEW_DOMAIN'"
        sed -i '' "s/$ORIG_DOMAIN/$NEW_DOMAIN/g" "$file"
    fi
done

echo \#3. MQTT+mosquitto folder 👀 
find apps/mqtt -type f -name 'deploy*.sh' -o -name '*.acl' -o -name 'mkcerts.sh' -o -name '*.conf' \
    | while read -r file; do
    if grep -qlie "$ORIG_DOMAIN" "$file"; then
        echo "  ✅ Processing '$file' - replaced '$ORIG_DOMAIN' with '$NEW_DOMAIN'"
        sed -i '' "s/$ORIG_DOMAIN/$NEW_DOMAIN/g" "$file"
    fi
done

echo \#4. Strapi folder 👀 
find apps/strapi -type f -name 'deploy*.sh' -o -name 'strapi.run.sh' -o -name 'mkcerts.sh' -o -name 'middlewares.ts' -o -name 'env.generate.py' \
    | while read -r file; do
    if grep -qlie "$ORIG_DOMAIN" "$file"; then
        echo "  ✅ Processing '$file' - replaced '$ORIG_DOMAIN' with '$NEW_DOMAIN'"
        sed -i '' "s/$ORIG_DOMAIN/$NEW_DOMAIN/g" "$file"
    fi
done
