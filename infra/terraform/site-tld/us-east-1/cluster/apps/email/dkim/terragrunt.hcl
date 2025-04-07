dependency "email" {
  config_path = "../../email"
}

include "root" {
  path   = find_in_parent_folders("common.hcl")
  expose = true
}

include "app" {
  path   = "${dirname(find_in_parent_folders("common.hcl"))}/modules/email/dkim/dkim.hcl"
  expose = true
}

terraform {
  source = "${include.app.locals.base_source_url}/_v1"
}

inputs = {
  email_zonename = dependency.email.outputs.email_zonename
  dkim_tokens    = dependency.email.outputs.dkim_tokens
}