dependency "zone" {
  config_path = "../../"
  mock_outputs = {
    zone_map = {},
    cert_map = {}
  }
}

include "root" {
  path = find_in_parent_folders("common.hcl")
}

include "app" {
  path   = "${dirname(find_in_parent_folders("common.hcl"))}/modules/cluster/cluster.hcl"
  expose = true
}

terraform {
  source = "${include.app.locals.base_source_url}/_v1"
}

inputs = {
  zone_map = dependency.zone.outputs.zone_map
  cert_map = dependency.zone.outputs.cert_map
}