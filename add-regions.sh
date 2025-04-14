#!/bin/bash

cd infra/terraform/site-tld
./region-copier.sh us-east-1 use1 ca-central-1 cac1
./region-copier.sh us-east-1 use1 us-west-2 usw2
cd -