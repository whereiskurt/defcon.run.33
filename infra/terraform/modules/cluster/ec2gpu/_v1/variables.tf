variable "account_zonename" {
  type = string
}
variable "region_zonename" {
  type = string
}
variable "env_zonename" {
  type = string
}

variable "use_bastion" {
  type = bool
}

variable "ec2gpu_config" {
  description = "Configuration for the EC2 instance"
  type = object({
    spot_price_multiplier = number
    spot_price_offset     = number
    ec2key_name           = string # The EC2 keyname to create and assign
    ec2key_filename       = string # The filename to write the SSH key to
    instance_type         = string # Instance type
  })
  sensitive = false
}
