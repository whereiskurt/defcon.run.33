locals {
  account_vars     = read_terragrunt_config(find_in_parent_folders("account.hcl"))
  region_vars      = read_terragrunt_config(find_in_parent_folders("region.hcl"))
  environment_vars = read_terragrunt_config("resource.hcl")

  region       = local.region_vars.locals.region
  region_label = local.region_vars.locals.label
}

#######
## Terragrunt block below generates the providers needed for the different AWS accounts and regions
#########
# The following profiles are used to differentiate between the different AWS accounts and regions.
#   - application - switches between $REGIONS, deploys the workload
#   - global-application - always pined to us-east-1 for CloudFront and global WAF
#   - management - switches between $REGIONS, and used for DNS Zone delegation setup
#   - terraform - keeps the state files in this account
#######
generate "provider" {
  path      = "provider.tf"
  if_exists = "overwrite_terragrunt"
  contents  = <<EOF
    provider "aws" {
      alias   = "application"
      region = "${local.region}"
      profile = "application"
    }
    provider "aws" {
      alias   = "management"
      region = "${local.region}"
      profile = "management"
    }
    provider "aws" {
      alias   = "global-application"
      region = "us-east-1"
      profile = "application"
    }
    provider "aws" {
      alias   = "global-management"
      region = "us-east-1"
      profile = "management"
    }
    provider "aws" {
      alias   = "terraform"
      region = "${local.region}"
      profile = "teraform"
    }
    terraform {
      required_providers {
        random = {
          source  = "hashicorp/random"
          version = "~> 3.6"
        }
      }
    }
EOF
}

## The setup below relies on the AWS terraform profile
remote_state {
  backend = "s3"
  config = {
    encrypt        = true
    bucket         = get_env(upper("TG_BUCKET_${local.region_label}"), "")
    key            = "${path_relative_to_include()}/tf.tfstate"
    region         = local.region
    dynamodb_table = get_env(upper("TG_TABLE_${local.region_label}"), "")
    profile        = "terraform"
  }
  generate = {
    path      = "backend.tf"
    if_exists = "overwrite_terragrunt"
  }
}

catalog {
  urls = [
    "https://github.com/gruntwork-io/terraform-aws-utilities",
    "https://github.com/gruntwork-io/terraform-kubernetes-namespace"
  ]
}

inputs = merge(
  local.account_vars.locals,
  local.region_vars.locals,
  local.environment_vars.locals,
)