## Multi-region
The IAC is setup to deploy just `us-east-1` because there is only folder here here. 

Running `region-copier.sh` simplifies the copying of the folder structure and replacing the regional related variables (e.g. us-east-1 and use1 with the new a region.) You can run `region-copier.sh` any time you decide to add a region.

## add-regions.sh
This script in the root duplicates `us-east-1` into `cac1` and `usw2`:

```bash
cd infra/terraform/site-tld
./region-copier.sh us-east-1 use1 ca-central-1 cac1
./region-copier.sh us-east-1 use1 us-west-2 usw2
cd -
```
