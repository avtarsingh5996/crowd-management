# Crowd Management Solution

A comprehensive crowd management solution leveraging AWS services for real-time crowd analysis and monitoring. This solution processes video feeds, detects people using AWS Rekognition, stores data in DynamoDB and Timestream, and provides real-time visualization through a React-based dashboard.

## Features

- Real-time crowd counting using AWS Rekognition
- Video feed processing from multiple cameras
- Historical data storage and analysis
- Real-time dashboard for crowd monitoring
- Alert system for crowd density thresholds
- Multi-camera support
- Trend analysis and reporting
- Scalable serverless architecture

## Architecture

The solution consists of the following components:

1. **Video Ingestion Layer**
   - AWS Kinesis Video Streams for video feed ingestion
   - Camera integration endpoints
   - Support for RTSP cameras

2. **Processing Layer**
   - AWS Lambda functions for video processing
   - AWS Rekognition for crowd detection
   - AWS Step Functions for workflow orchestration

3. **Storage Layer**
   - Amazon DynamoDB for real-time data
   - Amazon S3 for video storage
   - Amazon Timestream for time-series data

4. **Visualization Layer**
   - Grafana dashboard
   - Custom React-based dashboard
   - Real-time alerts

5. **Infrastructure**
   - AWS CDK for infrastructure as code
   - CI/CD pipeline
   - Monitoring and logging

## Project Structure

```
crowd-management/
├── backend/              # Backend services and Lambda functions
│   └── lambda/
│       └── video-processor/
│           ├── index.ts           # Lambda function for video processing
│           └── package.json       # Lambda dependencies
├── frontend/            # React-based dashboard
│   ├── src/
│   │   ├── App.tsx               # Main React dashboard
│   │   └── aws-exports.js        # AWS configuration
│   ├── package.json              # Frontend dependencies
│   └── tsconfig.json             # TypeScript configuration
├── infrastructure/      # AWS CDK infrastructure code
│   ├── lib/
│   │   └── crowd-management-stack.ts  # AWS CDK stack definition
│   └── package.json              # CDK dependencies
├── scripts/            # Utility scripts
│   └── setup.sh                  # Deployment script
├── package.json                  # Root project configuration
└── README.md                     # Project documentation
```

## Prerequisites

- Node.js (v16 or later)
- AWS CLI configured with appropriate credentials
- AWS CDK installed
- Docker (for local development)
- AWS account with necessary permissions

## Installation and Deployment

### 1. Initial Setup

```bash
# Clone the repository
git clone <repository-url>
cd crowd-management

# Install root dependencies
npm install
```

### 2. AWS Infrastructure Deployment

```bash
# Navigate to infrastructure directory
cd infrastructure

# Install CDK dependencies
npm install

# Bootstrap CDK (first time only)
cdk bootstrap aws://YOUR_ACCOUNT_ID/YOUR_REGION

# Deploy the stack
cdk deploy
```

After deployment, note down these values from the CDK output:
- VideoStreamName
- ApiEndpoint
- S3 bucket name
- DynamoDB table name
- Timestream database and table names

### 3. Backend Setup

```bash
# Navigate to backend directory
cd ../backend/lambda/video-processor

# Install dependencies
npm install

# Create .env file with the following values from CDK output
echo "BUCKET_NAME=your-bucket-name
TABLE_NAME=your-dynamodb-table
TIMESTREAM_DB=your-timestream-db
TIMESTREAM_TABLE=your-timestream-table" > .env

# Build the Lambda function
npm run build
```

### 4. Frontend Setup

```bash
# Navigate to frontend directory
cd ../../../frontend

# Install dependencies
npm install

# Update aws-exports.js with your AWS configuration
# You'll need to:
# 1. Create a Cognito User Pool
# 2. Create an AppSync API
# 3. Get the API Gateway endpoint

# Build the frontend
npm run build
```

## Testing the Solution

### 1. Test Video Processing

```bash
# Create a test event
echo '{
  "cameraId": "test-camera-1",
  "timestamp": 1234567890,
  "frameData": "base64-encoded-test-image"
}' > test-event.json

# Invoke Lambda
aws lambda invoke \
  --function-name VideoProcessor \
  --payload file://test-event.json \
  response.json
```

### 2. Test API Endpoint

```bash
# Get the API Gateway URL from CDK output
curl -X GET https://your-api-gateway-url/crowd
```

### 3. Verify Data Storage

- Check DynamoDB table for entries
- Verify S3 bucket for stored frames
- Check Timestream for time-series data

## Camera Integration

### 1. RTSP Camera Setup

```bash
# Example using GStreamer to stream from RTSP camera
gst-launch-1.0 rtspsrc location=rtsp://your-camera-ip:554/stream ! \
  h264parse ! \
  kvssink stream-name="crowd-video-stream" \
  access-key="YOUR_ACCESS_KEY" \
  secret-key="YOUR_SECRET_KEY" \
  aws-region="YOUR_REGION"
```

### 2. Camera Configuration

1. Configure camera to stream to Kinesis
2. Use the stream name from CDK output
3. Set up appropriate IAM roles and permissions

## Monitoring and Maintenance

### 1. CloudWatch Setup

- Create alarms for:
  - Lambda errors
  - API Gateway 4xx/5xx errors
  - Kinesis stream errors

### 2. CloudWatch Dashboards

- Create dashboard for:
  - People count trends
  - Processing latency
  - Error rates

### 3. Regular Maintenance

```bash
# Update infrastructure
cd infrastructure
cdk deploy

# Update Lambda function
cd ../backend/lambda/video-processor
npm run build

# Update frontend
cd ../../../frontend
npm run build
```

## Security Considerations

1. **IAM Policies**
   - Restrict permissions to minimum required
   - Add resource-level permissions
   - Enable encryption at rest

2. **Network Security**
   - Configure VPC endpoints
   - Set up security groups
   - Configure network ACLs

3. **Data Protection**
   - Enable encryption for all data at rest
   - Use HTTPS for all API endpoints
   - Implement proper access controls

## Troubleshooting

### Common Issues

1. **Lambda Function Errors**
   - Check CloudWatch logs
   - Verify IAM permissions
   - Check environment variables

2. **Video Processing Issues**
   - Verify Kinesis stream configuration
   - Check camera connectivity
   - Monitor Rekognition API limits

3. **Dashboard Issues**
   - Verify API Gateway configuration
   - Check Cognito authentication
   - Monitor network connectivity

## Contributing

1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Push to the branch
5. Create a Pull Request

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Support

For support, please open an issue in the GitHub repository or contact the maintainers. 