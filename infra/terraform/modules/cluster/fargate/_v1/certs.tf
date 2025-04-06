
resource "aws_acm_certificate" "region_local" {
  provider                  = aws.application
  validation_method         = "DNS"
  domain_name               = var.region_zonename
  subject_alternative_names = ["*.${var.region_zonename}"]
}

resource "aws_route53_record" "cert_verify_local" {
  provider = aws.application

  for_each = {
    for dvo in aws_acm_certificate.region_local.domain_validation_options : "${dvo.domain_name}_validation_record" => {
      name   = dvo.resource_record_name
      type   = dvo.resource_record_type
      record = dvo.resource_record_value
    }
  }

  ##zone_id         = aws_route53_zone.region.id
  zone_id         = var.zone_map[var.env_zonename].zone_id
  name            = each.value.name
  type            = each.value.type
  records         = [each.value.record]
  allow_overwrite = true
  ttl             = 60
}

resource "aws_acm_certificate_validation" "region_validation_local" {
  provider                = aws.application
  certificate_arn         = aws_acm_certificate.region_local.arn
  validation_record_fqdns = [for record in aws_route53_record.cert_verify_local : record.fqdn]
}

resource "aws_lb_listener_certificate" "add_certs" {
  depends_on      = [aws_acm_certificate_validation.region_validation_local]
  listener_arn    = data.aws_lb_listener.this.arn
  certificate_arn = aws_acm_certificate.region_local.arn
  provider        = aws.application
}

