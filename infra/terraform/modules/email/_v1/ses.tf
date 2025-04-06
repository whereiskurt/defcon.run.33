data "aws_route53_zone" "mgmt" {
  name     = var.account_zonename
  provider = aws.management
}

data "aws_route53_zone" "email_zonename" {
  name     = var.email_zonename
  provider = aws.global-application
}

resource "aws_ses_domain_identity" "this" {
  domain   = var.region_zonename
  provider = aws.application
}

resource "aws_route53_record" "ses_verification_record" {
  zone_id  = data.aws_route53_zone.email_zonename.zone_id
  name     = var.region_zonename
  type     = "TXT"
  ttl      = 600
  records  = [aws_ses_domain_identity.this.verification_token]
  provider = aws.global-application
}

resource "aws_ses_domain_dkim" "this" {
  depends_on = [aws_ses_domain_identity.this]
  domain     = var.region_zonename
  provider   = aws.application
}

resource "aws_ses_domain_mail_from" "this" {
  depends_on             = [aws_ses_domain_identity.this]
  domain                 = var.region_zonename
  mail_from_domain       = var.smtpfrom_zonename
  behavior_on_mx_failure = "UseDefaultValue"
  provider               = aws.application
}

resource "aws_route53_record" "mail_from_mx" {
  zone_id  = data.aws_route53_zone.email_zonename.zone_id
  name     = aws_ses_domain_mail_from.this.mail_from_domain
  type     = "MX"
  ttl      = 600
  records  = ["10 feedback-smtp.${var.region}.amazonses.com"]
  provider = aws.global-application

}

resource "aws_route53_record" "mail_from_txt" {
  zone_id  = data.aws_route53_zone.email_zonename.zone_id
  name     = aws_ses_domain_mail_from.this.mail_from_domain
  type     = "TXT"
  ttl      = 600
  records  = ["v=spf1 include:amazonses.com -all"]
  provider = aws.global-application

}

resource "aws_route53_record" "dmarc_record" {
  zone_id = data.aws_route53_zone.email_zonename.zone_id
  name    = "_dmarc.${var.region_zonename}"
  type    = "TXT"
  ttl     = 600
  records = [
    "v=DMARC1; p=quarantine; rua=mailto:dmarc-reports@${var.region_zonename}; ruf=mailto:dmarc-failures@${var.region_zonename}; sp=none; aspf=r;"
  ]
  provider = aws.global-application
}

resource "aws_iam_user" "ses_user" {
  name     = "ses_${var.smtpfrom_zonename}"
  provider = aws.application

}

resource "aws_iam_user_policy" "ses_policy" {
  name = "ses_user_policy"
  user = aws_iam_user.ses_user.name
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "ses:SendEmail",
          "ses:SendRawEmail"
        ]
        Resource = "*"
      }
    ]
  })
  provider = aws.application
}

resource "aws_iam_access_key" "ses_user_key" {
  user     = aws_iam_user.ses_user.name
  provider = aws.application
}
