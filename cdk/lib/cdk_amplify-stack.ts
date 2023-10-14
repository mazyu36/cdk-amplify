import { App, GitHubSourceCodeProvider, Platform, RedirectStatus } from '@aws-cdk/aws-amplify-alpha';
import { aws_codebuild as codebuild } from 'aws-cdk-lib';
import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';


export interface CdkAmplifyStackProps extends cdk.StackProps {
  appName: string;
  ownerName: string;
  repositoryName: string;
  secretNameForGitHubToken: string;
}

export class CdkAmplifyStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props: CdkAmplifyStackProps) {
    super(scope, id, props);

    const amplifyApp = new App(this, "AmplifyAppBlog", {
      appName: props.appName,
      sourceCodeProvider: new GitHubSourceCodeProvider({
        owner: props.ownerName,
        repository: props.repositoryName,
        oauthToken: cdk.SecretValue.secretsManager(props.secretNameForGitHubToken)
      }),
      platform: Platform.WEB_COMPUTE,
      environmentVariables:
      {
        "AMPLIFY_MONOREPO_APP_ROOT": "blog",
        "AMPLIFY_DIFF_DEPLOY": "false"
      },
      buildSpec: codebuild.BuildSpec.fromObjectToYaml({
        version: 1,
        applications: [
          {
            appRoot: 'blog',
            frontend: {
              phases: {
                preBuild: {
                  commands: ['yarn install --frozen-lockfile'],
                },
                build: {
                  commands: ['yarn run build'],
                },
              },
              artifacts: {
                baseDirectory: '.next',
                files: ['**/*'],
              },
              cache: {
                paths: ['node_modules/**/*'],
              },
            }
          }
        ]
      })
    })

    amplifyApp.addBranch("main", { stage: "PRODUCTION" })
  }
}
