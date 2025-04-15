# AWS CloudFormation Template for Crowd Management Solution with Rekognition

This CloudFormation template deploys the crowd management solution outlined previously, including Kinesis Video Streams, Lambda, S3, DynamoDB, CloudWatch, and SNS. It also includes a guide for testing with sample video streams.

## CloudFormation Template

```yaml
AWSTemplateFormatVersion: '2010-09-09'
Description: Deploys a crowd management solution using Amazon Rekognition, Kinesis, Lambda, S3, DynamoDB, SNS, and CloudWatch.

Parameters:
  KinesisStreamName:
    Type: String
    Default: CrowdVideoStream
    Description: Name of the Kinesis Video Stream.
  S3BucketName:
    Type: String
    Default: crowd-frames-bucket
    Description: Name of the S3 bucket for storing video frames.
  DynamoDBTableName:
    Type: String
    Default: CrowdMetrics
    Description: Name of the DynamoDB table for crowd metrics.
  SNSTopicName:
    Type: String
    Default: CrowdAlerts
    Description: Name of the SNS topic for alerts.

Resources:
  # S3 Bucket for Video Frames
  FramesBucket:
    Type: AWS::S3::Bucket
    Properties:
      BucketName: !Ref S3BucketName
      BucketEncryption:
        ServerSideEncryptionConfiguration:
          - ServerSideEncryptionByDefault:
              SSEAlgorithm: AES256
      LifecycleConfiguration:
        Rules:
          - Id: ArchiveOldFrames
            Status: Enabled
            ExpirationInDays: 30

  # DynamoDB Table for Crowd Metrics
  CrowdMetricsTable:
    Type: AWS::DynamoDB::Table
    Properties:
      TableName: !Ref DynamoDBTableName
      AttributeDefinitions:
        - AttributeName: timestamp
          AttributeType: N
      KeySchema:
        - AttributeName: timestamp
          KeyType: HASH
      BillingMode: PAY_PER_REQUEST

  # Kinesis Video Stream
  VideoStream:
    Type: AWS::KinesisVideo::Stream
    Properties:
      Name: !Ref KinesisStreamName
      DataRetentionInHours: 24

  # SNS Topic for Alerts
  AlertsTopic:
    Type: AWS::SNS::Topic
    Properties:
      TopicName: !Ref SNSTopicName

  # IAM Role for Lambda
  LambdaExecutionRole:
    Type: AWS::IAM::Role
    Properties:
      AssumeRolePolicyDocument:
        Version: '2012-10-17'
        Statement:
          - Effect: Allow
            Principal:
              Service: lambda.amazonaws.com
            Action: sts:AssumeRole
      Policies:
        - PolicyName: LambdaPolicy
          PolicyDocument:
            Version: '2012-10-17'
            Statement:
              - Effect: Allow
                Action:
                  - logs:CreateLogGroup
                  - logs:CreateLogStream
                  - logs:PutLogEvents
                Resource: '*'
              - Effect: Allow
                Action:
                  - rekognition:DetectFaces
                  - rekognition:DetectLabels
                  - rekognition:DetectModerationLabels
                Resource: '*'
              - Effect: Allow
                Action:
                  - s3:PutObject
                Resource: !Sub 'arn:aws:s3:::${S3BucketName}/*'
              - Effect: Allow
                Action:
                  - dynamodb:PutItem
                Resource: !GetAtt CrowdMetricsTable.Arn
              - Effect: Allow
                Action:
                  - kinesisvideo:GetDataEndpoint
                  - kinesisvideo:GetMedia
                Resource: !GetAtt VideoStream.Arn

  # Lambda Function for Frame Processing
  FrameProcessorLambda:
    Type: AWS::Lambda::Function
    Properties:
      FunctionName: CrowdFrameProcessor
      Handler: index.lambda_handler
      Role: !GetAtt LambdaExecutionRole.Arn
      Runtime: python3.9
      Timeout: 60
      MemorySize: 256
      Code:
        ZipFile: |
          import json
          import boto3
          import base64
          import time

          rekognition = boto3.client('rekognition')
          dynamodb = boto3.resource('dynamodb')
          s3 = boto3.client('s3')

          def lambda_handler(event, context):
              table = dynamodb.Table('CrowdMetrics')
              bucket = 'crowd-frames-bucket'
              for record in event['Records']:
                  frame_data = base64.b64decode(record['kinesis']['data'])
                  response = rekognition.detect_faces(Image={'Bytes': frame_data}, Attributes=['ALL'])
                  person_count = len(response['FaceDetails'])
                  timestamp = int(time.time())
                  table.put_item(Item={
                      'timestamp': timestamp,
                      'person_count': person_count
                  })
                  s3.put_object(Bucket=bucket, Key=f"frame-{timestamp}.jpg", Body=frame_data)
              return {'statusCode': 200, 'body': json.dumps('Processed frames')}
      Environment:
        Variables:
          DYNAMODB_TABLE: !Ref DynamoDBTableName
          S3_BUCKET: !Ref S3BucketName

  # CloudWatch Alarm for Crowd Overflow
  CrowdOverflowAlarm:
    Type: AWS::CloudWatch::Alarm
    Properties:
      AlarmName: CrowdOverflow
      MetricName: PersonCount
      Namespace: CrowdMetrics
      Threshold: 100
      ComparisonOperator: GreaterThanThreshold
      EvaluationPeriods: 2
      Period: 300
      Statistic: Average
      AlarmActions:
        - !Ref AlertsTopic

Outputs:
  VideoStreamArn:
    Description: ARN of the Kinesis Video Stream
    Value: !GetAtt VideoStream.Arn
  S3BucketName:
    Description: Name of the S3 bucket
    Value: !Ref FramesBucket
  DynamoDBTableName:
    Description: Name of the DynamoDB table
    Value: !Ref CrowdMetricsTable
  SNSTopicArn:
    Description: ARN of the SNS topic
    Value: !Ref AlertsTopic
  LambdaFunctionArn:
    Description: ARN of the Lambda function
    Value: !GetAtt FrameProcessorLambda.Arn
```

## Deployment Instructions

1. **Save the Template**:
   - Copy the above YAML content into a file named `crowd-management.yaml`.

2. **Deploy Using AWS CLI**:
   ```bash
   aws cloudformation deploy \
     --template-file crowd-management.yaml \
     --stack-name CrowdManagementStack \
     --capabilities CAPABILITY_IAM
   ```

3. **Verify Resources**:
   - Check the AWS Management Console for:
     - Kinesis Video Stream (`CrowdVideoStream`)
     - S3 Bucket (`crowd-frames-bucket`)
     - DynamoDB Table (`CrowdMetrics`)
     - Lambda Function (`CrowdFrameProcessor`)
     - SNS Topic (`CrowdAlerts`)
     - CloudWatch Alarm (`CrowdOverflow`)

## Testing with Sample Video Streams

### Prerequisites
- Install the **AWS CLI** and **Kinesis Video Streams Producer SDK** on a local machine or EC2 instance.
- Obtain a sample video file (e.g., a crowd video in MP4 format). You can use royalty-free videos from sites like [Pexels](https://www.pexels.com/).

### Steps to Test

1. **Set Up the Producer SDK**:
   - Follow the [AWS Kinesis Video Streams Producer SDK setup guide](https://docs.aws.amazon.com/kinesisvideostreams/latest/dg/producer-sdk.html).
   - Configure AWS credentials with access to the Kinesis Video Stream.

2. **Stream a Sample Video**:
   - Use the GStreamer-based producer to stream a local video file to the Kinesis Video Stream.
   - Example command:
     ```bash
     export AWS_ACCESS_KEY_ID=<your-access-key>
     export AWS_SECRET_ACCESS_KEY=<your-secret-key>
     export AWS_DEFAULT_REGION=<your-region>
     ./kvs_gstreamer_sample CrowdVideoStream file:///path/to/sample-crowd-video.mp4
     ```
   - Replace `/path/to/sample-crowd-video.mp4` with the path to your video file.

3. **Monitor Lambda Execution**:
   - Check the Lambda function logs in CloudWatch Logs (`/aws/lambda/CrowdFrameProcessor`).
   - Verify that frames are processed and person counts are logged.

4. **Validate Data Storage**:
   - Check the S3 bucket (`crowd-frames-bucket`) for stored video frames.
   - Query the DynamoDB table (`CrowdMetrics`) to see crowd metrics:
     ```bash
     aws dynamodb scan --table-name CrowdMetrics
     ```

5. **Test Alerts**:
   - Simulate a high crowd count by manually inserting a record in DynamoDB:
     ```bash
     aws dynamodb put-item --table-name CrowdMetrics --item '{"timestamp": {"N": "1634567890"}, "person_count": {"N": "150"}}'
     ```
   - Verify that the CloudWatch alarm triggers and sends a notification to the SNS topic.

### Sample Video Recommendations
- Use a short (1-2 minute) MP4 video showing a crowd, such as a public event or busy street.
- Ensure the video resolution is at least 720p for better Rekognition accuracy.
- Test with multiple videos to simulate different crowd densities scenarios.

## Troubleshooting
- **No Frames in S3**: Ensure the Lambda function has correct IAM permissions and the Kinesis stream is receiving data.
- **Rekognition Errors**: Verify video quality and check Rekognition API limits (50 transactions per second).
- **Alarm Not Triggering**: Confirm the CloudWatch metric namespace and threshold settings.

## Cleanup
To avoid costs, delete the stack after testing:
```bash
aws cloudformation delete-stack --stack-name CrowdManagementStack
```

This template and testing guide provide a complete setup for deploying and validating the crowd management solution. Adjust parameters like thresholds or retention periods as needed for your use case.
