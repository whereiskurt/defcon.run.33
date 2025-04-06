data "aws_region" "current" {
  provider = aws.application
}


resource "aws_efs_file_system" "efs" {
  count = var.use_efs_private ? 1 : 0
  lifecycle_policy {
    transition_to_ia = "AFTER_30_DAYS"
  }
  encrypted = var.efs_private_config.encrypted
  provider  = aws.application
}

resource "aws_efs_mount_target" "efs_private_mount" {
  for_each = var.use_efs_private ? { for idx, id in aws_subnet.private_subnet[*].id : idx => id } : {}

  file_system_id  = aws_efs_file_system.efs[0].id
  subnet_id       = each.value
  security_groups = [aws_security_group.efs[0].id]
  provider        = aws.application
}

output "efs_mount_targets" {
  description = "EFS mount target details including availability zone and DNS name."
  value = {
    for k, v in aws_efs_mount_target.efs_private_mount :
    k => {
      availability_zone = v.availability_zone_id
      dns_name          = "${aws_efs_file_system.efs[0].id}.efs.${data.aws_region.current.name}.amazonaws.com"
      ip_address        = v.ip_address
    }
  }
}

resource "aws_security_group" "efs" {
  count = var.use_efs_private ? 1 : 0

  name        = "efs"
  description = "efs internal security group"
  vpc_id      = aws_vpc.vpc.id
  ingress {
    from_port       = 2049
    to_port         = 2049
    protocol        = "tcp"
    security_groups = [aws_security_group.http_only.id, aws_security_group.sshhttps.id, aws_security_group.postgres.id]
  }
  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  provider = aws.application
}
