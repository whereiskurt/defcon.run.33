export PAGER=
export AWS_PROFILE=${AWS_PROFILE:-application}
export AWS_REGION=${AWS_REGION:-"us-east-1"}
export CLUSTER=${CLUSTER:-"ecs-use1-defcon-run"}
export WEBAPP=${WEBAPP:-"webapp-defcon-run"}

LATEST_WEBAPP=$(aws ecs list-task-definitions --family-prefix $WEBAPP --sort DESC --query "taskDefinitionArns[0]" --output text)

aws ecs update-service --cluster $CLUSTER --service $WEBAPP --force-new-deployment --task-definition $LATEST_WEBAPP