# DC33 Applications

[**NOTE** - This was written by Claude 3.7]

This directory contains all the applications that are part of the DC33 project. Each application is contained in its own folder and can be deployed independently to the infrastructure defined in the `/infra` directory.

## Application Structure

Each application in this directory is designed as a standalone service that can be deployed independently to our infrastructure. The deployment mechanisms are standardized across applications using shell scripts that interface with our infrastructure setup.

### Common Deployment Scripts

- `deploy.all.sh`: Script to deploy all applications at once
- `force-new-deployment.sh`: Script to force a new deployment of applications (bypassing caching)

## Available Applications

### MQTT
Located in the `/mqtt` directory, this application provides message broker functionality using Mosquitto MQTT.

- **Components**:
  - `mosquitto`: The core MQTT broker service
  - `nginx`: Reverse proxy for the MQTT service with SSL termination

- **Deployment**:
  - `force-new-deployment.sh`: Forces a new deployment of the MQTT service

### Etherpad
Located in the `/etherpad` directory, this application provides collaborative document editing functionality.

- **Components**:
  - `defcon-run`: The main Etherpad application
  - `nginx`: Reverse proxy for the Etherpad service
  - `local`: Contains local development resources (e.g., postgres database)

- **Deployment**:
  - `deploy.etherpad.sh`: Deploys the Etherpad service
  - `deploy.nginx.etherpad.sh`: Deploys the Nginx configuration for Etherpad
  - `force-new-deployment.sh`: Forces a new deployment of the Etherpad service

### Strapi
Located in the `/strapi` directory, this application provides headless CMS functionality.

- **Components**:
  - `defcon-run`: The main Strapi application
  - `nginx`: Reverse proxy for the Strapi service
  - `local`: Contains local development resources

- **Deployment**:
  - `deploy.strapi.sh`: Deploys the Strapi service
  - `deploy.nginx.strapi.sh`: Deploys the Nginx configuration for Strapi
  - `force-new-deployment.sh`: Forces a new deployment of the Strapi service
  - `strapi.run.sh`: Script to run Strapi locally
  - `env.generate.py`: Script to generate environment variables for Strapi

### NX
Located in the `/nx` directory, this application contains a monorepo structure for web applications.

- **Components**:
  - `apps/webapp`: The main web application
  - `libs`: Shared libraries for the web applications
    - `auth`: Authentication library

- **Configuration**:
  - `eslint.config.mjs`: ESLint configuration
  - `jest.config.ts` and `jest.preset.js`: Jest testing configuration
  - `nx.json`: NX workspace configuration
  - `tsconfig.base.json`: Base TypeScript configuration

### Demos
Located in the `/demos` directory, this folder contains demo applications for showcasing features.

- **Demo Applications**:
  - `herodemo`: A Next.js-based demonstration application
  - `next-auth-example`: Example application demonstrating Next.js authentication

## Deployment to Infrastructure

All applications in this directory are designed to be deployed to the infrastructure defined in the `/infra` directory. The infrastructure is provisioned using Terraform and Terragrunt, with specific configurations for each application.

### Deployment Process

1. Infrastructure is provisioned using the scripts in the `/infra/terraform` and `/infra/terragrunt` directories
2. Application-specific deployment scripts (`deploy.*.sh`) are used to deploy the applications to the provisioned infrastructure
3. For forcing a new deployment, use the `force-new-deployment.sh` scripts in the respective application directories

### Infrastructure Integration

Each application interfaces with the infrastructure components defined in the `/infra` directory, which may include:

- Network configuration
- Security groups
- Load balancers
- Database instances
- Storage resources

For more details on the infrastructure components, see the documentation in the `/infra` directory.