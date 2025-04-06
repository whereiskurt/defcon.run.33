# DEFCON.run Infrastructure and Application
To setup you shell to AWS deploy and get `nx` building: 
```bash
##Establish an SSO session with profiles for application,management, and terraform
aws sso login --sso-session=DevOps
##Establish the S3 buckets and dynamo tables terragrunt uses to manage state
nx run terragrunt:init

##Export the variables from terragrunt
source ./.env.terragrunt.sh

nx run tf:apply
nx run tf.use1.apps.email:apply

nx run tf:destroy
```