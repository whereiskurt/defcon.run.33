#!/bin/bash

export PAGER=${PAGER:-}
export AWS_PROFILE=${AWS_PROFILE:-application}
export AWS_REGION=${AWS_REGION:-"us-east-1"}
export AWS_ACCOUNT_ID=${AWS_ACCOUNT_ID:-$(aws sts get-caller-identity --query "Account" --output text)}
export IMAGE_TAG=${IMAGE_TAG:-"v0.0.1"}
export REPO_NAME="app.run.defcon.run"
export WEBAPP_ORIGIN="run.defcon.run"
export WEBAPP_PREFIX=${WEBAPP_PREFIX:-"www"}
export REGION_SHORT=${REGION_SHORT:-"use1"}
nx run webapp:build

export WEBAPP_ORIGIN_BUCKET=$(aws ssm get-parameter --name "/${REGION_SHORT}.${WEBAPP_ORIGIN}/cf/bucket_name" --region "${AWS_REGION}" --query "Parameter.Value" --output text)
nx run webapp:assets.deploy

docker buildx build --platform=linux/amd64 -t $REPO_NAME:$IMAGE_TAG -f Dockerfile.webapp dist/webapp

aws ecr get-login-password --region ${AWS_REGION} \
  | docker login --username AWS --password-stdin "${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com"

docker tag "${REPO_NAME}:${IMAGE_TAG}" \
  "${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com/${REPO_NAME}:${IMAGE_TAG}"

docker push "${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com/${REPO_NAME}:${IMAGE_TAG}"