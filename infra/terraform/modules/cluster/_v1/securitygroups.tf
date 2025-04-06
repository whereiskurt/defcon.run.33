data "aws_ec2_managed_prefix_list" "cloudfront" {
  name = "com.amazonaws.global.cloudfront.origin-facing"
  provider = aws.application
}

resource "aws_security_group" "sshhttps" {
  provider    = aws.application
  name        = "securemgmt"
  description = "Allow TLS inbound traffic"
  vpc_id      = aws_vpc.vpc.id
  ingress = [
    {
      description      = "HTTPS port to VPC"
      from_port        = 443
      to_port          = 443
      protocol         = "tcp"
      cidr_blocks      = []
      ipv6_cidr_blocks = []
      self             = true
      prefix_list_ids  = [data.aws_ec2_managed_prefix_list.cloudfront.id]
      security_groups  = []
    },
    {
      description      = "SSH port to VPC "
      from_port        = 22
      to_port          = 22
      protocol         = "tcp"
      cidr_blocks      = ["0.0.0.0/0"]
      ipv6_cidr_blocks = []
      self             = true
      prefix_list_ids  = []
      security_groups  = []
    }
  ]
  egress = [
    {
      description      = "All outbound from VPC"
      from_port        = 0
      to_port          = 0
      protocol         = "-1"
      cidr_blocks      = ["0.0.0.0/0"]
      ipv6_cidr_blocks = ["::/0"]
      self             = true
      prefix_list_ids  = []
      security_groups  = []
    }
  ]

  tags = merge(
    { Name = "${var.env_zonename}-securemgmt" }
  )
}

resource "aws_security_group" "http_only" {
  provider    = aws.application
  name        = "http_only"
  description = "Allow HTTP inbound traffic for certbot setup"
  vpc_id      = aws_vpc.vpc.id
  ingress = [
    {
      description      = "HTTP port to VPC"
      from_port        = 80
      to_port          = 80
      protocol         = "tcp"
      cidr_blocks      = ["0.0.0.0/0"]
      ipv6_cidr_blocks = []
      self             = true
      prefix_list_ids  = []
      security_groups  = []
    },
    {
      description      = "HTTP port to VPC"
      from_port        = 8080
      to_port          = 8080
      protocol         = "tcp"
      cidr_blocks      = []
      ipv6_cidr_blocks = []
      self             = true
      prefix_list_ids  = []
      security_groups  = []
    },
    {
      description      = "HTTP port to VPC"
      from_port        = 3000
      to_port          = 3000
      protocol         = "tcp"
      cidr_blocks      = []
      ipv6_cidr_blocks = []
      self             = true
      prefix_list_ids  = []
      security_groups  = []
    }
  ]
  tags = merge(
    { Name = "${var.env_zonename}-http_only" }
  )
}

resource "aws_security_group" "postgres" {
  name        = "postgres"
  description = "Strapi Postgress internal security group"
  vpc_id      = aws_vpc.vpc.id
  ingress {
    from_port       = 5432
    to_port         = 5432
    protocol        = "tcp"
    security_groups = [aws_security_group.http_only.id, aws_security_group.sshhttps.id]
    self            = true
  }
  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  provider = aws.application
}

resource "aws_security_group" "etherpad" {
  name        = "etherpad"
  description = "Strapi Postgress internal security group"
  vpc_id      = aws_vpc.vpc.id
  ingress {
    from_port       = 9001
    to_port         = 9001
    protocol        = "tcp"
    security_groups = [aws_security_group.http_only.id, aws_security_group.sshhttps.id]
    self            = true
  }
  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  provider = aws.application
}

resource "aws_security_group" "nlb" {
  name        = "mqtt-nlb"
  description = "mqtt rules for TLS and regular traffic"
  vpc_id      = aws_vpc.vpc.id

  ingress = [
    {
      description      = "TLS MQTT"
      from_port        = 8883
      to_port          = 8883
      protocol         = "tcp"
      cidr_blocks      = ["0.0.0.0/0"]
      ipv6_cidr_blocks = []
      self             = true
      prefix_list_ids  = []
      security_groups  = []
    },
    {
      description      = "MQTT"
      from_port        = 1883
      to_port          = 1883
      protocol         = "tcp"
      cidr_blocks      = ["0.0.0.0/0"]
      ipv6_cidr_blocks = []
      self             = true
      prefix_list_ids  = []
      security_groups  = []
    },
    {
      description      = "Websocket-MQTT"
      from_port        = 9001
      to_port          = 9001
      protocol         = "tcp"
      cidr_blocks      = []
      ipv6_cidr_blocks = []
      self             = true
      prefix_list_ids  = []
      security_groups  = []
    },
    {
      description      = "TLS-WebSocket-MQTT"
      from_port        = 8443
      to_port          = 8443
      protocol         = "tcp"
      cidr_blocks      = ["0.0.0.0/0"]
      ipv6_cidr_blocks = []
      self             = true
      prefix_list_ids  = []
      security_groups  = []
    },
    {
      description      = "HTTPS"
      from_port        = 443
      to_port          = 443
      protocol         = "tcp"
      cidr_blocks      = ["0.0.0.0/0"]
      ipv6_cidr_blocks = []
      self             = true
      prefix_list_ids  = []
      security_groups  = []
    }
  ]

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  provider = aws.application
}