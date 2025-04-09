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
  vpc_id                  = dependency.cluster.outputs.vpc_id
  global_waf_webacl_arn   = dependency.site.outputs.global_waf_webacl_arn != "" ? dependency.site.outputs.global_waf_webacl_arn : null
  zone_map                = dependency.site.outputs.zone_map
  cert_map                = dependency.site.outputs.cert_map
  security_groups         = dependency.cluster.outputs.security_groups
  subnets                 = include.root.locals.environment_vars.locals.use_public_subnets ? dependency.cluster.outputs.public_subnets : dependency.cluster.outputs.private_subnets
  alb_listener            = dependency.cluster.outputs.alb_listener
  alb                     = dependency.cluster.outputs.alb_public
  nlb                     = dependency.cluster.outputs.nlb_public
  nlb_subnet              = include.root.locals.environment_vars.locals.use_public_subnets ? dependency.cluster.outputs.nlb_public_subnet : dependency.cluster.outputs.nlb_private_subnet
  cluster_id              = dependency.cluster.outputs.cluster_id
  cluster_name            = dependency.cluster.outputs.cluster_name
  task_execution_role_arn = dependency.cluster.outputs.task_execution_role
  service_namespace       = dependency.cluster.outputs.service_namespace
}