output "task_execution_role" {
  value = aws_iam_role.ecs_role.arn
}

output "cluster_id" {
  value = aws_ecs_cluster.ecs.id
}
output "cluster_name" {
  value = aws_ecs_cluster.ecs.name
}

output "alb_public" {
  value = aws_lb.lb_public.arn
}
output "alb_listener" {
  value = aws_lb_listener.https.arn
}

output "nlb_public" {
  value = aws_lb.nlb_public[0].arn
}

output "vpc_id" {
  value = aws_vpc.vpc.id
}

output "private_subnets" {
  value = aws_subnet.private_subnet[*].id
}

output "public_subnets" {
  value = aws_subnet.public_subnet[*].id
}

output "nlb_public_subnet" {
  value = aws_subnet.nlb_public_subnet[*].id
}
output "nlb_private_subnet" {
  value = aws_subnet.nlb_private_subnet[*].id
}
output "security_groups" {
  value = [
    aws_security_group.sshhttps.id,
    aws_security_group.http_only.id,
    aws_security_group.postgres.id,
    aws_security_group.etherpad.id,
    aws_security_group.nlb.id

  ]
}

output "last_spot_price" {
  value = {
    for idx, instance in aws_spot_instance_request.ec2vm : idx => {
      last_price : data.aws_ec2_spot_price.last_price.spot_price
      offered_price : instance.spot_price
    }
  }
}

output "bastion_instances" {
  value = {
    for idx, instance in aws_spot_instance_request.ec2vm : idx => {
      public_ip  = instance.public_ip
      public_dns = instance.public_dns
    }
  }
}

output "service_namespace" {
  value = aws_service_discovery_private_dns_namespace.namespace.id
}

output "ecs_common_bucket_name" {
  description = "Name of the S3 bucket for ECS tasks"
  value       = aws_s3_bucket.ecs_bucket.bucket
}
output "ecs_common_bucket_arn" {
  description = "ARN of the S3 bucket for ECS tasks"
  value       = aws_s3_bucket.ecs_bucket.arn
}
output "ecs_common_bucket_domain_name" {
  description = "Domain name of the S3 bucket for ECS tasks"
  value       = aws_s3_bucket.ecs_bucket.bucket_domain_name
}
