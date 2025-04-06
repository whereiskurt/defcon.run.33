#!/bin/bash
###
# Example - ./get_price.sh us-east-1 us-east-1a t4g.xlarge 
#
AWS_REGION=$1
AVAILABILITY_ZONE=$2
INSTANCE_TYPE=$3

# Fetch spot price history using AWS CLI
PRICES=$(AWS_REGION=$AWS_REGION aws ec2 describe-spot-price-history \
  --instance-types ${INSTANCE_TYPE} \
  --availability-zone ${AVAILABILITY_ZONE} \
  --product-descriptions "Linux/UNIX" \
  --output json | jq -r '.SpotPriceHistory | map(.SpotPrice | tonumber) | { average: ((add / length)|@text),  sum: add|@text, count: length|@text }')

echo $PRICES 