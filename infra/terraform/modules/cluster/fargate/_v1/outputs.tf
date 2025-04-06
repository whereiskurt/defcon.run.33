resource "aws_ssm_parameter" "cf_access_key" {
  count = var.use_cloudfront ? 1 : 0
  name     = "/${var.region_zonename}/cf/access_key"
  type     = "String"
  value    = aws_iam_access_key.cf_user_key[0].id
  provider = aws.application
}
resource "aws_ssm_parameter" "cf_secret_key" {
  count = var.use_cloudfront ? 1 : 0
  name     = "/${var.region_zonename}/cf/secret_key"
  type     = "SecureString"
  value    = aws_iam_access_key.cf_user_key[0].secret
  provider = aws.application
}

resource "aws_ssm_parameter" "cf_bucket" {
  count = var.use_cloudfront ? 1 : 0
  name     = "/${var.region_zonename}/cf/bucket_name"
  type     = "String"
  value    = aws_s3_bucket.cf_bucket[0].id
  provider = aws.application
}

resource "aws_ssm_parameter" "cf_cdn_url" {
  count = var.use_cloudfront ? 1 : 0
  name     = "/${var.region_zonename}/cf/cdn_url"
  type     = "String"
  value    = "https://${var.region_zonename}"
  provider = aws.application
}

resource "aws_ssm_parameter" "dynamo_access_key" {
  name     = "/${var.region_zonename}/dynamodb/access_key"
  type     = "String"
  value    = aws_iam_access_key.this.id
  provider = aws.application
}

resource "aws_ssm_parameter" "dynamo_secret_key" {
  name     = "/${var.region_zonename}/dynamodb/secret_key"
  type     = "SecureString"
  value    = aws_iam_access_key.this.secret
  provider = aws.application
}
