#!/bin/zsh

# This script generates JSON blocks for ECS taskdef secrets and environment variables
# It takes ARN references and hardcoded values from a template file and formats them for use in an ECS task definition

AWS_REGION=${AWS_REGION:-"us-east-1"}
INPUT_FILE=${1:-"from-aws.tmpl"}

# First, handle the secrets (ARN lookups)
echo '    "secrets": ['

# Keep track of whether we need to add a comma
SECRET_FIRST_ENTRY=true

while IFS= read -r line; do
  # Skip empty lines and comments
  if [[ -z "$line" || "$line" =~ ^# ]]; then
    continue
  fi

  if echo "$line" | grep -q "^.*=arn:aws:ssm:"; then
    KEY=$(echo "$line" | awk -F= '{print $1}')
    ARN=$(echo "$line" | awk -F= '{print $2}')
    
    # Add comma for all but the first entry
    if $SECRET_FIRST_ENTRY; then
      SECRET_FIRST_ENTRY=false
    else
      echo ','
    fi
    
    # Output the secret entry in ECS taskdef format
    echo '      {'
    echo "        \"name\": \"$KEY\","
    echo "        \"valueFrom\": \"$ARN\""
    echo -n '      }'
  fi
done < "$INPUT_FILE"

echo 
echo '    ],'

# Now, handle the environment variables (hardcoded values)
echo '    "environment": ['

# Keep track of whether we need to add a comma
ENV_FIRST_ENTRY=true

while IFS= read -r line; do
  # Skip empty lines and comments
  if [[ -z "$line" || "$line" =~ ^# ]]; then
    continue
  fi

  # Look for lines that contain an equals sign but don't match the ARN pattern
  if echo "$line" | grep -q "=" && ! echo "$line" | grep -q "^.*=arn:aws:ssm:"; then
    KEY=$(echo "$line" | awk -F= '{print $1}')
    VALUE=$(echo "$line" | awk -F= '{print $2}')
    
    # Skip if the value is empty
    if [[ -z "$VALUE" ]]; then
      continue
    fi
    
    # Add comma for all but the first entry
    if $ENV_FIRST_ENTRY; then
      ENV_FIRST_ENTRY=false
    else
      echo ','
    fi
    
    # Output the environment entry in ECS taskdef format
    echo '      {'
    echo "        \"name\": \"$KEY\","
    echo "        \"value\": \"$VALUE\""
    echo -n '      }'
  fi
done < "$INPUT_FILE"

echo 
echo '    ],'
