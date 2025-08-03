#!/bin/bash

export PAGER=${PAGER:-}
export AWS_PROFILE=${AWS_PROFILE:-application}
export AWS_REGION=${AWS_REGION:-"us-east-1"}
export AWS_ACCOUNT_ID=${AWS_ACCOUNT_ID:-$(aws sts get-caller-identity --query "Account" --output text)}
export IMAGE_TAG=${IMAGE_TAG:-"v0.0.1"}
export REPO_NAME=${REPO_NAME:-"grpc.mqtt.defcon.run"}

## Pull local development and copy over working config backed up in $HOME
# git clone https://github.com/whereiskurt/private ~/working/private
rm -fr ./site-tld/meshtk
cp -r ~/working/meshtk/ ./site-tld/meshtk
cp ~/working/private/meshtk.dc33.yaml ./site-tld/meshtk/pkg/config/meshtk.yaml

## Pull from remote repo. ;-)
# git clone https://github.com/whereiskurt/meshtk ./site-tld/meshtk
# rm -fr ./site-tld/meshtk
# cp ~/meshtk.dc33.yaml ./site-tld/meshtk/pkg/config/meshtk.yaml


# docker buildx build \
#   --platform linux/arm64 \
#   -f site-tld/Dockerfile -t $REPO_NAME:$IMAGE_TAG site-tld/

# docker buildx build \
#   --platform linux/amd64,linux/arm64 \
#   -f site-tld/Dockerfile -t $REPO_NAME:$IMAGE_TAG site-tld/

docker buildx build \
  --platform linux/amd64 \
  -f site-tld/Dockerfile -t $REPO_NAME:$IMAGE_TAG site-tld/

aws ecr get-login-password --region ${AWS_REGION} \
  | docker login --username AWS --password-stdin "${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com"

docker tag "${REPO_NAME}:${IMAGE_TAG}" \
  "${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com/${REPO_NAME}:${IMAGE_TAG}"

docker push "${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com/${REPO_NAME}:${IMAGE_TAG}"