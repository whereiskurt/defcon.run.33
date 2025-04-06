# Terraform+Terragrunt Infrastructure
By using a specific folder structure (`terragrunt`) and using resuable code modules (`terraform`) we can build out complext infrastructures accross AWS Regions with simple changes. For example, by copying the `us-east-1` folder into a `us-west-1` folder and modifying a few variables, you get tbe entire self-contained infrastructure deployed to another region.

This isn't a new approach (`terragrunt+terraform`) and this is just my first personal implementation of it. :) 

```
├── terraform
│   ├── defcon-run ## <-- terragrunt folder structure
│   │   └── us-east-1
│   │       └── cluster
│   │           └── apps
│   │               ├── email
│   │               ├── etherpad
│   │               ├── mqtt
│   │               ├── strapi
│   │               └── webapp
|   |
│   └── modules ## <--- terraform modules
│       ├── cluster
│       │   ├── _v1
│       │   │   └── bastion
│       │   ├── ec2gpu
│       │   └── fargate
│       │       └── _v1
│       │           └── apptype
│       ├── email
│       │   └── dkim
│       └── site
└── terragrunt
    └── modules
```

## Pictures
Here are some diagrams of what AWS resources and infrastructure we build out using `terraform` modules in a `terragrunt` directory structure from above:

The terraform modules build out the resources shown on this diagram:
![Complex ServiceLayout](https://github.com/user-attachments/assets/bec8fd29-db4c-41fb-9c86-dcf4ac66cd7b)

This is less detailed version of the one above:
![Simpler Layout](https://github.com/user-attachments/assets/754219b3-6f4c-4d8c-83d2-8086ae2651c5)
