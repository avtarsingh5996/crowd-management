const AWS = require('aws-sdk');
const fs = require('fs');
const path = require('path');

// Configure AWS
AWS.config.update({ region: 'us-east-1' });
const kinesis = new AWS.Kinesis();

const streamName = 'crowd-video-stream';

async function sendVideoFrame(frameData) {
  const params = {
    StreamName: streamName,
    PartitionKey: 'test-camera',
    Data: frameData
  };

  try {
    await kinesis.putRecord(params).promise();
    console.log('Frame sent successfully');
  } catch (error) {
    console.error('Error sending frame:', error);
  }
}

// Read and send a test image
const testImagePath = path.join(__dirname, 'test-image.jpg');
const imageData = fs.readFileSync(testImagePath);

// Send the frame
sendVideoFrame(imageData); 