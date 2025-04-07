locals {
  label            = "defcon.run"
  account_zonename = "defcon.run"

  ##Used for remote state in the global-management account
  region       = "us-east-1"
  region_label = "use1"

  ## These zones support global resource redirection regions
  subdomain_zonenames = ["webapp", "strapi", "email", "etherpad", "mqtt"]

  ## When use_global_waf is true, applications CFD will use this globally configured WAF webacl.
  use_global_waf          = false
  ## When false it will use just cloud watch without kinesis
  use_global_waf_realtime = false
}