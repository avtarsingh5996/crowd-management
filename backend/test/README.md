# Testing Video Feed

To test the video feed end-to-end:

1. Place a test image named `test-image.jpg` in this directory
2. Install dependencies:
   ```bash
   npm install aws-sdk
   ```
3. Run the test script:
   ```bash
   node send-test-video.js
   ```

The script will:
- Read the test image
- Send it to the Kinesis Video Stream
- The Lambda function will process it
- Results will be stored in DynamoDB and Timestream
- The frontend will display the results

You can monitor the results in:
- S3 bucket: crowd-video-storage
- DynamoDB table: crowd-data
- Timestream database: crowd_metrics 