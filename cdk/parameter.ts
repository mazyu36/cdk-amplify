import { Environment } from 'aws-cdk-lib';

export interface AppParameter {
  env?: Environment,
  stackName: string,
  appName: string;
  ownerName: string;
  repositoryName: string;
  secretNameForGitHubToken: string;
}

export const devParameter: AppParameter = {
  env: {
    // account: '',
    region: 'ap-northeast-1'
  },
  stackName: 'mazyu36-amplify',
  appName: 'nextjs-blog',
  ownerName: 'mazyu36',
  repositoryName: 'cdk-amplify',
  secretNameForGitHubToken: 'github-token'
}