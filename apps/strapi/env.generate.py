#!/usr/bin/env python3

## Here is a PERFECT example of how a 'simple little script' buries the complexity 
# and creates a 'magic' file that is hard to understand and maintain. 
#
# The original intentions were pull out all the AWS SSM parameters and create a .env file
# that I could use for local development. This way I could access the s3 bucket for uploads,
# the RDS database, and the SES email service.
#
# ANYWAY! I will leave it here for a bit, but eventually completely refactor into parts that
# make sense and are easy to understand, with less magic values everywhere... I actually fucking hate this script now.

import os
import boto3

def ssm_to_env(ssm_path, env_file):
  client = boto3.client('ssm', region_name='us-east-1')
  parameters = client.get_parameters_by_path(Path=ssm_path, Recursive=True, WithDecryption=True)

  with open(env_file, 'w') as f:
    for param in parameters['Parameters']:
      name = param['Name'].replace("/", "_").lstrip("_")
      value = param['Value']
      f.write(f"{name}={value}\n")

def env_scrub(scrub_list, env_file):
  with open(env_file, 'r') as f:
    lines = f.readlines()

  with open(env_file, 'w') as f:
    for line in lines:
      for scrub_value, replacement in scrub_list:
        line = line.replace(scrub_value, replacement)
      f.write(line)

def env_name_trans(transformations, env_file):
  with open(env_file, 'r') as f:
    lines = f.readlines()

  with open(env_file, 'w') as f:
    for line in lines:
      name, value = line.strip().split('=', 1)
      for transform in transformations:
        name = transform(name)
      f.write(f"{name}={value}\n")

def cat_sort_uniq(env_files, output_file, sort=True, uniq=True):
  all_lines = []
  for fname in env_files:
    with open(fname) as infile:
      all_lines.extend(infile.readlines())

  if uniq:
    all_lines = set(all_lines)
    
  if sort:
    all_lines = sorted(all_lines)
    
  with open(output_file, 'w') as outfile:
    outfile.writelines(all_lines)

def delete_files(file_list):
  for file in file_list:
    try:
      os.remove(file)
    except FileNotFoundError:
      print(f"File {file} not found")
    except Exception as e:
      print(f"Error deleting {file}: {e}")

ssm_to_env("/use1.webapp.defcon.run/", "site-tld/.env.generate")
env_scrub([("use1.webapp.defcon.run_", "")], "site-tld/.env.generate" )
env_name_trans([lambda s: s.upper()], "site-tld/.env.generate")

ssm_to_env("/use1.email.defcon.run/", "site-tld/.env.smtp.generate")
env_scrub([("use1.email.defcon.run_", "")], "site-tld/.env.smtp.generate" )
env_name_trans([lambda s: s.upper()], "site-tld/.env.smtp.generate")

cat_sort_uniq(["site-tld/.env.generate", "site-tld/.env.smtp.generate"], "site-tld/.env.local" )
cat_sort_uniq(["site-tld/env.template", "site-tld/.env.local"], "site-tld/.env.local", sort=False, uniq=False)

delete_files(["site-tld/.env.generate", "site-tld/.env.smtp.generate"])