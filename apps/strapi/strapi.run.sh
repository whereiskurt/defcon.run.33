#!/bin/bash
export IMAGE_TAG="v0.0.1" 
export REPO_NAME="app.strapi.defcon.run"

docker run -p 8888:1337 \
  -v ./defcon-run/database:/opt/app/database \
  --env-file ./defcon-run/.env.local \
  "${REPO_NAME}:${IMAGE_TAG}"