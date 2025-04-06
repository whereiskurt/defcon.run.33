export PAGER=
export AWS_PROFILE=${AWS_PROFILE:-application}
export AWS_REGION=${AWS_REGION:-"us-east-1"}
export CLUSTER=${CLUSTER:-"ecs-use1-defcon-run"}
export MQTT="mqtt-defcon-run"

LATEST_MQTT=$(aws ecs list-task-definitions --family-prefix mqtt-defcon-run --sort DESC --query "taskDefinitionArns[0]" --output text)

aws ecs update-service --cluster $CLUSTER --service $MQTT --force-new-deployment --task-definition $LATEST_MQTT