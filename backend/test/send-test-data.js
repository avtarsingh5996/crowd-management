const { KinesisClient, PutRecordCommand } = require('@aws-sdk/client-kinesis');
const fs = require('fs');

const kinesis = new KinesisClient({ region: 'ap-south-1' });
const STREAM_NAME = 'crowd-video-data-stream';

async function sendTestData() {
  try {
    // Read a test image file
    const imageBuffer = fs.readFileSync('test-image.jpg');
    const base64Image = imageBuffer.toString('base64');

    // Create a test record
    const record = {
      cameraId: 'test-camera',
      timestamp: Date.now(),
      frameData: base64Image
    };

    // Send the record to Kinesis
    const command = new PutRecordCommand({
      StreamName: STREAM_NAME,
      Data: Buffer.from(JSON.stringify(record)),
      PartitionKey: 'test-partition-key'
    });

    const response = await kinesis.send(command);
    console.log('Successfully sent record to Kinesis:', response);
  } catch (error) {
    console.error('Error sending test data:', error);
  }
}

sendTestData(); 