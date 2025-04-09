#/bin/bash
export GUID=${GUID:-$(uuidgen)}
export SGUID=$(echo ${GUID:0:8} | tr '[:upper:]' '[:lower:]')

## The state is stored in the bucket and the table is used for locking
## One entry per region supported
export TG_TABLE_CAC1="tf-defcon-run-cac1-${SGUID}"
export TG_BUCKET_CAC1="tf-defcon-run-cac1-${SGUID}"
export TG_BUCKET_USE1="tf-defcon-run-use1-${SGUID}"
export TG_TABLE_USE1="tf-defcon-run-use1-${SGUID}"
export TG_BUCKET_USW2="tf-defcon-run-usw2-${SGUID}"
export TG_TABLE_USW2="tf-defcon-run-usw2-${SGUID}"
