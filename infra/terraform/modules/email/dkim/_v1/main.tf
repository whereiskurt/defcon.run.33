data "aws_route53_zone" "email" {
  provider = aws.global-application
  name     = var.email_zonename
}

resource "aws_route53_record" "ses_dkim_records" {
  provider = aws.global-application
  count    = length(var.dkim_tokens)
  zone_id  = data.aws_route53_zone.email.zone_id
  name     = "${var.dkim_tokens[count.index]}._domainkey.${var.email_zonename}"
  type     = "CNAME"
  ttl      = 600
  records  = ["${var.dkim_tokens[count.index]}.dkim.amazonses.com"]
}
