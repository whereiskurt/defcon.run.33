data "aws_route53_zone" "mgmt" {
  provider = aws.management
  name     = var.account_zonename
}

resource "aws_route53_zone" "account_zonenames" {
  name     = "${var.region_zonename}"
  provider = aws.application
}

resource "aws_route53_record" "forward_ns_to_zones" {
  provider = aws.management
  zone_id  = data.aws_route53_zone.mgmt.zone_id
  name     = aws_route53_zone.account_zonenames.name
  type     = "NS"
  ttl      = 300
  records  = aws_route53_zone.account_zonenames.name_servers
}

resource "aws_acm_certificate" "env_cert" {
  provider                  = aws.application
  validation_method         = "DNS"
  domain_name               = "${var.env_zonename}"
  subject_alternative_names = ["*.${var.env_zonename}", "${var.region_zonename}", "*.${var.region_zonename}"]
}

resource "aws_route53_record" "cert_validation" {
  provider = aws.application

  depends_on = [aws_acm_certificate.env_cert]

  for_each = {
    for dvo in aws_acm_certificate.env_cert.domain_validation_options : "${dvo.domain_name}_validation_record" => {
      name   = dvo.resource_record_name
      type   = dvo.resource_record_type
      record = dvo.resource_record_value
    }
  }

  zone_id         = aws_route53_zone.account_zonenames.zone_id
  name            = each.value.name
  type            = each.value.type
  records         = [each.value.record]
  allow_overwrite = true
  ttl             = 60
}