locals {
  account_vars  = read_terragrunt_config("account.hcl")
  region        = local.account_vars.locals.region
  region_label  = local.account_vars.locals.region_label
  relative_path = replace(path_relative_to_include(), "../", "")
}

generate "provider" {
  path      = "provider.tf"
  if_exists = "overwrite_terragrunt"
  contents  = <<EOF
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

remote_state {
  backend = "s3"
  config = {
    encrypt        = true
    bucket         = get_env(upper("TG_BUCKET_${local.region_label}"), "")
    key            = "${local.relative_path}/tf.tfstate"
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

include "envcommon" {
  path   = "../modules/site/site.hcl"
  expose = true
}

terraform {
  source = "${include.envcommon.locals.base_source_url}/_v1"
}

inputs = merge(
  local.account_vars.locals
)

## TODO: Finish validating this block
errors {
  retry "transient_network" {
    retryable_errors = concat(
      get_default_retryable_errors(), [
        "(?s).*dial tcp .*: i/o timeout.*",
        "(?s).*connection reset by peer.*",
        "(?s).*context deadline exceeded.*",
        "(?s).*access denied for logdestination.*",
      ]
    )

    max_attempts       = 5
    sleep_interval_sec = 10
  }
}