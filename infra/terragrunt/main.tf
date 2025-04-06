provider "aws" {
  region  = "us-east-1"
  profile = "terraform"
  alias   = "use1"
}
provider "aws" {
  region  = "ca-central-1"
  profile = "terraform"
  alias   = "cac1"
}
provider "aws" {
  region  = "us-west-2"
  profile = "terraform"
  alias   = "usw2"
}

module "tf-use1" {
  source              = "./modules"
  region-bucket-label = "use1"
  providers = {
    aws.terraform = aws.use1
  }
}
module "tf-cac1" {
  source              = "./modules"
  region-bucket-label = "cac1"
  providers = {
    aws.terraform = aws.cac1
  }
}

module "tf-usw2" {
  source              = "./modules"
  region-bucket-label = "usw2"
  providers = {
    aws.terraform = aws.usw2
  }
}

output "bucket-use1" {
  value = module.tf-use1.bucket
}
output "table-use1" {
  value = module.tf-use1.table
}

output "bucket-cac1" {
  value = module.tf-cac1.bucket
}
output "table-cac1" {
  value = module.tf-cac1.table
}

output "bucket-usw2" {
  value = module.tf-usw2.bucket
}
output "table-usw2" {
  value = module.tf-usw2.table
}
