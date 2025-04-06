# AWS SSO Profile Configuration
The example of an `~/.aws/config` file showing the definition of the profiles required.

1. `application` - the AWS account for the application workload resources to be deployed and delegated to.
1. `management` - the AWS account where the DNS Zone exists abd delegate from.
1. `terraform` - the AWS account to store the state of resources in `management` and `application`.

The `sso_account_id` can be 3x different, the same or mostly the same accounts. :-) The `management` account is where the  Zone is defined for the public domain name.

```ini
## Paste this into a ~/.aws/config 
[sso-session DevOps]
sso_start_url = https://d12356789.awsapps.com/start/
sso_region = us-east-1
sso_registration_scopes = sso:account:access

[profile application]
description = Application Account to create Zone Delegation and application workload
sso_session = DevOps
sso_account_id = 0123456789012
sso_role_name = AdministratorAccess

[profile management]
description = DNS Management Account of the Zone
sso_session = DevOps
sso_account_id = 5678901234567
sso_role_name = HostedZoneAdmin

[profile terraform]
sso_session = DevOps
sso_account_id = 3456789012345
sso_role_name = AdministratorAccess%   
```

# AWS IAM Credentials Configuration
If you don't use AWS SSO you can setup `~/.aws/credentials` similar to below. For each of the required profiles you'll either generate AWS STS tokens for the account permissions, or use pure AWS IAM credentials (bad idea.)
```ini
[application]
aws_access_key_id=ASIA..........01
aws_secret_access_key=Isi................NxFb7
aws_session_token=IQoJb3JpZ........LWVsd....

[management]
aws_access_key_id=ASIA..........33
aws_secret_access_key=Isi................NxFb7
aws_session_token=IQoJb3JpZ........LWVsd....

[terraform]
aws_access_key_id=ASIA..........22
aws_secret_access_key=Isi................NxFb7
aws_session_token=IQoJb3JpZ........LWVsd....

```