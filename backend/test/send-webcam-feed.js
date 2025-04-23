const AWS = require('aws-sdk');
const { spawn } = require('child_process');

// Configure AWS
AWS.config.update({ region: 'us-east-1' });
const kinesis = new AWS.Kinesis();
const streamName = 'crowd-video-stream';

// Function to capture frame from webcam using ffmpeg
function captureFrame() {
  return new Promise((resolve, reject) => {
    const ffmpeg = spawn('ffmpeg', [
      '-f', 'avfoundation',
      '-framerate', '30',
      '-video_size', '640x480',
      '-i', '0',
      '-frames', '1',
      '-f', 'image2',
      '-'
    ]);

    let imageData = Buffer.alloc(0);

    ffmpeg.stdout.on('data', (data) => {
      imageData = Buffer.concat([imageData, data]);
    });

    ffmpeg.on('close', (code) => {
      if (code === 0) {
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

// Function to send frame to Kinesis
async function sendFrame(frameData) {
  const params = {
    StreamName: streamName,
    PartitionKey: 'webcam',
    Data: frameData
  };

  try {
    await kinesis.putRecord(params).promise();
    console.log('Frame sent successfully');
  } catch (error) {
    console.error('Error sending frame:', error);
  }
}

// Main loop
async function main() {
  console.log('Starting webcam feed...');
  
  while (true) {
    try {
      const frame = await captureFrame();
      await sendFrame(frame);
      // Wait for 1 second before capturing next frame
      await new Promise(resolve => setTimeout(resolve, 1000));
    } catch (error) {
      console.error('Error in main loop:', error);
    }
  }
}

main(); 