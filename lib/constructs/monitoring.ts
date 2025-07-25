import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as cloudwatch from 'aws-cdk-lib/aws-cloudwatch';
import * as sns from 'aws-cdk-lib/aws-sns';
import * as cloudwatch_actions from 'aws-cdk-lib/aws-cloudwatch-actions';
import * as appsync from '@aws-cdk/aws-appsync-alpha';

export interface MonitoringConstructProps {
  appName: string;
  stage: string;
  api: appsync.GraphqlApi;
}

export class MonitoringConstruct extends Construct {
  public readonly dashboard: cloudwatch.Dashboard;
  public readonly alarmTopic: sns.Topic;

  constructor(scope: Construct, id: string, props: MonitoringConstructProps) {
    super(scope, id);

    // Create SNS topic for alarms
    this.alarmTopic = new sns.Topic(this, 'AlarmTopic', {
      topicName: `${props.appName}-${props.stage}-alarms`,
      displayName: `${props.appName} ${props.stage} Alarms`,
    });

    // Create CloudWatch dashboard
    this.dashboard = this.createDashboard(props);

    // Create alarms
    this.createAlarms(props);
  }

  private createDashboard(props: MonitoringConstructProps): cloudwatch.Dashboard {
    const dashboard = new cloudwatch.Dashboard(this, 'Dashboard', {
      dashboardName: `${props.appName}-${props.stage}-dashboard`,
    });

    // API Request Count widget
    const requestCountWidget = new cloudwatch.GraphWidget({
      title: 'API Request Count',
      left: [
        new cloudwatch.Metric({
          namespace: 'AWS/AppSync',
          metricName: '4XXError',
          dimensionsMap: {
            GraphQLAPIId: props.api.apiId,
          },
          statistic: 'Sum',
          period: cdk.Duration.minutes(5),
        }),
        new cloudwatch.Metric({
          namespace: 'AWS/AppSync',
          metricName: '5XXError',
          dimensionsMap: {
            GraphQLAPIId: props.api.apiId,
          },
          statistic: 'Sum',
          period: cdk.Duration.minutes(5),
        }),
      ],
      width: 12,
      height: 6,
    });

    // API Latency widget
    const latencyWidget = new cloudwatch.GraphWidget({
      title: 'API Latency',
      left: [
        new cloudwatch.Metric({
          namespace: 'AWS/AppSync',
          metricName: 'Latency',
          dimensionsMap: {
            GraphQLAPIId: props.api.apiId,
          },
          statistic: 'p50',
          period: cdk.Duration.minutes(5),
          label: 'p50',
        }),
        new cloudwatch.Metric({
          namespace: 'AWS/AppSync',
          metricName: 'Latency',
          dimensionsMap: {
            GraphQLAPIId: props.api.apiId,
          },
          statistic: 'p90',
          period: cdk.Duration.minutes(5),
          label: 'p90',
        }),
        new cloudwatch.Metric({
          namespace: 'AWS/AppSync',
          metricName: 'Latency',
          dimensionsMap: {
            GraphQLAPIId: props.api.apiId,
          },
          statistic: 'p99',
          period: cdk.Duration.minutes(5),
          label: 'p99',
        }),
      ],
      width: 12,
      height: 6,
    });

    // Error Rate widget
    const errorRateWidget = new cloudwatch.GraphWidget({
      title: 'Error Rate',
      left: [
        new cloudwatch.MathExpression({
          expression: '(m1 + m2) / m3 * 100',
          usingMetrics: {
            m1: new cloudwatch.Metric({
              namespace: 'AWS/AppSync',
              metricName: '4XXError',
              dimensionsMap: {
                GraphQLAPIId: props.api.apiId,
              },
              statistic: 'Sum',
              period: cdk.Duration.minutes(5),
            }),
            m2: new cloudwatch.Metric({
              namespace: 'AWS/AppSync',
              metricName: '5XXError',
              dimensionsMap: {
                GraphQLAPIId: props.api.apiId,
              },
              statistic: 'Sum',
              period: cdk.Duration.minutes(5),
            }),
            m3: new cloudwatch.Metric({
              namespace: 'AWS/AppSync',
              metricName: 'ConnectSuccess',
              dimensionsMap: {
                GraphQLAPIId: props.api.apiId,
              },
              statistic: 'Sum',
              period: cdk.Duration.minutes(5),
            }),
          },
          label: 'Error Rate %',
        }),
      ],
      width: 12,
      height: 6,
    });

    // Add widgets to dashboard
    dashboard.addWidgets(requestCountWidget);
    dashboard.addWidgets(latencyWidget);
    dashboard.addWidgets(errorRateWidget);

    return dashboard;
  }

  private createAlarms(props: MonitoringConstructProps): void {
    // High error rate alarm
    const errorRateAlarm = new cloudwatch.Alarm(this, 'HighErrorRateAlarm', {
      alarmName: `${props.appName}-${props.stage}-high-error-rate`,
      alarmDescription: '5XX error rate exceeds 1% over 5 minutes',
      metric: new cloudwatch.MathExpression({
        expression: 'm1 / m2 * 100',
        usingMetrics: {
          m1: new cloudwatch.Metric({
            namespace: 'AWS/AppSync',
            metricName: '5XXError',
            dimensionsMap: {
              GraphQLAPIId: props.api.apiId,
            },
            statistic: 'Sum',
            period: cdk.Duration.minutes(5),
          }),
          m2: new cloudwatch.Metric({
            namespace: 'AWS/AppSync',
            metricName: 'ConnectSuccess',
            dimensionsMap: {
              GraphQLAPIId: props.api.apiId,
            },
            statistic: 'Sum',
            period: cdk.Duration.minutes(5),
          }),
        },
      }),
      threshold: 1,
      evaluationPeriods: 1,
      comparisonOperator: cloudwatch.ComparisonOperator.GREATER_THAN_THRESHOLD,
    });

    // Add SNS action to alarm
    errorRateAlarm.addAlarmAction(
      new cloudwatch_actions.SnsAction(this.alarmTopic)
    );

    // High latency alarm
    const highLatencyAlarm = new cloudwatch.Alarm(this, 'HighLatencyAlarm', {
      alarmName: `${props.appName}-${props.stage}-high-latency`,
      alarmDescription: 'API latency p99 exceeds 5 seconds',
      metric: new cloudwatch.Metric({
        namespace: 'AWS/AppSync',
        metricName: 'Latency',
        dimensionsMap: {
          GraphQLAPIId: props.api.apiId,
        },
        statistic: 'p99',
        period: cdk.Duration.minutes(5),
      }),
      threshold: 5000, // 5 seconds in milliseconds
      evaluationPeriods: 2,
      comparisonOperator: cloudwatch.ComparisonOperator.GREATER_THAN_THRESHOLD,
    });

    highLatencyAlarm.addAlarmAction(
      new cloudwatch_actions.SnsAction(this.alarmTopic)
    );

    // Low request count alarm (potential issue indicator)
    const lowRequestCountAlarm = new cloudwatch.Alarm(this, 'LowRequestCountAlarm', {
      alarmName: `${props.appName}-${props.stage}-low-request-count`,
      alarmDescription: 'Unusually low request count may indicate an issue',
      metric: new cloudwatch.Metric({
        namespace: 'AWS/AppSync',
        metricName: 'ConnectSuccess',
        dimensionsMap: {
          GraphQLAPIId: props.api.apiId,
        },
        statistic: 'Sum',
        period: cdk.Duration.minutes(15),
      }),
      threshold: 1,
      evaluationPeriods: 3,
      comparisonOperator: cloudwatch.ComparisonOperator.LESS_THAN_THRESHOLD,
      treatMissingData: cloudwatch.TreatMissingData.BREACHING,
    });

    lowRequestCountAlarm.addAlarmAction(
      new cloudwatch_actions.SnsAction(this.alarmTopic)
    );
  }
}
