#/bin/bash
export GUID=${GUID:-$(uuidgen)}
export SGUID=$(echo ${GUID:0:8} | tr '[:upper:]' '[:lower:]')

## The state is stored in the bucket and the table is used for locking
## These are per region, to increase fault taulerance.
export TG_TABLE_CAC1="tf-defcon-run-cac1-${SGUID}"
export TG_BUCKET_CAC1="tf-defcon-run-cac1-${SGUID}"
export TG_BUCKET_USE1="tf-defcon-run-use1-${SGUID}"
export TG_TABLE_USE1="tf-defcon-run-use1-${SGUID}"
export TG_BUCKET_USW2="tf-defcon-run-usw2-${SGUID}"
export TG_TABLE_USW2="tf-defcon-run-usw2-${SGUID}"


## WXYZ is a placeholder for a new environment like "USE1" or "CAC1"
##export TG_TABLE_WXYZ=""
##export TG_BUCKET_WXYZ=""

# If you want to manage the creation of these resources using
# terraform, you can use the scripts in the terragrunt folder
# to build the `terragrunt-bash.sh`
