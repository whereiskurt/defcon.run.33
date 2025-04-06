terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.78.0"
      configuration_aliases = [
        aws.terraform
      ]
    }
    random = {
      source  = "hashicorp/random"
      version = "~> 3.6"
    }
  }
  required_version = ">= 1.8.1"
}


variable "region-bucket-label" {
  type        = string
  description = "Abreivation for the bucket (eg. cac1,use1,etc.)"
}

resource "random_id" "rnd" {
  byte_length = 8
}

resource "aws_s3_bucket" "this" {
  bucket        = "tf-dc33-${random_id.rnd.hex}-${var.region-bucket-label}"
  provider      = aws.terraform
  force_destroy = true
}

output "bucket" {
  value = aws_s3_bucket.this.bucket
}
output "table" {
  value = aws_dynamodb_table.this.name
}

resource "aws_dynamodb_table" "this" {
  name         = "tf-dc33-${random_id.rnd.hex}-${var.region-bucket-label}"
  hash_key     = "LockID"
  billing_mode = "PAY_PER_REQUEST"
  attribute {
    name = "LockID"
    type = "S"
  }
  server_side_encryption {
    enabled = true
  }
  point_in_time_recovery {
    enabled = true
  }
  provider = aws.terraform
}
