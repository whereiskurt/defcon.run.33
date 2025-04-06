#!/usr/bin/env python
import boto3

# Create an EC2 client
ec2 = boto3.client('ec2')

# Get a list of all regions
regions = [region['RegionName'] for region in ec2.describe_regions()['Regions']]

# Delete the default VPC and its associated resources in each region
for region in regions:
    print(f"Processing region {region}...")
   
    # Create an EC2 client for the current region
    ec2_region = boto3.client('ec2', region_name=region)
   
    # Get the ID of the default VPC in the region
    vpcs = ec2_region.describe_vpcs(Filters=[{'Name': 'isDefault', 'Values': ['true']}])['Vpcs']
    if not vpcs:
        print(f"No default VPC found in region {region}")
        continue
    vpc_id = vpcs[0]['VpcId']
   
    # Delete all subnets in the VPC
    subnets_response = ec2_region.describe_subnets(Filters=[{'Name': 'vpc-id', 'Values': [vpc_id]}])
    for subnet in subnets_response['Subnets']:
        subnet_id = subnet['SubnetId']
        ec2_region.delete_subnet(SubnetId=subnet_id)
        print(f"Deleted subnet {subnet_id} in region {region}")
   
    # Delete all internet gateways attached to the VPC
    igw_response = ec2_region.describe_internet_gateways(Filters=[{'Name': 'attachment.vpc-id', 'Values': [vpc_id]}])
    for igw in igw_response['InternetGateways']:
        igw_id = igw['InternetGatewayId']
        ec2_region.detach_internet_gateway(InternetGatewayId=igw_id, VpcId=vpc_id)
        ec2_region.delete_internet_gateway(InternetGatewayId=igw_id)
        print(f"Deleted internet gateway {igw_id} in region {region}")
   
    rt_response = ec2_region.describe_route_tables(Filters=[{'Name': 'vpc-id', 'Values': [vpc_id]}, {'Name': 'association.main', 'Values': ['false']}])
    for rt in rt_response['RouteTables']:
        rt_id = rt['RouteTableId']
        routes = rt['Routes']
        has_non_local_routes = any(route.get('DestinationCidrBlock') != 'local' for route in routes)
       
        if has_non_local_routes:
            for route in routes:
                if route.get('DestinationCidrBlock') == 'local':
                    continue
               
                try:
                    ec2_region.delete_route(RouteTableId=rt_id, DestinationCidrBlock=route['DestinationCidrBlock'])
                    print(f"Deleted route {route['DestinationCidrBlock']} from route table {rt_id} in region {region}")
                except Exception as e:
                    print(f"Failed to delete route {route['DestinationCidrBlock']} from route table {rt_id} in region {region}: {str(e)}")
       
        # Disassociate the route table from all subnets
        associations = rt['Associations']
        for assoc in associations:
            if not assoc.get('Main', False):
                try:
                    ec2_region.disassociate_route_table(AssociationId=assoc['RouteTableAssociationId'])
                    print(f"Disassociated route table {rt_id} from subnet {assoc['SubnetId']} in region {region}")
                except Exception as e:
                    print(f"Failed to disassociate route table {rt_id} from subnet {assoc['SubnetId']} in region {region}: {str(e)}")
       
        # Delete the route table
        try:
            ec2_region.delete_route_table(RouteTableId=rt_id)
            print(f"Deleted route table {rt_id} in region {region}")
        except Exception as e:
            print(f"Failed to delete route table {rt_id} in region {region}: {str(e)}")
           
    # Delete all network ACLs associated with the VPC except the default network ACL
    acl_response = ec2_region.describe_network_acls(Filters=[{'Name': 'vpc-id', 'Values': [vpc_id]}, {'Name': 'default', 'Values': ['false']}])
    for acl in acl_response['NetworkAcls']:
        acl_id = acl['NetworkAclId']
        try:
            ec2_region.delete_network_acl(NetworkAclId=acl_id)
            print(f"Deleted network ACL {acl_id} in region {region}")
        except Exception as e:
            print(f"Failed to delete network ACL {acl_id} in region {region}: {str(e)}")

    # Delete all non-default security groups associated with the VPC
    sg_response = ec2_region.describe_security_groups(Filters=[{'Name': 'vpc-id', 'Values': [vpc_id]}, {'Name': 'group-name', 'Values': ['default'], 'Name': 'group-name', 'Values': ['default']}], GroupIds=[group['GroupId'] for group in ec2_region.describe_security_groups()['SecurityGroups']])
    for sg in sg_response['SecurityGroups']:
        sg_id = sg['GroupId']
        group_name = sg['GroupName']
       
        if group_name == 'default':
            continue
       
        try:
            ec2_region.delete_security_group(GroupId=sg_id)
            print(f"Deleted security group {group_name} ({sg_id}) in region {region}")
        except Exception as e:
            print(f"Failed to delete security group {group_name} ({sg_id}) in region {region}: {str(e)}")


    # Delete the default VPC
    ec2_region.delete_vpc(VpcId=vpc_id)
    print(f"Deleted VPC {vpc_id} in region {region}")