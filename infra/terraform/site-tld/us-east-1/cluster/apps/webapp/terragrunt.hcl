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
  path   = "${dirname(find_in_parent_folders("common.hcl"))}/modules/cluster/fargate/fargate.hcl"
  expose = true
}

terraform {
  source = "${include.app.locals.base_source_url}/_v1"
}

inputs = {
  zone_map                 = dependency.site.outputs.zone_map
  cert_map                 = dependency.site.outputs.cert_map
  global_waf_webacl_arn    = dependency.site.outputs.global_waf_webacl_arn != "" ? dependency.site.outputs.global_waf_webacl_arn : null
  alb_listener             = dependency.cluster.outputs.alb_listener
  alb                      = dependency.cluster.outputs.alb_public
  cluster_id               = dependency.cluster.outputs.cluster_id
  cluster_name             = dependency.cluster.outputs.cluster_name
  task_execution_role_arn  = dependency.cluster.outputs.task_execution_role
  vpc_id                   = dependency.cluster.outputs.vpc_id
  security_groups          = dependency.cluster.outputs.security_groups
  use_public_subnets       = include.root.locals.environment_vars.locals.use_public_subnets
  subnets                  = include.root.locals.environment_vars.locals.use_public_subnets ? dependency.cluster.outputs.public_subnets : dependency.cluster.outputs.private_subnets
  use_cfd_firehose_logging = include.root.locals.environment_vars.locals.use_cfd_firehose_logging
  service_namespace        = dependency.cluster.outputs.service_namespace
}