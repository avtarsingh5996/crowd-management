#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import { CrowdManagementStack } from '../lib/crowd-management-stack';

const app = new cdk.App();
new CrowdManagementStack(app, 'CrowdManagementStack', {
  env: {
    account: process.env.CDK_DEFAULT_ACCOUNT,
    region: process.env.CDK_DEFAULT_REGION
  },
}); 