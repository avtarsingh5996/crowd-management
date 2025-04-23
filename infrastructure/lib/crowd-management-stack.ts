import * as cdk from 'aws-cdk-lib';
import * as kinesis from 'aws-cdk-lib/aws-kinesis';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as timestream from 'aws-cdk-lib/aws-timestream';
import * as apigateway from 'aws-cdk-lib/aws-apigateway';
import { Construct } from 'constructs';

export class CrowdManagementStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // Create Kinesis Video Stream
    const videoStream = new kinesis.Stream(this, 'VideoStream', {
      streamName: 'crowd-video-stream',
      shardCount: 1,
    });

    // Create S3 bucket for video storage
    const videoStorageBucket = new s3.Bucket(this, 'VideoStorageBucket', {
      bucketName: 'crowd-video-storage',
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      autoDeleteObjects: true,
    });

    // Create DynamoDB table for real-time data
    const crowdDataTable = new dynamodb.Table(this, 'CrowdDataTable', {
      tableName: 'crowd-data',
      partitionKey: { name: 'cameraId', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'timestamp', type: dynamodb.AttributeType.NUMBER },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
    });

    // Create Timestream database and table for time-series data
    const timestreamDb = new timestream.CfnDatabase(this, 'CrowdMetricsDatabase', {
      databaseName: 'crowd_metrics',
    });

    const timestreamTable = new timestream.CfnTable(this, 'CrowdMetricsTable', {
      databaseName: timestreamDb.databaseName!,
      tableName: 'crowd_metrics',
      retentionProperties: {
        memoryStoreRetentionPeriodInHours: '24',
        magneticStoreRetentionPeriodInDays: '365',
      },
      schema: {
        compositePartitionKey: [
          {
            type: 'DIMENSION',
            name: 'camera_id'
          }
        ]
      }
    });

    // Add explicit dependency
    timestreamTable.addDependency(timestreamDb);

    // Create Lambda function for video processing
    const videoProcessor = new lambda.Function(this, 'VideoProcessor', {
      runtime: lambda.Runtime.NODEJS_18_X,
      handler: 'dist/index.handler',
      code: lambda.Code.fromAsset('../backend/lambda/video-processor/dist'),
      timeout: cdk.Duration.seconds(300),
      environment: {
        BUCKET_NAME: videoStorageBucket.bucketName,
        TABLE_NAME: crowdDataTable.tableName,
        TIMESTREAM_DB: timestreamDb.databaseName!,
        TIMESTREAM_TABLE: timestreamTable.tableName!,
      },
    });

    // Grant necessary permissions
    videoStorageBucket.grantReadWrite(videoProcessor);
    crowdDataTable.grantReadWriteData(videoProcessor);
    
    // Add specific Timestream permissions
    videoProcessor.addToRolePolicy(
      new iam.PolicyStatement({
        actions: [
          'timestream:WriteRecords',
          'timestream:DescribeEndpoints',
          'timestream:Select',
          'timestream:DescribeDatabase',
          'timestream:DescribeTable'
        ],
        resources: [
          `arn:aws:timestream:${this.region}:${this.account}:database/${timestreamDb.databaseName}`,
          `arn:aws:timestream:${this.region}:${this.account}:database/${timestreamDb.databaseName}/table/${timestreamTable.tableName}`
        ],
      })
    );

    // Add Timestream service permissions
    videoProcessor.addToRolePolicy(
      new iam.PolicyStatement({
        actions: [
          'timestream:DescribeEndpoints'
        ],
        resources: ['*']
      })
    );

    videoProcessor.addToRolePolicy(
      new iam.PolicyStatement({
        actions: ['rekognition:*'],
        resources: ['*'],
      })
    );

    // Create Lambda function for data retrieval
    const dataRetriever = new lambda.Function(this, 'DataRetriever', {
      runtime: lambda.Runtime.NODEJS_18_X,
      handler: 'dist/index.handler',
      code: lambda.Code.fromAsset('../backend/lambda/data-retriever/dist'),
      timeout: cdk.Duration.seconds(30),
      environment: {
        TABLE_NAME: crowdDataTable.tableName,
      },
    });

    // Grant necessary permissions
    crowdDataTable.grantReadData(dataRetriever);

    // Create API Gateway
    const api = new apigateway.RestApi(this, 'CrowdManagementApi', {
      restApiName: 'Crowd Management API',
      description: 'API for crowd management system',
    });

    // Add API endpoints
    const crowdResource = api.root.addResource('crowd');
    crowdResource.addMethod('GET', new apigateway.LambdaIntegration(dataRetriever), {
      methodResponses: [
        {
          statusCode: '200',
          responseParameters: {
            'method.response.header.Access-Control-Allow-Origin': true,
          },
        },
      ],
    });

    // Add CORS configuration
    crowdResource.addMethod('OPTIONS', new apigateway.MockIntegration({
      integrationResponses: [
        {
          statusCode: '200',
          responseParameters: {
            'method.response.header.Access-Control-Allow-Headers': "'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token'",
            'method.response.header.Access-Control-Allow-Methods': "'GET,OPTIONS'",
            'method.response.header.Access-Control-Allow-Origin': "'*'",
          },
        },
      ],
      passthroughBehavior: apigateway.PassthroughBehavior.NEVER,
      requestTemplates: {
        'application/json': '{"statusCode": 200}',
      },
    }), {
      methodResponses: [
        {
          statusCode: '200',
          responseParameters: {
            'method.response.header.Access-Control-Allow-Headers': true,
            'method.response.header.Access-Control-Allow-Methods': true,
            'method.response.header.Access-Control-Allow-Origin': true,
          },
        },
      ],
    });

    // Output important values
    new cdk.CfnOutput(this, 'VideoStreamName', {
      value: videoStream.streamName,
    });

    new cdk.CfnOutput(this, 'ApiEndpoint', {
      value: api.url,
    });

    new cdk.CfnOutput(this, 'TimestreamDatabase', {
      value: timestreamDb.databaseName!,
    });

    new cdk.CfnOutput(this, 'TimestreamTable', {
      value: timestreamTable.tableName!,
    });
  }
} 