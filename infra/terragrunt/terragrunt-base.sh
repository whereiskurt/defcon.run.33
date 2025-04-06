#!/bin/bash

##One set of BUCKET,TABLE are needed per region used.
##This preps the variables needed to terragrunt accross regions etc.
##Terragrunt will take over these buckets.
export TG_BUCKET_CAC1=$(terraform output -raw bucket-cac1)
export TG_TABLE_CAC1=$(terraform output -raw table-cac1)

export TG_BUCKET_USE1=$(terraform output -raw bucket-use1)
export TG_TABLE_USE1=$(terraform output -raw table-use1)

export TG_BUCKET_USW2=$(terraform output -raw bucket-usw2)
export TG_TABLE_USW2=$(terraform output -raw table-usw2)

echo "#!/bin/bash"
echo "##This file is generated and sets the buckets need for multiple regions."
env | grep '^TG_' | while IFS='=' read -r name value; do
  echo "export $name=\"$value\""
done

##The trick is I'm trying to avoid commiting these resource names
##to the repo - so I kinda like controlling my own terraform base.
##
##Alterntaively, don't use this terraform code to create buckets.
##Instead, set these to any value you want, and terragrunt will create
##and maintain.