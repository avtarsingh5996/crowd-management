const { KinesisVideoClient, CreateStreamCommand } = require('@aws-sdk/client-kinesis-video');
const { KinesisVideoArchivedMediaClient, GetHLSStreamingSessionURLCommand } = require('@aws-sdk/client-kinesis-video-archived-media');
const { KinesisVideoMediaClient, PutMediaCommand } = require('@aws-sdk/client-kinesis-video-media');
const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');

const STREAM_NAME = 'crowd-video-stream';
const REGION = 'us-east-1';

// Initialize AWS clients
const kinesisVideo = new KinesisVideoClient({ region: REGION });
const kinesisVideoMedia = new KinesisVideoMediaClient({ region: REGION });

async function setupStream() {
  try {
    // Create the stream if it doesn't exist
    await kinesisVideo.send(new CreateStreamCommand({
      StreamName: STREAM_NAME,
      DataRetentionInHours: 24,
    }));
    console.log('Stream created successfully');
  } catch (error) {
    if (error.name === 'ResourceInUseException') {
      console.log('Stream already exists');
    } else {
      throw error;
    }
  }
}

async function getStreamEndpoint() {
  const response = await kinesisVideo.send(new GetHLSStreamingSessionURLCommand({
    StreamName: STREAM_NAME,
    PlaybackMode: 'LIVE',
  }));
  return response.HLSStreamingSessionURL;
}

async function streamVideo(videoPath) {
  // Get the stream endpoint
  const endpoint = await getStreamEndpoint();
  console.log('Stream endpoint:', endpoint);

  // Use ffmpeg to stream the video
  const ffmpegCommand = `ffmpeg -i ${videoPath} -f matroska -c:v copy -an -f kinesis ${endpoint}`;
  
  exec(ffmpegCommand, (error, stdout, stderr) => {
    if (error) {
      console.error('Error streaming video:', error);
      return;
    }
    console.log('Video streaming completed');
  });
}

// Main function
async function main() {
  try {
    await setupStream();
    
    // Check if a video file path is provided
    const videoPath = process.argv[2];
    if (!videoPath) {
      console.error('Please provide a video file path');
      process.exit(1);
    }

    if (!fs.existsSync(videoPath)) {
      console.error('Video file not found');
      process.exit(1);
    }

    await streamVideo(videoPath);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

main(); 