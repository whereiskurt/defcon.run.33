# Create ACM certificates for each domain in var.domains
resource "aws_acm_certificate" "env_certs" {
  provider                  = aws.application
  for_each                  = toset([var.app_type])
  validation_method         = "DNS"
  domain_name               = "${each.key}.${var.account_zonename}"
  subject_alternative_names = ["*.${each.key}.${var.account_zonename}"]
}

# Create Route 53 validation records for each domain's validation options
resource "aws_route53_record" "validation" {
  provider = aws.application

  for_each = {
    for domain, cert in aws_acm_certificate.env_certs :
    domain => {
      validations = cert.domain_validation_options
      zone_id     =var.zone_map[cert.domain_name].zone_id
    }
  }
  allow_overwrite = true
  zone_id = each.value.zone_id

  # Use a for loop to extract values from the set
  name    = [for v in each.value.validations : v.resource_record_name][0]
  type    = [for v in each.value.validations : v.resource_record_type][0]
  records = [[for v in each.value.validations : v.resource_record_value][0]]

  ttl = 60
}

# Validate ACM certificates
resource "aws_acm_certificate_validation" "env_cert_validation" {
  provider        = aws.application
  for_each                  = toset([var.app_type])
  certificate_arn = aws_acm_certificate.env_certs[each.key].arn

  validation_record_fqdns = [
    for validation in aws_route53_record.validation : validation.fqdn
  ]
}