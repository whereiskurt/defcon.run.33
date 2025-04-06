data "aws_route53_zone" "mgmt" {
  provider = aws.global-management
  name     = var.account_zonename
}

locals {
  zone_records = {
    for zone in flatten([
      for k, v in aws_route53_zone.account_zonenames : [
        {
          key         = v.name
          zone_id     = v.zone_id
          domain_name = v.name
        }
      ]
    ]) :
    zone.domain_name => {
      zone_id     = zone.zone_id
      domain_name = zone.domain_name
    }
  }
}

resource "aws_route53_zone" "account_zonenames" {
  for_each = toset(var.subdomain_zonenames)
  name     = "${each.key}.${var.account_zonename}"
  provider = aws.global-application
}

resource "aws_route53_record" "forward_ns_to_zones" {
  provider = aws.global-management
  for_each = aws_route53_zone.account_zonenames

  zone_id = data.aws_route53_zone.mgmt.zone_id
  name    = each.value.name
  type    = "NS"
  ttl     = 300

  records = each.value.name_servers
}