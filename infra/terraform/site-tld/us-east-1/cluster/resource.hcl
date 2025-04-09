locals {
  label            = "ecs"
  account_vars     = read_terragrunt_config(find_in_parent_folders("account.hcl"))
  account_zonename = local.account_vars.locals.account_zonename
  region_vars      = read_terragrunt_config(find_in_parent_folders("region.hcl"))
  region_label     = local.region_vars.locals.label

  env_zonename    = "${local.label}.${local.region_label}.${local.account_zonename}"
  region_zonename = "${local.region_label}.${local.account_zonename}"

  vpc_cidr = "10.0.0.0/16"

  ## More redundency but not all regions have [abc], not as 'general' as [ab]
  # availability_zones      = ["us-east-1a", "us-east-1b", "us-east-1c"]
  # public_subnets_cidr     = ["10.0.0.0/21", "10.0.8.0/21", "10.0.16.0/21"]
  # private_subnets_cidr    = ["10.0.24.0/21", "10.0.32.0/21", "10.0.40.0/21"]
  # nlb_public_subnets_cidr = ["10.0.48.0/21", "10.0.56.0/21", "10.0.64.0/21"]

  availability_zones          = ["us-east-1a", "us-east-1b"]
  public_subnets_cidr         = ["10.0.0.0/21", "10.0.8.0/21"]
  private_subnets_cidr        = ["10.0.24.0/21", "10.0.32.0/21"]
  enable_lb_delete_protection = false

  ##MQTT uses NLB for TLS connections and WebSocket connections
  use_network_lb           = true
  nlb_public_subnets_cidr  = ["10.0.48.0/21", "10.0.56.0/21"]
  nlb_private_subnets_cidr = ["10.0.72.0/21", "10.0.80.0/21"]

  ## NOTE: One of these has to be true for ECS Deployments to work and CloudWatch logs to flow
  ## It's way cheaper to not deploy a NAT Gateway, and just VPC endpoints like we did.
  ## Using public subnets means we don't need these, however it's a security tradeoff.
  ## Also using public subnets iccurs a small surcharge from AWS.
  use_nat_gateway   = tobool(get_env("TF_VAR_use_nat_gateway", "true"))
  use_vpc_endpoints = tobool(get_env("TF_VAR_use_vpc_endpoints", "false"))

  ## Controls whether to use RDS or not
  use_rds_serverless = tobool(get_env("TF_VAR_use_rds_serverless", "true"))

  rds_serverless = [
    {
      parameter_group_name = "default.aurora-postgresql16"
      engine_version       = "16.4"
      db_dbname            = "strapi"
      db_username          = "strapiadmin"
      db_port              = 5432
      db_engine            = "postgres"
    },
    {
      parameter_group_name = "default.aurora-postgresql16"
      engine_version       = "16.4"
      db_dbname            = "etherpad"
      db_username          = "etherpad"
      db_port              = 5432
      db_engine            = "postgres"
  }]

  use_bastion = false
  bastion_config = {
    block_duration_minutes = 240
    spot_price_multiplier  = 1.00
    spot_price_offset      = 0.0005
    ec2key_name            = "use1.bastion"
    ec2key_filename        = "${get_env("HOME", "/tmp")}/.ssh/bastion.use1.defcon.run.pem"
    instance_type          = "t4g.medium"
    githubdeploykey        = get_env("TF_VAR_githubdeploykey", "NOT_SET_WITH_ENV_VAR")
  }

  use_efs_private = false
  efs_private_config = {
    encrypted = false
  }

}