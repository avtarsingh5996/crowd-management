const AWS = require('aws-sdk');
const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

// Configure AWS
AWS.config.update({ region: 'us-east-1' });
const kinesis = new AWS.Kinesis();
const lambda = new AWS.Lambda();

const streamName = 'crowd-video-stream';

// Function to compress image using Sharp
async function compressImage(inputPath) {
  try {
    const imageBuffer = await sharp(inputPath)
      .resize(640, 480)  // Resize to 640x480
      .jpeg({ quality: 70 })  // Compress JPEG with 70% quality
      .toBuffer();
    
    console.log(`Compressed image size: ${imageBuffer.length} bytes`);
    return imageBuffer;
  } catch (error) {
    console.error('Error compressing image:', error);
    throw error;
  }
}

async function sendVideoFrame(frameData) {
  const videoFrame = {
    cameraId: 'test-camera',
    timestamp: Date.now(),
    frameData: frameData.toString('base64')
  };

  const params = {
    FunctionName: 'CrowdManagementStack-VideoProcessor', // Replace with your Lambda function name
    Payload: JSON.stringify({
      body: JSON.stringify(videoFrame)
    })
  };

  try {
    const result = await lambda.invoke(params).promise();
    console.log('Lambda response:', result.Payload);
  } catch (error) {
    console.error('Error invoking Lambda:', error);
  }
}

async function main() {
  try {
    const testImagePath = path.join(__dirname, 'test-image.jpg');
    
    // First compress the image
    console.log('Compressing image...');
    const compressedImage = await compressImage(testImagePath);
    
    // Then send the compressed image
    console.log('Sending compressed image...');
    await sendVideoFrame(compressedImage);
  } catch (error) {
    console.error('Error:', error);
  }
}

main(); 