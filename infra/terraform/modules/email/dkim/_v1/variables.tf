variable "dkim_tokens" {
  type        = list(string)
  description = "DKIM tokens for the domain"
}

variable "email_zonename" {
  type = string
}