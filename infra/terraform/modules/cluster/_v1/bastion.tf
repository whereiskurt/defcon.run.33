data "aws_ami" "base_ami" {
  most_recent = true
  owners      = ["amazon"]

  filter {
    name   = "name"
    values = ["al2023-ami-2023.*-arm64"]
  }

  filter {
    name   = "architecture"
    values = ["arm64"]
  }

  filter {
    name   = "virtualization-type"
    values = ["hvm"]
  }
  provider = aws.application
}

data "aws_ec2_spot_price" "last_price" {
  instance_type     = var.bastion_config.instance_type
  availability_zone = var.availability_zones[0]

  filter {
    name   = "product-description"
    values = ["Linux/UNIX"]
  }
  provider = aws.application
}

resource "tls_private_key" "subastion" {
  count = var.use_bastion ? 1 : 0

  algorithm = "RSA"
  rsa_bits  = 4096
}

resource "aws_key_pair" "subastion_key" {
  count = var.use_bastion ? 1 : 0

  key_name   = var.bastion_config.ec2key_name
  public_key = tls_private_key.subastion[0].public_key_openssh
  provider   = aws.application

}

resource "local_file" "bastion_key_pem" {
  count = var.use_bastion ? 1 : 0

  depends_on      = [aws_key_pair.subastion_key[0]]
  file_permission = 0400
  content         = tls_private_key.subastion[0].private_key_pem
  filename        = var.bastion_config.ec2key_filename
}

resource "aws_spot_instance_request" "ec2vm" {
  provider = aws.application
  count    = var.use_bastion ? 1 : 0

  depends_on           = [aws_key_pair.subastion_key[0]]
  ami                  = data.aws_ami.base_ami.image_id
  instance_type        = var.bastion_config.instance_type
  spot_price           = format("%.6f", (data.aws_ec2_spot_price.last_price.spot_price * var.bastion_config.spot_price_multiplier) + var.bastion_config.spot_price_offset)
  user_data            = file("${path.module}/bastion/ec2.userdata.sh")
  subnet_id            = aws_subnet.public_subnet[0].id
  availability_zone    = var.availability_zones[0]
  key_name             = var.bastion_config.ec2key_name
  security_groups      = [aws_security_group.sshhttps.id, aws_security_group.http_only.id, aws_security_group.postgres.id]
  iam_instance_profile = aws_iam_instance_profile.ec2ssm-profile[0].name

  associate_public_ip_address = true

  wait_for_fulfillment = true

  # block_duration_minutes = var.bastion_config.block_duration_minutes

  tags = { Name = "${var.region_zonename}-bastion" }

  lifecycle {
    ignore_changes = [
      security_groups,
      spot_price
    ]
  }

}

resource "aws_launch_template" "spot_instance_template" {
  count = var.use_bastion ? 1 : 0

  name          = "${var.region_zonename}-bastion-template"
  image_id      = data.aws_ami.base_ami.image_id
  instance_type = var.bastion_config.instance_type
  key_name      = var.bastion_config.ec2key_name
  user_data     = base64encode(file("${path.module}/bastion/ec2.userdata.sh"))

  network_interfaces {
    associate_public_ip_address = true
    subnet_id                   = aws_subnet.public_subnet[0].id
    security_groups             = [aws_security_group.sshhttps.id, aws_security_group.http_only.id, aws_security_group.postgres.id]
  }

  iam_instance_profile {
    name = aws_iam_instance_profile.ec2ssm-profile[0].name
  }

  tag_specifications {
    resource_type = "instance"
    tags = {
      Name = "${var.region_zonename}-bastion"
    }
  }
  provider = aws.application
}

resource "aws_ssm_association" "ec2_githubkey" {
  count = var.use_bastion ? 1 : 0

  provider         = aws.application
  name             = "${var.region_zonename}-github"
  document_version = aws_ssm_document.githubkey_conf[0].default_version
  parameters = {
    "cmd" : templatefile("${path.module}/bastion/githubssh.setup.tftpl", {
      "githubkey" : var.bastion_config.githubdeploykey
    }),
  }
  targets {
    key    = "InstanceIds"
    values = [aws_spot_instance_request.ec2vm[0].spot_instance_id]
  }
}

resource "aws_iam_instance_profile" "ec2ssm-profile" {
  count = var.use_bastion ? 1 : 0
  provider = aws.application
  name     = "${var.region_zonename}-ec2vm-sssm-profile"
  role     = aws_iam_role.ec2ssm-role[0].name
}
resource "aws_iam_role" "ec2ssm-role" {
  count = var.use_bastion ? 1 : 0
  provider           = aws.application
  name               = "${var.region_zonename}-ssm-role"
  assume_role_policy = file("${path.module}/bastion/ec2.trustpolicy.json")
}
resource "aws_iam_role_policy_attachment" "resource-ssm-policy" {
  count = var.use_bastion ? 1 : 0
  provider   = aws.application
  role       = aws_iam_role.ec2ssm-role[0].name
  policy_arn = "arn:aws:iam::aws:policy/AmazonSSMManagedInstanceCore"
}
resource "aws_ssm_document" "githubkey_conf" {
  count = var.use_bastion ? 1 : 0
  provider      = aws.application
  document_type = "Command"
  name          = "${var.region_zonename}-github"
  content       = file("${path.module}/bastion/githubssh.ssm.json")
}
