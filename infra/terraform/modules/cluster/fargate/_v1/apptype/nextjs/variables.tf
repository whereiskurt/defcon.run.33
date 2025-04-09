variable "account_zonename" {
  type = string
}
variable "region_zonename" {
  type = string
}
variable "region_label" {
  type = string
}
variable "env_zonename" {
  type = string
}

variable "alb_listener" {
  description = "The ARN of the load balancer listener to connect the app to"
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

variable "service_namespace" {
  description = "Cluster namespace for the services to register with"
  type        = string
}

variable "app_type" {
  type = string
}

variable "use_alarms" {
  type    = bool
  default = false
}

variable "min_capacity" {
  type    = number
  default = 1
}

variable "max_capacity" {
  type    = number
  default = 1
}