import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as codepipeline from 'aws-cdk-lib/aws-codepipeline';
import * as codepipeline_actions from 'aws-cdk-lib/aws-codepipeline-actions';
import * as codebuild from 'aws-cdk-lib/aws-codebuild';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as iam from 'aws-cdk-lib/aws-iam';
import { AppStack } from './app-stack';

export interface PipelineStackProps extends cdk.StackProps {
  appName: string;
}

export class PipelineStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props: PipelineStackProps) {
    super(scope, id, props);

    // Create S3 bucket for pipeline artifacts
    const artifactsBucket = new s3.Bucket(this, 'ArtifactsBucket', {
      bucketName: `${props.appName.toLowerCase()}-pipeline-artifacts-${this.account}`,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      autoDeleteObjects: true,
    });

    // Create CodeBuild projects
    const buildProject = this.createBuildProject(props, artifactsBucket);
    const testProject = this.createTestProject(props, artifactsBucket);

    // Create pipeline
    const pipeline = this.createPipeline(props, artifactsBucket, buildProject, testProject);

    // Output pipeline information
    new cdk.CfnOutput(this, 'PipelineName', {
      value: pipeline.pipelineName,
      description: 'CodePipeline name',
    });
  }

  private createBuildProject(
    props: PipelineStackProps,
    artifactsBucket: s3.Bucket
  ): codebuild.Project {
    const buildRole = new iam.Role(this, 'BuildRole', {
      assumedBy: new iam.ServicePrincipal('codebuild.amazonaws.com'),
      managedPolicies: [
        iam.ManagedPolicy.fromAwsManagedPolicyName('PowerUserAccess'),
      ],
    });

    return new codebuild.Project(this, 'BuildProject', {
      projectName: `${props.appName}-build`,
      source: codebuild.Source.gitHub({
        owner: 'TeknoloGenie',
        repo: 'aws-skeleton-application',
      }),
      environment: {
        buildImage: codebuild.LinuxBuildImage.STANDARD_7_0,
        computeType: codebuild.ComputeType.SMALL,
        privileged: true,
      },
      role: buildRole,
      buildSpec: codebuild.BuildSpec.fromObject({
        version: '0.2',
        phases: {
          install: {
            'runtime-versions': {
              nodejs: '18',
            },
            commands: [
              'npm install -g aws-cdk',
              'npm ci',
            ],
          },
          pre_build: {
            commands: [
              'npm run lint',
              'npm run test',
            ],
          },
          build: {
            commands: [
              'npm run build',
              `cdk synth --context appName=${props.appName} --context stage=dev`,
            ],
          },
        },
        artifacts: {
          files: [
            '**/*',
          ],
        },
      }),
      artifacts: codebuild.Artifacts.s3({
        bucket: artifactsBucket,
        includeBuildId: false,
        packageZip: true,
      }),
    });
  }

  private createTestProject(
    props: PipelineStackProps,
    artifactsBucket: s3.Bucket
  ): codebuild.Project {
    const testRole = new iam.Role(this, 'TestRole', {
      assumedBy: new iam.ServicePrincipal('codebuild.amazonaws.com'),
      managedPolicies: [
        iam.ManagedPolicy.fromAwsManagedPolicyName('ReadOnlyAccess'),
      ],
    });

    return new codebuild.Project(this, 'TestProject', {
      projectName: `${props.appName}-test`,
      source: codebuild.Source.gitHub({
        owner: 'TeknoloGenie',
        repo: 'aws-skeleton-application',
      }),
      environment: {
        buildImage: codebuild.LinuxBuildImage.STANDARD_7_0,
        computeType: codebuild.ComputeType.SMALL,
      },
      role: testRole,
      buildSpec: codebuild.BuildSpec.fromObject({
        version: '0.2',
        phases: {
          install: {
            'runtime-versions': {
              nodejs: '18',
            },
            commands: [
              'npm ci',
            ],
          },
          build: {
            commands: [
              'npm run test:e2e',
            ],
          },
        },
      }),
    });
  }

  private createPipeline(
    props: PipelineStackProps,
    artifactsBucket: s3.Bucket,
    buildProject: codebuild.Project,
    testProject: codebuild.Project
  ): codepipeline.Pipeline {
    // Define artifacts
    const sourceOutput = new codepipeline.Artifact('SourceOutput');
    const buildOutput = new codepipeline.Artifact('BuildOutput');

    // Create pipeline
    const pipeline = new codepipeline.Pipeline(this, 'Pipeline', {
      pipelineName: `${props.appName}-pipeline`,
      artifactBucket: artifactsBucket,
      stages: [
        {
          stageName: 'Source',
          actions: [
            new codepipeline_actions.GitHubSourceAction({
              actionName: 'GitHub_Source',
              owner: 'TeknoloGenie',
              repo: 'aws-skeleton-application',
              branch: 'develop',
              oauthToken: cdk.SecretValue.secretsManager('github-token'),
              output: sourceOutput,
            }),
          ],
        },
        {
          stageName: 'Build',
          actions: [
            new codepipeline_actions.CodeBuildAction({
              actionName: 'Build',
              project: buildProject,
              input: sourceOutput,
              outputs: [buildOutput],
            }),
          ],
        },
        {
          stageName: 'Deploy_Dev',
          actions: [
            new codepipeline_actions.CloudFormationCreateUpdateStackAction({
              actionName: 'Deploy_Dev',
              templatePath: buildOutput.atPath(`cdk.out/${props.appName}-dev.template.json`),
              stackName: `${props.appName}-dev`,
              adminPermissions: true,
              extraInputs: [buildOutput],
            }),
          ],
        },
        {
          stageName: 'Deploy_Test',
          actions: [
            new codepipeline_actions.CloudFormationCreateUpdateStackAction({
              actionName: 'Deploy_Test',
              templatePath: buildOutput.atPath(`cdk.out/${props.appName}-test.template.json`),
              stackName: `${props.appName}-test`,
              adminPermissions: true,
              extraInputs: [buildOutput],
            }),
          ],
        },
        {
          stageName: 'Test_E2E',
          actions: [
            new codepipeline_actions.CodeBuildAction({
              actionName: 'E2E_Tests',
              project: testProject,
              input: sourceOutput,
              environmentVariables: {
                API_ENDPOINT: {
                  value: `https://\${${props.appName}-Test.GraphQLApiUrl}`,
                },
              },
            }),
          ],
        },
        {
          stageName: 'Approve_Prod',
          actions: [
            new codepipeline_actions.ManualApprovalAction({
              actionName: 'Manual_Approval',
              additionalInformation: 'Please review the test results and approve deployment to production.',
            }),
          ],
        },
        {
          stageName: 'Deploy_Prod',
          actions: [
            new codepipeline_actions.CloudFormationCreateUpdateStackAction({
              actionName: 'Deploy_Prod',
              templatePath: buildOutput.atPath(`cdk.out/${props.appName}-prod.template.json`),
              stackName: `${props.appName}-prod`,
              adminPermissions: true,
              extraInputs: [buildOutput],
            }),
          ],
        },
      ],
    });

    // Add trigger for main branch to production
    const prodPipeline = new codepipeline.Pipeline(this, 'ProdPipeline', {
      pipelineName: `${props.appName}-prod-pipeline`,
      artifactBucket: artifactsBucket,
      stages: [
        {
          stageName: 'Source',
          actions: [
            new codepipeline_actions.GitHubSourceAction({
              actionName: 'GitHub_Source_Main',
              owner: 'TeknoloGenie',
              repo: 'aws-skeleton-application',
              branch: 'main',
              oauthToken: cdk.SecretValue.secretsManager('github-token'),
              output: sourceOutput,
            }),
          ],
        },
        {
          stageName: 'Build',
          actions: [
            new codepipeline_actions.CodeBuildAction({
              actionName: 'Build',
              project: buildProject,
              input: sourceOutput,
              outputs: [buildOutput],
            }),
          ],
        },
        {
          stageName: 'Approve_Prod',
          actions: [
            new codepipeline_actions.ManualApprovalAction({
              actionName: 'Manual_Approval',
              additionalInformation: 'Please approve deployment to production.',
            }),
          ],
        },
        {
          stageName: 'Deploy_Prod',
          actions: [
            new codepipeline_actions.CloudFormationCreateUpdateStackAction({
              actionName: 'Deploy_Prod',
              templatePath: buildOutput.atPath(`cdk.out/${props.appName}-prod.template.json`),
              stackName: `${props.appName}-prod`,
              adminPermissions: true,
              extraInputs: [buildOutput],
            }),
          ],
        },
      ],
    });

    return pipeline;
  }
}
