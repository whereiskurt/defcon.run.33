export PAGER=${PAGER:-}
export AWS_PROFILE=${AWS_PROFILE:-application}
export AWS_REGION=${AWS_REGION:-"us-east-1"}

cd mqtt/mosquitto && source ./deploy.mosquitto.sh && cd ..

cd etherpad && source ./deploy.nginx.etherpad.sh && cd ..
cd etherpad && source ./deploy.etherpad.sh && cd ..

cd strapi && source ./deploy.nginx.strapi.sh && cd ..
cd strapi && source ./deploy.strapi.sh && cd ..

source ./force-new-deployment.sh
