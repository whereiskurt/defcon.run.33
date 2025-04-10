# DEFCON.run Infrastructure as Code - Template
This is a hobby AWS 'infrastructure as code' project that deploys Strapi/Etherpad/mosquitto applications into a ECS cluster. I wanted to get this out the door incase it's useful to others and to showcase where we are headed with defcon.run 33! :-)

The last few defcon.run events has had a website and infrastructure. This year we're trying to add an meshtastic MQTT service to the fun - see the diagram. FYI - MQTT traffic is NOT HTTP, so it needs a AWS network load balancer for the TLS. 

Executing this code gives access to fully configured applications at URLS like `https://use1.mqtt.defcon.run/map`, `https://usw2.etherpad.defcon.run` or `https://cac1.strapi.defcon.run`. You can configure your meshtastic radio to use this MQTT mosquitto server, even with TLS. Overall, there is A LOT of AWS magic in this repo that I'm happy to share. 🙇‍♂️

The base cost to run this full-tilt 24x7 is between $2 and $3 day, before scaling ECS taskdefs etc. I tend to spin-up/down the infra as I'm doing development. It feels good to 'zero out' the environment. 🤷

I think you could use this as a template for deploying most containerized apps, just by looking at the examples that are already working. I tried to strike a balance between 'cut+paste' in the `apptype` concept (`infra/terraform/modules/cluster/fargate/_v1/apptype/mqtt`) but there is likely more to be done.

# Diagrams

## All the things
Looking at this handmade diagram you can see we deploy WAF, CloudFront w/ ALB+S3 orgins, ALB and NLB, ECS. It ties into a bunch of AWS services, but they can all be turned off / tweaked (ie. WAF, alarms, vpc endpoints/nat gateway, public subnets.) 
![ServiceLayout-Full](https://github.com/user-attachments/assets/0f631149-7046-43f2-9890-5fd04b23762d)

## Simpler View
![ServiceLayout-Simpler](https://github.com/user-attachments/assets/b8fa513b-24a7-439e-a596-bfa3936f6fc7)

## More to come...
Sharing is caring.

## How to Run it?
Here are some execution steps below. If you already know `terragrunt` you can use `terragrunt run-all ...` raw etc. or use the `nx` directives in the `project.json` files.

```bash

##1. Replace the defcon.run with a domain you have registered in the [management] account profile 
./setup.sh defcon\.run defcon\-run example\.run example\-run

## Make sure you have `management` for Route53 ns delegation records, 
## `terraform` for IAC state management, and `application` for account 
## resource creation.

##### SSO uses ~/.aws/config 
cat ~/.aws/config 
    [profile management]
    sso_session = Developer
    sso_account_id = 012342342342
    sso_role_name = HostedZoneAdmin

    [profile application]
    sso_session = Developer
    sso_account_id = 012342342342
    sso_role_name = AdministratorAccess

    [profile terraform]
    sso_session = Developer
    sso_account_id = 012342342342
    sso_role_name = AdministratorAccess

##### IAM uses ~/.aws/credentials
cat ~/.aws/credentials
    [application]
    aws_access_key_id=ASIA..........01
    aws_secret_access_key=Isi................NxFb7
    aws_session_token=IQoJb3JpZ........LWVsd....

    [management]
    aws_access_key_id=ASIA..........33
    aws_secret_access_key=Isi................NxFb7
    aws_session_token=IQoJb3JpZ........LWVsd....

    [terraform]
    aws_access_key_id=ASIA..........22
    aws_secret_access_key=Isi................NxFb7
    aws_session_token=IQoJb3JpZ........LWVsd....

#####
## Set terragrunt bucket names
export GUID=123456789 
./source ./env.sh

nx run site:up
nx run site:down

## OR to just apply IAC+deploy code and then destroy in the us-east-1:
nx run use1.cluster:apply
nx run use1.mqtt:apply      #mqtt/etherpath/strapi
nx run mqtt:use1.deploy     #mqtt/etherpath/strapi
nx run use1.mqtt:destroy    #mqtt/etherpath/strapi
nx run use1.cluster:destroy

### OR!!!
cd infra/terraform/site-tld/us-east-1/cluster
terragrunt run-all apply

## OR !!
cd infra/terraform/site-tld/us-east-1/cluster/apps/mqtt
terragrunt run-all apply
terragrunt run-all destroy
```
