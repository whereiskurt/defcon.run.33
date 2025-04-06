locals {
  environment_vars = read_terragrunt_config("resource.hcl")

  account_zonename = local.environment_vars.locals.account_zonename
  region_zonename  = local.environment_vars.locals.region_zonename
  email_zonename   = local.environment_vars.locals.email_zonename

  base_source_url = "${dirname(find_in_parent_folders("common.hcl"))}/modules/email"
}

inputs = {
  account_zonename = local.account_zonename
  region_zonename  = local.region_zonename
  email_zonename   = local.email_zonename
}