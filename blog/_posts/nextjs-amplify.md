---
title: 'Next.jsをAmplifyでホスティングする（w/ CDK）'
excerpt: 'Next.jsで実装されているMarkdownのブログをAWS Amplifyでホスティングする。またAWS AmplifyはAWS CDKで構築する。'
coverImage: '/assets/blog/nextjs-amplify/architecture.drawio.svg'
date: '2023-10-14'
author:
  name: mazyu36
  picture: '/assets/blog/authors/profile.jpeg'
ogImage:
  url: '/assets/blog/nextjs-amplify/cover.png'
---


## 概要
Markdownで記事が作成できるNext.jsのブログアプリを、Amplifyでホスティングする。AmplifyはCDKで構築する。

ブログアプリとしては[vercelのスターターキット](https://vercel.com/templates/next.js/blog-starter-kit)を使用。

AmplifyのCDKの実装は[AWS公式の動画](https://www.youtube.com/watch?v=YL2feD9ws9k)を参考にした。

## リポジトリ構成
以下のようにアプリとインフラ（CDK）をセットにしたモノレポにする。

```bash
.
├── README.md
├── blog # Next.jsのサンプルアプリ
└── cdk # AmplifyのCDKプロジェクト
```

以下実装例。

https://github.com/mazyu36/cdk-amplify

以降、上記の実装例を作成するためにやったことを記載する。

## 事前準備：Next.jsアプリ（ブログ）の準備
yarnでブログスターターキットを取得し、アプリを作成する。

```bash
yarn create next-app --example blog-starter .
```

適当に記事などを作成して、ローカルで動作確認する。
* 記事を作成する場合は`blog/_posts/`配下に `.md`を作成。
* 画像は`blog/public/assets`配下に格納する。記事から画像を参照する場合は、`/assets`始まりで記載。


```bash
yarn dev
```

起動したらローカルホストで3000にアクセスする。ブログが表示されればOK。

http://localhost:3000/




## CDK（Amplify）の実装

### 事前準備
今回はAmplifyの[alphaモジュール](https://docs.aws.amazon.com/cdk/api/v2/docs/aws-amplify-alpha-readme.html)を使用する。

以下のようにalphaモジュールを追加する。

```bash
# cdk init
cdk init app --language typescript

# Amplifyのalpha モジュールを設定
npm i @aws-cdk/aws-amplify-alpha
```

### プロジェクト構成

```bash
.
├── README.md
├── bin
│   └── cdk_amplify.ts
├── cdk.json
├── cdk.out
├── jest.config.js
├── lib
│   └── cdk_amplify-stack.ts # Stackを実装
├── node_modules
├── package-lock.json
├── package.json
├── parameter.ts # 環境依存パラメータの定義
├── test
│   └── cdk_amplify.test.ts
└── tsconfig.json
```

### Stackの実装内容
Stack内にalphaモジュールの`App`を使用して実装していく。


```typescript
const amplifyApp = new App(this, "AmplifyAppBlog", {
      appName: props.appName,

      // ①GitHubをソースとして使用
      sourceCodeProvider: new GitHubSourceCodeProvider({
        owner: props.ownerName,
        repository: props.repositoryName,
        oauthToken: cdk.SecretValue.secretsManager(props.secretNameForGitHubToken)
      }),
      platform: Platform.WEB_COMPUTE,

      // ②環境変数の設定
      environmentVariables:
      {
        "AMPLIFY_MONOREPO_APP_ROOT": "blog",
        "AMPLIFY_DIFF_DEPLOY": "true"
      },

      // ③buildspecの設定
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
```

#### ①GitHubをソースとして使用

```typescript
      sourceCodeProvider: new GitHubSourceCodeProvider({
        owner: props.ownerName,
        repository: props.repositoryName,
        oauthToken: cdk.SecretValue.secretsManager(props.secretNameForGitHubToken) // TokenはSecrets Managerで管理
      }),
```
今回はGitHubをソースコードプロバイダーとして使用する。

またGitHubのトークンはSecrets Managerに事前に登録しておき、読み込む。


#### ②環境変数の設定

```typescript
      // ②環境変数の設定
      environmentVariables:
      {
        "AMPLIFY_MONOREPO_APP_ROOT": "blog", // アプリのルートを指定
        "AMPLIFY_DIFF_DEPLOY": "true" // 差分ビルドを有効化
      },
```
今回重要なのは`AMPLIFY_MONOREPO_APP_ROOT`である。Next.jsのアプリが入っているのはソースコードプロジェクトのルートではなく、`blog/`配下なので環境変数でパスとして指定する

また`AMPLIFY_DIFF_DEPLOY`を`true`にすることで、フロントエンドの差分ビルドが有効になる。差分がないときはビルドがスキップされる。



#### ③buildspecの設定
```typescript
      buildSpec: codebuild.BuildSpec.fromObjectToYaml({
        version: 1,
        // applicationsでリスト化してAPのルートを指定（モノレポ用の設定）
        applications: [
          {
            // APのルートを指定（モノレポ用の設定）
            appRoot: 'blog',
            frontend: {
              phases: {
                preBuild: {
                  // yarnに変更
                  commands: ['yarn install --frozen-lockfile'],
                },
                build: {
                  // yarnに変更
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
```

モノレポ用の設定として、`applications`で階層化し、`appName`でソースコードプロジェクト上アプリを配置しているパスを指定します。この時`appName`のパスは②の`AMPLIFY_MONOREPO_APP_ROOT`と一致させる。

また、今回Next.jsのアプリ作成時に`yarn`を使用しているため、コマンドを全般的に置き換えている。


### 環境依存パラメータの定義
`parameter.ts`に環境依存パラメータを定義するようにしている。今回は[BLEAのサンプル](https://github.com/aws-samples/baseline-environment-on-aws/tree/main/usecases/blea-guest-ecs-app-sample)の実装方法を参考にしている。

```typescript
import { Environment } from 'aws-cdk-lib';

// Interfaceを定義
export interface AppParameter {
  env?: Environment,
  stackName: string,
  appName: string;
  ownerName: string;
  repositoryName: string;
  secretNameForGitHubToken: string;
}

// 各環境のパラメータを定義。例はdev
export const devParameter: AppParameter = {
  // 使用する環境のアカウントID、リージョン
  env: {
    // account: '',
    region: 'ap-northeast-1'
  },
  stackName: 'mazyu36-amplify',  // Stack名を指定

  // ここから下はAmplify Appで使用する値
  appName: 'nextjs-blog',  // Amplify Appの名称
  ownerName: 'mazyu36', // 参照するGitHubリポジトリのユーザー名
  repositoryName: 'cdk-amplify', // Next.jsアプリを入れるGitHubリポジトリ名
  secretNameForGitHubToken: 'github-token'  // GitHubトークンを格納するSecrets Managerのシークレット名
}
```

上記は`bin/cdk_amplify.ts`で使用する。

`devParameter`をインポートして、propsとして各パラメータを渡すだけ（これもBLEAの実装方法を参考にしている）


```typescript
#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import { CdkAmplifyStack } from '../lib/cdk_amplify-stack';
import { devParameter } from '../parameter';  // パラメータをimport

const app = new cdk.App();
new CdkAmplifyStack(app, 'CdkAmplifyStack', {
  // 環境はパラメータで指定があればそちらを使用、なければデフォルト
  env: {
    account: devParameter.env?.account || process.env.CDK_DEFAULT_ACCOUNT,
    region: devParameter.env?.region || process.env.CDK_DEFAULT_REGION,
  },
  stackName: devParameter.stackName, // Stack名を指定

  // ここから下はAmplify Appで使用する値
  appName: devParameter.appName,
  ownerName: devParameter.ownerName,
  repositoryName: devParameter.repositoryName,
  secretNameForGitHubToken: devParameter.secretNameForGitHubToken,


});
```


## デプロイの実施

### GitHubのトークンを取得
まずはGitHubをソースコードプロバイダーとして使うためのトークンの発行を行う。

手順としては以下である。

https://docs.github.com/ja/authentication/keeping-your-account-and-data-secure/managing-your-personal-access-tokens#personal-access-token-classic-の作成

スコープとしては、`admin:repo_hook`にする。



### Secrets Managerにトークンを登録
発行したGitHubのトークンをSecrets Managerに登録する。

「そのほかのシークレットタイプ」にして、トークンを登録する。


### CDKデプロイの実施
`cdk deploy`でAmplifyのアプリを作成する。


### Next.jsアプリのデプロイ
初回のデプロイはマネコン上からビルドを実行する必要あり。Amplify Appを開く。

### 動作確認
デプロイ完了後、払い出されたドメインにアクセスする。
アクセスしてNext.jsのアプリが表示されれば問題なし。

