dependency "site" {
  config_path = "../../../../"
}

dependency "cluster" {
  config_path = "../../../cluster"
}

include "root" {
  path   = find_in_parent_folders("common.hcl")
  expose = true
}

include "app" {
  path   = "${dirname(find_in_parent_folders("common.hcl"))}/modules/email/email.hcl"
  expose = true
}

terraform {
  source = "${include.app.locals.base_source_url}/_v1"
}