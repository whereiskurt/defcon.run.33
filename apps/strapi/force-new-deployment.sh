export PAGER=
export AWS_PROFILE=${AWS_PROFILE:-application}
export AWS_REGION=${AWS_REGION:-"us-east-1"}
export CLUSTER=${CLUSTER:-"ecs-use1-defcon-run"}
export STRAPI="strapi-defcon-run"

LATEST_STRAPI=$(aws ecs list-task-definitions --family-prefix strapi-defcon-run --sort DESC --query "taskDefinitionArns[0]" --output text)

aws ecs update-service --cluster $CLUSTER --service $STRAPI --force-new-deployment --task-definition $LATEST_STRAPI