resource "random_id" "admin_password" {
  byte_length = 16
}

resource "aws_ssm_parameter" "admin_password" {
  name     = "/${var.region_zonename}/admin_password"
  type     = "SecureString"
  value    = random_id.admin_password.hex
  provider = aws.application
}