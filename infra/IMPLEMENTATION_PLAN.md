# Implementation Plan: Infrastructure Cleanup

## Phase 1: Fix NextJS Hardcoded Values (IMMEDIATE - 4 hours)

### Problem
The `nextjs` module is the only module with hardcoded values, breaking consistency with other properly parameterized modules.

### Files to Modify

#### 1. Update `modules/cluster/fargate/_v1/apptype/nextjs/ecs.tf`
**Add parameterization matching mqtt/strapi pattern:**

```hcl
# Add after line 22 (locals section)
locals {
  parameter_arn = "arn:aws:ssm:${data.aws_region.current.name}:${data.aws_caller_identity.current.account_id}:parameter"
  
  region_label_map = {
    use1 = "us-east-1"
    cac1 = "ca-central-1"
    usw2 = "us-west-2"
  }
}

# Update container_definitions templatefile call (around line 43)
container_definitions = templatefile(
  "${path.module}/taskdef/taskdef.json.tftpl", {
    safedomain = replace(var.env_zonename, ".", "-")
    region     = data.aws_region.current.name
    
    name = {
      nginx = replace("nginx-${var.env_zonename}", ".", "-")
      app   = "app"
    }
    
    image = {
      nginx = "${aws_ecr_repository.repos["nginx"].repository_url}:${var.repo_versions["nginx"]}"
      app   = "${aws_ecr_repository.repos["app"].repository_url}:${var.repo_versions["app"]}"
    }
    
    log_region = {
      nginx = data.aws_region.current.name
      app   = data.aws_region.current.name
    }
    
    healthcheck_url = {
      nginx = "https://localhost/hello"
      app   = "http://localhost:3000"
    }
    
    app_url = {
      nginx = "https://${var.env_zonename}"
      app   = "http://localhost:3000"
    }
    
    # Parameterized SSM paths
    p_app     = "${local.parameter_arn}/${var.region_zonename}"
    p_email   = "${local.parameter_arn}/${var.region_label}.email.${var.account_zonename}"
    p_cluster = "${local.parameter_arn}/${var.region_label}.${var.account_zonename}"
    
    # App-specific URLs
    nextauth_url = "https://${replace(var.env_zonename, "mqtt.", "run.")}"
    strapi_url   = "https://strapi.${var.account_zonename}"
    
    # Move to variable
    invite_codes = var.invite_codes
    
    cpu = {
      nginx = var.container_resources.nginx.cpu
      app   = var.container_resources.app.cpu
    }
    memory = {
      nginx = var.container_resources.nginx.memory
      app   = var.container_resources.app.memory
    }
    memoryReservation = {
      nginx = var.container_resources.nginx.memory_reservation
      app   = var.container_resources.app.memory_reservation
    }
  }
)
```

#### 2. Update `modules/cluster/fargate/_v1/apptype/nextjs/taskdef/taskdef.json.tftpl`
**Replace all hardcoded values with template variables:**

```json
"secrets": [
  {
    "name": "AUTH_SECRET",
    "valueFrom": "${p_app}/auth/secret"
  },
  {
    "name": "AUTH_STRAPI_TOKEN", 
    "valueFrom": "${p_app}/auth/strapi_token"
  },
  {
    "name": "AUTH_GITHUB_ID",
    "valueFrom": "${p_app}/auth/github/id"
  },
  {
    "name": "AUTH_GITHUB_SECRET",
    "valueFrom": "${p_app}/auth/github/secret"
  },
  {
    "name": "AUTH_STRAVA_CLIENT_ID",
    "valueFrom": "${p_app}/auth/strava/id"
  },
  {
    "name": "AUTH_STRAVA_CLIENT_SECRET",
    "valueFrom": "${p_app}/auth/strava/secret"
  },
  {
    "name": "AUTH_DISCORD_CLIENT_ID",
    "valueFrom": "${p_app}/auth/discord/id"
  },
  {
    "name": "AUTH_DISCORD_CLIENT_SECRET",
    "valueFrom": "${p_app}/auth/discord/secret"
  },
  {
    "name": "AUTH_DYNAMODB_ID",
    "valueFrom": "${p_cluster}/next-auth/access_key"
  },
  {
    "name": "AUTH_DYNAMODB_SECRET",
    "valueFrom": "${p_cluster}/next-auth/secret_key"
  },
  {
    "name": "AUTH_DYNAMODB_DBNAME",
    "valueFrom": "${p_cluster}/next-auth/dbname"
  },
  {
    "name": "AUTH_SMTP_FROM",
    "valueFrom": "${p_email}/ses/from_address"
  },
  {
    "name": "AUTH_SMTP_URL",
    "valueFrom": "${p_email}/ses/smtp_url_v4"
  },
  {
    "name": "USER_DYNAMODB_ID",
    "valueFrom": "${p_cluster}/dynamodb/access_key"
  },
  {
    "name": "USER_DYNAMODB_SECRET",
    "valueFrom": "${p_cluster}/dynamodb/secret_key"
  },
  {
    "name": "USER_DYNAMODB_SINGLE_TABLE",
    "valueFrom": "${p_cluster}/dynamodb/single_table"
  }
],
"environment": [
  {
    "name": "AUTH_DYNAMODB_REGION",
    "value": "${region}"
  },
  {
    "name": "USER_DYNAMODB_REGION", 
    "value": "${region}"
  },
  {
    "name": "AUTH_ALLOWED_EMAILS",
    "value": "all"
  },
  {
    "name": "AUTH_INVITE_CODES",
    "value": "${invite_codes}"
  },
  {
    "name": "NEXTAUTH_URL",
    "value": "${nextauth_url}"
  },
  {
    "name": "STRAPI_URL",
    "value": "${strapi_url}"
  }
]
```

#### 3. Add variables to `modules/cluster/fargate/_v1/apptype/nextjs/variables.tf`

```hcl
variable "invite_codes" {
  type        = string
  description = "Comma-separated list of invite codes"
  default     = "hacktheplanet,23tenalpehtkcah"
}

variable "container_resources" {
  type = object({
    nginx = object({
      cpu               = number
      memory            = number  
      memory_reservation = number
    })
    app = object({
      cpu               = number
      memory            = number
      memory_reservation = number
    })
  })
  description = "Container resource allocations"
  default = {
    nginx = {
      cpu               = 128
      memory            = 256
      memory_reservation = 256
    }
    app = {
      cpu               = 256
      memory            = 512
      memory_reservation = 512
    }
  }
}
```

### Pre-Implementation Checklist
1. **Backup**: Ensure git repo is committed
2. **SSM Parameters**: Verify existing parameters match new paths, or migrate them
3. **Testing**: Plan for service restart after deployment

### Risk Mitigation
- **Parameter Migration**: You'll need to copy/move SSM parameters from old hardcoded paths to new parameterized paths
- **Service Downtime**: ECS will restart containers with new task definition
- **Rollback Plan**: Keep old task definition ARN for quick rollback if needed

## Phase 2: NLB Consolidation (6-8 hours)

### Goal
Eliminate ALB dependency by migrating nextjs/strapi/etherpad to NLB with TLS listeners using SNI.

### Benefits
- ~50% cost reduction on load balancing
- Simplified architecture  
- Higher performance

## Phase 3: Resource Standardization (8 hours)

### Goal
Create configurable resource profiles instead of hardcoded CPU/memory values.

### Implementation
- Add resource profile variables to each app's `resource.hcl`
- Create standard profiles (development, production, high-memory)
- Update all modules to use profile-based resource allocation

## Post-Implementation Validation

### Verification Steps
1. **ECS Services**: All services healthy and running
2. **Load Balancers**: Proper target group health
3. **SSL Certificates**: ACM certificates properly attached
4. **Application Health**: All endpoints responding correctly
5. **Secrets**: SSM parameter access working correctly

### Monitoring
- CloudWatch logs for container startup issues
- ECS service event logs for deployment status
- Load balancer target group health checks