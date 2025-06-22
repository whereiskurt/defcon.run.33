locals {
  label = "run"

  ## Read the account and region configuration
  account_vars     = read_terragrunt_config(find_in_parent_folders("account.hcl"))
  account_zonename = local.account_vars.locals.account_zonename

  ## Construct 'environment' concept for the application 'webapp.site.tld' s
  env_zonename = "${local.label}.${local.account_zonename}"

  ## Read region configuration
  region_vars     = read_terragrunt_config(find_in_parent_folders("region.hcl"))
  region_label    = local.region_vars.locals.label
  region_zonename = "${local.region_label}.${local.env_zonename}"


  ## DynamoDB Tables to create for the application 
  dynamo_tables = []

  use_cloudfront = true
  use_single_table = true

  app_type = "nextjs"
  repos    = ["nginx", "app"]
  repo_versions = {
    nginx : "v0.0.1"
    app : "v0.0.1"
  }

  ##Using public subnets means we don't VPC endpoints or NAT Gateways which is the cheapest option with just a few services
  use_public_subnets       = false
  use_cfd_firehose_logging = false
  is_primary_deployment    = true
}