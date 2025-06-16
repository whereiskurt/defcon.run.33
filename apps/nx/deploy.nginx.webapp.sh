#!/bin/bash

export PAGER=${PAGER:-}
export AWS_PROFILE=${AWS_PROFILE:-application}
export AWS_REGION=${AWS_REGION:-"us-east-1"}
export AWS_ACCOUNT_ID=${AWS_ACCOUNT_ID:-$(aws sts get-caller-identity --query "Account" --output text)}
export IMAGE_TAG=${IMAGE_TAG:-"v0.0.1"}

export REPO_NAME="nginx.webapp.defcon.run"

aws ecr get-login-password --region "$AWS_REGION" \
 | docker login --username AWS --password-stdin "${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com"

docker buildx build \
  --platform linux/amd64,linux/arm64 \
  -f nginx/Dockerfile.nginx -t $REPO_NAME:$IMAGE_TAG nginx/

docker tag "${REPO_NAME}:${IMAGE_TAG}" \
  "${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com/${REPO_NAME}:${IMAGE_TAG}"

docker push "${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com/${REPO_NAME}:${IMAGE_TAG}"

echo "Image successfully pushed to ${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com/${REPO_NAME}:${IMAGE_TAG}"