resource "aws_ssm_parameter" "smtp_host" {
  name     = "/${var.region_zonename}/smtp/host"
  type     = "String"
  value    = "email.us-east-1.amazonaws.com"
  provider = aws.application
}
resource "aws_ssm_parameter" "region" {
  name     = "/${var.region_zonename}/s3/region"
  type     = "String"
  value    = local.region_label_map[var.region_label]
  provider = aws.application
}
resource "aws_ssm_parameter" "node_env" {
  name     = "/${var.region_zonename}/node_env"
  type     = "String"
  value    = "production"
  provider = aws.application
}

resource "aws_ssm_parameter" "cf_root_path" {
  name     = "/${var.region_zonename}/cf/root_path"
  type     = "String"
  value    = "cms"
  provider = aws.application
}

resource "random_id" "app_keys" {
  byte_length = 32
  count       = 4
}
resource "aws_ssm_parameter" "app_keys" {
  name     = "/${var.region_zonename}/secrets/app_keys"
  type     = "SecureString"
  value    = join(",", [for id in random_id.app_keys[*] : base64encode(id.b64_std)])
  provider = aws.application
}

resource "random_id" "jwt_secret" {
  byte_length = 32
}
resource "aws_ssm_parameter" "jwt_secret" {
  name     = "/${var.region_zonename}/secrets/jwt_secret"
  type     = "SecureString"
  value    = base64encode(random_id.jwt_secret.b64_std)
  provider = aws.application
}

resource "random_id" "api_token_salt" {
  byte_length = 32
}
resource "aws_ssm_parameter" "api_token_salt" {
  name     = "/${var.region_zonename}/secrets/api_token_salt"
  type     = "SecureString"
  value    = base64encode(random_id.api_token_salt.b64_std)
  provider = aws.application
}

resource "random_id" "admin_jwt_secret" {
  byte_length = 32
}
resource "aws_ssm_parameter" "admin_jwt_secret" {
  name     = "/${var.region_zonename}/secrets/admin_jwt_secret"
  type     = "SecureString"
  value    = base64encode(random_id.admin_jwt_secret.b64_std)
  provider = aws.application
}

resource "random_id" "transfer_token_salt" {
  byte_length = 32
}
resource "aws_ssm_parameter" "transfer_token_salt" {
  name     = "/${var.region_zonename}/secrets/transfer_token_salt"
  type     = "SecureString"
  value    = base64encode(random_id.transfer_token_salt.b64_std)
  provider = aws.application
}
