export PAGER=
export AWS_PROFILE=${AWS_PROFILE:-application}
export AWS_REGION=${AWS_REGION:-"us-east-1"}
export CLUSTER=${CLUSTER:-"ecs-use1-defcon-run"}

export ETHERPAD="etherpad-defcon-run"

## We need to add the taskdef version to deploy, this is how to get the family name:
##  aws ecs list-task-definition-families --region $REGION --status "ACTIVE"
##
LATEST_ETHERPAD=$(aws ecs list-task-definitions --family-prefix $ETHERPAD --sort DESC --query "taskDefinitionArns[0]" --output text)

aws ecs update-service --cluster $CLUSTER --service $ETHERPAD --force-new-deployment --task-definition $LATEST_ETHERPAD
