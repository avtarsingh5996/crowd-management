const AWS = require('aws-sdk');
const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

// Configure AWS
AWS.config.update({ region: 'us-east-1' });
const kinesis = new AWS.Kinesis();

const streamName = 'crowd-video-stream';

// Function to compress image using ffmpeg
function compressImage(inputPath) {
  return new Promise((resolve, reject) => {
    const ffmpeg = spawn('ffmpeg', [
      '-i', inputPath,
      '-vf', 'scale=640:480',  // Resize to 640x480
      '-compression_level', '5', // JPEG compression level
      '-f', 'image2',
      '-'
    ]);

    let imageData = Buffer.alloc(0);

    ffmpeg.stdout.on('data', (data) => {
      imageData = Buffer.concat([imageData, data]);
    });

    ffmpeg.on('close', (code) => {
      if (code === 0) {
        console.log(`Compressed image size: ${imageData.length} bytes`);
        resolve(imageData);
      } else {
        reject(new Error(`FFmpeg exited with code ${code}`));
      }
    });

    ffmpeg.stderr.on('data', (data) => {
      console.error(`FFmpeg stderr: ${data}`);
    });
  });
}

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