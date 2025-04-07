#!/bin/bash

export PAGER=${PAGER:-}
export AWS_PROFILE=${AWS_PROFILE:-application}
export AWS_REGION=${AWS_REGION:-"us-east-1"}
export AWS_ACCOUNT_ID=${AWS_ACCOUNT_ID:-$(aws sts get-caller-identity --query "Account" --output text)}
export IMAGE_TAG=${IMAGE_TAG:-"v0.0.1"}
export REPO_NAME=${REPO_NAME:-"mosquitto.mqtt.defcon.run"}

docker buildx build \
  --platform linux/amd64,linux/arm64 \
  -f site-tld/Dockerfile -t $REPO_NAME:$IMAGE_TAG site-tld/

aws ecr get-login-password --region ${AWS_REGION} \
  | docker login --username AWS --password-stdin "${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com"

docker tag "${REPO_NAME}:${IMAGE_TAG}" \
  "${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com/${REPO_NAME}:${IMAGE_TAG}"

docker push "${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com/${REPO_NAME}:${IMAGE_TAG}"