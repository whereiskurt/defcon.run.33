output "dkim_tokens" {
  value = aws_ses_domain_dkim.this.dkim_tokens
}

output "email_zonename" {
  value = var.email_zonename
}

resource "aws_ssm_parameter" "email_zonename" {
  name     = "/${var.region_zonename}/ses/email_zonename"
  type     = "String"
  value    = var.email_zonename
  provider = aws.application
}

resource "aws_ssm_parameter" "email_uri" {
  name     = "/${var.region_zonename}/ses/email_uri"
  type     = "String"
  value    = "https://email.${var.region}.amazonaws.com"
  provider = aws.application
}

resource "aws_ssm_parameter" "smtp_url" {
  name     = "/${var.region_zonename}/ses/smtp_url"
  type     = "SecureString"
  value    = "smtp://${aws_iam_access_key.ses_user_key.id}:${aws_iam_access_key.ses_user_key.secret}@email-smtp.${var.region}.amazonaws.com:587"
  provider = aws.application
}

resource "aws_ssm_parameter" "smtp_host" {
  name     = "/${var.region_zonename}/ses/smtp_host"
  type     = "String"
  value    = "email-smtp.${var.region}.amazonaws.com"
  provider = aws.application
}

resource "aws_ssm_parameter" "ses_access_key" {
  name     = "/${var.region_zonename}/ses/access_key"
  type     = "String"
  value    = aws_iam_access_key.ses_user_key.id
  provider = aws.application
}

resource "aws_ssm_parameter" "ses_secret_key" {
  name     = "/${var.region_zonename}/ses/secret_key"
  type     = "SecureString"
  value    = aws_iam_access_key.ses_user_key.secret
  provider = aws.application
}

resource "aws_ssm_parameter" "ses_from_address" {
  name     = "/${var.region_zonename}/ses/from_address"
  type     = "SecureString"
  value    = "support@${var.region_zonename}"
  provider = aws.application
}


resource "aws_ssm_parameter" "ses_replyto_address" {
  name     = "/${var.region_zonename}/ses/replyto_address"
  type     = "SecureString"
  value    = "support@${var.region_zonename}"
  provider = aws.application
}