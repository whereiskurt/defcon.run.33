locals {
  label = "email"

  ## Read the account and region configuration
  account_vars     = read_terragrunt_config(find_in_parent_folders("account.hcl"))
  account_zonename = local.account_vars.locals.account_zonename
  region_vars      = read_terragrunt_config(find_in_parent_folders("region.hcl"))
  region_label     = local.region_vars.locals.label
  region_zonename  = "${local.region_label}.${local.label}.${local.account_zonename}"

}