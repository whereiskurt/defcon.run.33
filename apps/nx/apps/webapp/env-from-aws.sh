#!/bin/zsh
INPUT_FILE=".env.aws"
OUTPUT_FILE=".env.aws.resolved"

echo > "$OUTPUT_FILE"
while IFS= read -r line; do
  if echo "$line" | grep -q "^.*=arn:aws:ssm:"; then
    KEY=$(echo "$line" | awk -F= '{print $1}')
    ARN=$(echo "$line" | awk -F= '{print $2}')
    VALUE=$(aws ssm get-parameter --with-decryption --name "$ARN" --query 'Parameter.Value' --output text)
    echo "$KEY=$VALUE" >> "$OUTPUT_FILE"
  else
    echo "$line" >> "$OUTPUT_FILE"
  fi
done < "$INPUT_FILE"