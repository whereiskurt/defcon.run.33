export PAGER=
export AWS_PROFILE=${AWS_PROFILE:-application}
export CLUSTER=${CLUSTER:-"ecs-use1-defcon-run"}

export STRAPI="strapi-defcon-run"
export ETHERPAD="etherpad-defcon-run"
export MQTT="mqtt-defcon-run"

## We need to add the taskdef version to deploy, this is how to get the family name:
##  aws ecs list-task-definition-families --region us-east-1 --status "ACTIVE"
##
LATEST_STRAPI=$(aws ecs list-task-definitions --family-prefix strapi-defcon-run --sort DESC --query "taskDefinitionArns[0]" --output text)
LATEST_ETHERPAD=$(aws ecs list-task-definitions --family-prefix etherpad-defcon-run --sort DESC --query "taskDefinitionArns[0]" --output text)
LATEST_MQTT=$(aws ecs list-task-definitions --family-prefix mqtt-defcon-run --sort DESC --query "taskDefinitionArns[0]" --output text)

aws ecs update-service --cluster $CLUSTER --service $STRAPI --force-new-deployment --task-definition $LATEST_STRAPI
aws ecs update-service --cluster $CLUSTER --service $ETHERPAD --force-new-deployment --task-definition $LATEST_ETHERPAD
aws ecs update-service --cluster $CLUSTER --service $MQTT --force-new-deployment --task-definition $LATEST_MQTT