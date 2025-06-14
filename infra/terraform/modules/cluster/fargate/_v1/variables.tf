
variable "account_zonename" {
  type = string
}
variable "region_zonename" {
  type = string
}
variable "env_zonename" {
  type = string
}

variable "region_label" {
  type = string
}

variable "zone_map" {
  type = map(object({
    zone_id      = string,
    name         = string,
    name_servers = list(string)
  }))
}

variable "cert_map" {
  type = map(object({
    arn                       = string
    domain_name               = string
    subject_alternative_names = list(string)
    validation_method         = string
  }))
}

variable "dynamo_tables" {
  description = "List of DynamoDB table names"
  type        = list(string)
  # default     = []
}


variable "use_cloudfront" {
  description = "When true the app will use cloudfront"
  type        = bool
}

variable "alb_listener" {
  description = "The ARN of the load balancer listener to connect the app to"
  type        = string
  default     = ""
}

variable "alb" {
  description = "The ARN of the load balancer for CFD origin"
  type        = string
  default     = ""
}

variable "nlb" {
  description = "The ARN of the load balancer for CFD origin"
  type        = string
  default     = ""
}

variable "cf_bucket_match_public" {
  # default = ["*.js", "*.css", "/index.html"]
  default = []
}

variable "cf_bucket_match_bare" {
  default = ["/cms/*"]
}

variable "use_cfd_firehose_logging" {
  description = "When true the app will log to firehose"
  type        = bool
}

variable "global_waf_webacl_arn" {
  description = "The ARN of the load balancer Web ACL for CFD origin"
  type        = string
}

variable "cluster_id" {
  description = "The ECS Cluster ID to attach the service/tasks to."
  type        = string
}

variable "cluster_name" {
  description = "The ECS Cluster name - this is not the ARN but just the name."
  type        = string
}


variable "task_execution_role_arn" {
  description = "The ARN of the ECS task execution role"
  type        = string
}

variable "vpc_id" {
  description = "The VPC ID to attach app to."
  type        = string
}

variable "security_groups" {
  ##SGs are tied to VPC, so this should really match the vpc_id passed in
  description = "The VPC ID to attach app to."
  type        = list(string)
}

variable "subnets" {
  description = "The subnets the tasks attach to - can be public or private"
  type        = list(string)
}

variable "nlb_subnet" {
  description = "The subnets the tasks attach to - can be public or private"
  type        = list(string)
  default     = []
}
variable "use_public_subnets" {
  description = "When true the app will attach to public subnets and allocate ip addresses"
  type        = bool
}

variable "repos" {
  type        = list(string)
  description = "Names of the repository"
}

variable "repo_versions" {
  type        = map(string)
  description = "Names of the repository"
}

variable "app_type" {
  description = "Describes the module to load to support the app"
  type        = string
}

variable "use_single_table" {
  description = "Does this app_type want a dynamo db single table from electro?"
  type        = bool
  default     = false
}

variable "service_namespace" {
  description = "Cluster namespace for the services to register with"
  type        = string
}

variable "is_primary_deployment" {
  description = "When true the app will deploy an A record for apptype to the LB"
  type        = bool
  default     = true
}