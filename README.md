# DEFCON.run Infrastructure as Code - Template

This is a hobby AWS 'infrastructure as code' project that deploys [Strapi](https://strapi.io/)/[Etherpad](https://etherpad.org/)/[mosquitto](https://mosquitto.org/) applications into multi-regional ECS clusters with SES email and RDS serverless postgres configurations. All necessary AWS infrastructure is deployed and the applications (Strapi/Etherpad/mosquitto/etc) are built locally into Docker images and deployed to AWS ECR. 

This repo solves the 'multi-region' problem - and lets you easily deploy to `use1`, `usw2`, `cac1`, and more. The code base manages and assume an AWS Route53 registered domain.

There is A LOT of [AWS magic](https://github.com/user-attachments/assets/0f631149-7046-43f2-9890-5fd04b23762d) used in this repo that I'm happy to share. 🙇‍♂️ For exampoe, we CloudFront our Load Balancers and Buckets, have WAF, VPC endpoints, NAT Gateway, EFS toggles, and lots of others goodies.. this repo shows how to do meaningful AWS infrastructure.

All of the `terraform / terragrunt` state is stored in AWS (Dyanmo/S3).

### Motivation
I wanted to get this out the door incase it's useful to others and to showcase where we are headed with defcon.run 33! :-) The last few defcon.run events has had a website and infrastructure. This year we're trying to add an meshtastic MQTT service to the fun - see the diagram. FYI - MQTT traffic is NOT HTTP, so it needs a AWS network load balancer for the TLS. 

## Getting it going for you! :) 
The repo is setup for `defcon.run` but it can run for any AWS Route53 domain - below I show `guelph.run`.

The base cost to run this full-tilt 24x7 is between $2 and $3 day (per region), before scaling ECS taskdefs etc. I tend to spin-up/down the infra as I'm doing development. It feels good to 'zero out' the environment with `nx run site:down` 🤷.

I think you could use this as a template for deploying most containerized apps, just by looking at the examples that are already working. I tried to strike a balance between 'cut+paste' in the `apptype` concept (`infra/terraform/modules/cluster/fargate/_v1/apptype/mqtt`) but there is likely more to be done.

Clone the repo and run the `setup.sh` script to replace a `defcon.run` with `guelph.run`:
<img width="1210" alt="" src="https://github.com/user-attachments/assets/ee22d41d-e383-43e1-baf8-3d2e30905827" />

Deploy apps after `nx run site:up`:

<img width="852" alt="Deploying the app" src="https://github.com/user-attachments/assets/c1600105-6e99-4b5f-a8a4-2199264fa0f6" />

Executing this code gives access to fully configured applications at URLS like:
- `https://use1.mqtt.defcon.run/map`
- `https://use1.etherpad.defcon.run`
- `https://use1.strapi.defcon.run`

Because of `terragrunt` it's very easy to do separate multi-region deployments. 

Going into the `infra/terraform/site.tld/` and running the `region-copier.sh` creates a new region with the correct regions variables.

Add additional regions:
<img width="874" alt="Adding Regions" src="https://github.com/user-attachments/assets/a58fdfd3-73b4-4981-9829-83c28e8fcdf8" />

You can configure your meshtastic radio to use this MQTT mosquitto server even with TLS. 

# Diagrams

## All the things
Looking at this handmade diagram you can see we deploy WAF, CloudFront w/ ALB+S3 orgins, ALB and NLB, ECS. It ties into a bunch of AWS services, but they can all be turned off / tweaked (ie. WAF, alarms, vpc endpoints/nat gateway, public subnets.) 
![ServiceLayout-Full](https://github.com/user-attachments/assets/0f631149-7046-43f2-9890-5fd04b23762d)

## Simpler View
![ServiceLayout-Simpler](https://github.com/user-attachments/assets/b8fa513b-24a7-439e-a596-bfa3936f6fc7)

## How to Run it?
Here are some execution steps below. If you already know `terragrunt` you can use `terragrunt run-all ...` raw etc. or use the `nx` directives in the `project.json` files.

```bash

##1. Replace the defcon.run with a domain you have registered in the [management] account profile 
./setup.sh defcon\.run defcon\-run example\.run example\-run

## Make sure you have `management` for Route53 ns delegation records, 
## `terraform` for IAC state management, and `application` for account 
## resource creation.

##### SSO uses ~/.aws/config 
% cat ~/.aws/config 
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
% cat ~/.aws/credentials
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
