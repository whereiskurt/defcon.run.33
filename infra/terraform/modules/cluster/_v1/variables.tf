variable "account_zonename" {
  type = string
}
variable "env_zonename" {
  type = string
}
variable "region_zonename" {
  type = string
}
variable "region" {
  type = string
}

variable "region_label" {
  type = string
}

variable "zone_map" {
  type = map(object({
    zone_id      = string,
    name         = string,
    name_servers = list(string)
  }))
}

variable "cert_map" {
  type = map(object({
    arn                       = string
    domain_name               = string
    subject_alternative_names = list(string)
    validation_method         = string
  }))
}

variable "vpc_cidr" {
  description = "The CIDR block of the vpc"
}
variable "public_subnets_cidr" {
  type        = list(any)
  description = "The CIDR block for the public subnet"
}

variable "use_network_lb" {
  type = bool
}

variable "nlb_public_subnets_cidr" {
  type        = list(any)
  description = "The public CIDR block for the nlb traffic"
}
variable "nlb_private_subnets_cidr" {
  type        = list(any)
  description = "The private CIDR block for the nlb traffic"
}

variable "private_subnets_cidr" {
  type        = list(any)
  description = "The CIDR block for the private subnet"
}
variable "availability_zones" {
  type        = list(any)
  description = "The az that the resources will be launched"
}
variable "enable_lb_delete_protection" {
  type = bool
}

variable "use_nat_gateway" {
  type = bool
}

variable "use_vpc_endpoints" {
  type = bool
}

variable "use_rds_serverless" {
  type = bool
}

variable "rds_serverless" {
  type = list(object({
    parameter_group_name = string
    engine_version       = string
    db_username          = string
    db_dbname            = string
    db_port              = string
    db_engine            = string
  }))
}

variable "use_bastion" {
  type = bool
}

variable "bastion_config" {
  description = "Configuration for the EC2 instance"
  type = object({
    spot_price_multiplier = number
    spot_price_offset     = number
    block_duration_minutes = number
    ec2key_name           = string # The EC2 keyname to create and assign
    ec2key_filename       = string # The filename to write the SSH key to
    instance_type         = string # Instance type
    githubdeploykey       = string # The SSM keyname with Github deploy key (sensitive)
  })
  sensitive = false
}

variable "use_efs_private" {
  type = bool
}

variable "efs_private_config" {
  description = "Configuration for the EFS filesystem"
  type = object({
    encrypted = bool
  })
  sensitive = false
}

variable "use_container_insights" {
  type = bool
  default = false
}