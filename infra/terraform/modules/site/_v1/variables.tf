resource "random_id" "rnd" {
  byte_length = 12
}

variable "account_zonename" {
  type = string
}

variable "subdomain_zonenames" {
  type = list(string)
}

variable "use_global_waf" {
  type = bool
}
variable "use_global_waf_realtime" {
  type = bool
}