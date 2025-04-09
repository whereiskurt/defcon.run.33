locals {
  ##This Zone was created at the site level
  label = "email"

  ## Read the account and region configuration
  account_vars     = read_terragrunt_config(find_in_parent_folders("account.hcl"))
  account_zonename = local.account_vars.locals.account_zonename
  region_vars      = read_terragrunt_config(find_in_parent_folders("region.hcl"))
  region_label     = local.region_vars.locals.label

  ##Concatenate the region and account zonename to create the environment zonename
  email_zonename    = "${local.label}.${local.account_zonename}"
  region_zonename   = "${local.region_label}.${local.email_zonename}"
  smtpfrom_zonename = "s.${local.region_zonename}"
  region            = local.region_vars.locals.region
}