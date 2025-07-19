# Claude Code Project Knowledge

## Project Overview
This is a multi-region AWS infrastructure deployment using Terraform modules and Terragrunt for a DefCon 33 conference platform. The infrastructure supports multiple application types (mqtt, webapp/nextjs, strapi, etherpad) deployed on AWS ECS Fargate.

## Architecture Summary

### Directory Structure
```
infra/
├── terraform/
│   ├── modules/cluster/fargate/_v1/apptype/
│   │   ├── mqtt/          # MQTT broker with mosquitto, nginx, grpc
│   │   ├── nextjs/        # Next.js web application  
│   │   ├── strapi/        # Strapi CMS
│   │   └── etherpad/      # Etherpad collaborative editor
│   └── site-tld/us-east-1/cluster/apps/
└── terragrunt/
```

### Load Balancer Architecture
- **NLB**: Used for MQTT (TCP/TLS traffic on ports 1883, 8883, 8443)
- **ALB**: Used for HTTP/HTTPS apps (nextjs, strapi, etherpad)
- **Consolidation Opportunity**: Can migrate all to NLB since ALB only uses basic host-header routing

### Application Patterns
Each app follows this structure:
- **Module**: `terraform/modules/cluster/fargate/_v1/apptype/{app_type}/`
- **Deployment**: `terraform/site-tld/us-east-1/cluster/apps/{app_name}/`
- **Configuration**: Each app has `resource.hcl` with app-specific config
- **Containers**: Most use nginx (reverse proxy) + application container

## Current Issues Identified

### 1. Mixed Load Balancer Architecture
- ALB used only for basic host-header routing
- Can be simplified to NLB-only for cost savings (~50%)
- No ALB-specific features being used

### 2. Hardcoded Values (NextJS Module Only)
- Account ID: `427284555693` in SSM parameter ARNs
- Region: `us-east-1` hardcoded in multiple places
- Domain: `defcon.run` in URLs and parameter paths
- Environment secrets: `hacktheplanet,23tenalpehtkcah` invite codes
- **Note**: Other modules (mqtt, strapi, etherpad) are properly parameterized

### 3. Inconsistent Resource Configuration
- MQTT: 128 CPU, 256 memory per container
- Strapi: 256 CPU, 512 memory per container  
- NextJS: Mixed resource allocation
- All apps use `v0.0.1` container versions

## Recommended Improvements

### High Priority
1. **Fix NextJS hardcoded values** - Make consistent with other modules (~4 hours)
2. **Consolidate to NLB-only** - Remove ALB dependency (~6 hours)

### Medium Priority  
3. **Standardize resource profiles** - Create configurable resource tiers (~8 hours)

## Commands for Development

### Common Operations
```bash
# Apply single app
cd terraform/site-tld/us-east-1/cluster/apps/mqtt
terragrunt apply

# Apply entire cluster
cd terraform/site-tld/us-east-1/cluster  
terragrunt run-all apply

# Regional replication (if needed)
./region-copier.sh us-east-1 use1 us-west-2 usw2
```

### Testing
- Run lint/typecheck commands before committing
- Check for certificate provisioning timeouts (5min wait built-in)
- Verify ECS service health after deployments

## Security Notes
- Secrets managed via AWS SSM Parameter Store
- Hierarchical parameter structure: `/{region_label}.{service}.{account_zonename}/`
- TLS termination at load balancer level
- VPC with public/private subnet separation

## Multi-Region Support
- Currently deployed to `us-east-1` only
- `region-copier.sh` script available for regional expansion
- Region labels: use1, cac1, usw2 (for us-east-1, ca-central-1, us-west-2)

## Next Actions Planned
1. Update nextjs module to remove hardcoded values
2. Implement NLB consolidation 
3. Standardize container resource configurations