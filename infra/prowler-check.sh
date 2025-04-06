
docker pull --platform linux/amd64 toniblyx/prowler:latest

$(aws configure export-credentials --profile application --format env)

docker run -ti --rm --name prowler \
    --env AWS_ACCESS_KEY_ID \
    --env AWS_SECRET_ACCESS_KEY \
    --env AWS_SESSION_TOKEN \
    --volume "$(pwd)":/home/prowler/output/ \
    toniblyx/prowler:latest \
    -M html
