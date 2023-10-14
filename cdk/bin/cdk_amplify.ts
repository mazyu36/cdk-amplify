#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import { CdkAmplifyStack } from '../lib/cdk_amplify-stack';
import { devParameter } from '../parameter';

const app = new cdk.App();
new CdkAmplifyStack(app, 'CdkAmplifyStack', {
  env: {
    account: devParameter.env?.account || process.env.CDK_DEFAULT_ACCOUNT,
    region: devParameter.env?.region || process.env.CDK_DEFAULT_REGION,
  },
  stackName: devParameter.stackName,
  appName: devParameter.appName,
  ownerName: devParameter.ownerName,
  repositoryName: devParameter.repositoryName,
  secretNameForGitHubToken: devParameter.secretNameForGitHubToken,


});