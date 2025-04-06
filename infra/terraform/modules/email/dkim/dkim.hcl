locals {
  environment_vars = read_terragrunt_config("resource.hcl")
  base_source_url  = "${dirname(find_in_parent_folders("common.hcl"))}/modules/email/dkim"
}
