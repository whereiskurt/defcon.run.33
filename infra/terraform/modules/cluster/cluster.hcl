locals {
  environment_vars = read_terragrunt_config("resource.hcl")

  account_zonename = local.environment_vars.locals.account_zonename
  env_zonename     = local.environment_vars.locals.env_zonename

  base_source_url = "${dirname(find_in_parent_folders("common.hcl"))}/modules/cluster"
}

inputs = {
  account_zonename = local.account_zonename
  env_zonename     = local.env_zonename
}