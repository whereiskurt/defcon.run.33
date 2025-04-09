
## Dear Future Self,
## It is not possible to use variables in the name of the 'source' attribute of a module.
## Because of this, I had to create a module for each app type, which isn't great but it works.

module "nextjs" {
  count                   = var.app_type == "nextjs" ? 1 : 0
  app_type                = var.app_type
  source                  = "./apptype/nextjs"
  account_zonename        = var.account_zonename
  region_zonename         = var.region_zonename
  region_label            = var.region_label
  repos                   = var.repos
  env_zonename            = var.env_zonename
  task_execution_role_arn = var.task_execution_role_arn
  vpc_id                  = var.vpc_id
  subnets                 = var.subnets
  security_groups         = var.security_groups
  use_public_subnets      = var.use_public_subnets
  cluster_id              = var.cluster_id
  cluster_name            = var.cluster_name
  repo_versions           = var.repo_versions
  service_namespace       = var.service_namespace
  alb_listener            = var.alb_listener
  providers = {
    aws.application = aws.application
  }
}

module "etherpad" {
  count                   = var.app_type == "etherpad" ? 1 : 0
  app_type                = var.app_type
  source                  = "./apptype/etherpad"
  account_zonename        = var.account_zonename
  region_zonename         = var.region_zonename
  region_label            = var.region_label
  repos                   = var.repos
  env_zonename            = var.env_zonename
  task_execution_role_arn = var.task_execution_role_arn
  vpc_id                  = var.vpc_id
  subnets                 = var.subnets
  security_groups         = var.security_groups
  use_public_subnets      = var.use_public_subnets
  cluster_id              = var.cluster_id
  cluster_name            = var.cluster_name
  repo_versions           = var.repo_versions
  service_namespace       = var.service_namespace
  alb_listener            = var.alb_listener
  providers = {
    aws.application = aws.application
  }
}

module "strapi" {
  count                   = var.app_type == "strapi" ? 1 : 0
  app_type                = var.app_type
  source                  = "./apptype/strapi"
  account_zonename        = var.account_zonename
  region_zonename         = var.region_zonename
  region_label            = var.region_label
  repos                   = var.repos
  env_zonename            = var.env_zonename
  task_execution_role_arn = var.task_execution_role_arn
  vpc_id                  = var.vpc_id
  subnets                 = var.subnets
  security_groups         = var.security_groups
  use_public_subnets      = var.use_public_subnets
  cluster_id              = var.cluster_id
  cluster_name            = var.cluster_name
  repo_versions           = var.repo_versions
  service_namespace       = var.service_namespace
  alb_listener            = var.alb_listener
  providers = {
    aws.application = aws.application
  }
}

module "mosquitto" {
  count                   = var.app_type == "mqtt" ? 1 : 0
  app_type                = var.app_type
  source                  = "./apptype/mqtt/"
  account_zonename        = var.account_zonename
  region_zonename         = var.region_zonename
  repos                   = var.repos
  env_zonename            = var.env_zonename
  task_execution_role_arn = var.task_execution_role_arn
  vpc_id                  = var.vpc_id
  subnets                 = var.subnets
  security_groups         = var.security_groups
  use_public_subnets      = var.use_public_subnets
  cluster_id              = var.cluster_id
  cluster_name            = var.cluster_name
  repo_versions           = var.repo_versions
  service_namespace       = var.service_namespace
  nlb                     = var.nlb
  nlb_subnet              = var.nlb_subnet
  cert_map                = var.cert_map
  region_label            = var.region_label
  zone_map                = var.zone_map
  providers = {
    aws.application = aws.application
  }
}
