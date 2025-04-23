const { KinesisVideoClient, CreateStreamCommand, GetDataEndpointCommand } = require('@aws-sdk/client-kinesis-video');
const { KinesisVideoMediaClient, PutMediaCommand } = require('@aws-sdk/client-kinesis-video-media');
const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');
 
const STREAM_NAME = 'crowd-video-stream';
const REGION = 'ap-south-1';
 
// Initialize AWS clients
const kinesisVideo = new KinesisVideoClient({ region: REGION });
 
async function setupStream() {
    try {
        // Create the stream if it doesn't exist
        await kinesisVideo.send(new CreateStreamCommand({
            StreamName: STREAM_NAME,
            DataRetentionInHours: 24,
            MediaType: 'video/h264',
            KmsKeyId: 'alias/aws/kinesisvideo', // Optional: Use AWS-managed KMS key
            Tags: {
                'Environment': 'production'
            }
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
    const response = await kinesisVideo.send(new GetDataEndpointCommand({
        StreamName: STREAM_NAME,
        APIName: 'PUT_MEDIA',
    }));
    return response.DataEndpoint;
}
 
async function streamVideo(videoPath) {
    try {
        // Get the stream endpoint
        const endpoint = await getStreamEndpoint();
        if (!endpoint) {
            throw new Error('No data endpoint received');
        }
        console.log('Stream endpoint:', endpoint);
 
        // Create a new KinesisVideoMediaClient with the endpoint
        const kinesisVideoMedia = new KinesisVideoMediaClient({
            endpoint,
            region: REGION,
        });
 
        // Construct FFmpeg command with proper streaming parameters
        const ffmpegCommand = `ffmpeg -re -i "${videoPath}" \
            -c:v libx264 \
            -preset veryfast \
            -tune zerolatency \
            -b:v 2000k \
            -maxrate 2000k \
            -bufsize 4000k \
            -g 30 \
            -keyint_min 30 \
            -sc_threshold 0 \
            -f mp4 \
            -movflags frag_keyframe+empty_moov+default_base_moof \
            -an \
            -content_type video/h264 \
            -method PUT \
            "${endpoint}"`;
 
        console.log('Running ffmpeg command:', ffmpegCommand);
 
        // Execute FFmpeg command
        const ffmpegProcess = exec(ffmpegCommand);
 
        // Handle FFmpeg process events
        ffmpegProcess.stdout.on('data', (data) => {
            console.log(FFmpeg stdout: ${data});
        });
 
        ffmpegProcess.stderr.on('data', (data) => {
            console.error(FFmpeg stderr: ${data});
        });
 
        ffmpegProcess.on('close', (code) => {
            if (code === 0) {
                console.log('Video streaming completed successfully');
            } else {
                console.error(FFmpeg process exited with code ${code});
            }
        });
 
        // Handle process termination
        process.on('SIGINT', () => {
            console.log('Received SIGINT. Stopping FFmpeg process...');
            ffmpegProcess.kill();
            process.exit();
        });
 
    } catch (error) {
        console.error('Error in streamVideo:', error);
        throw error;
    }
}
 
async function validateVideoFile(videoPath) {
    if (!videoPath) {
        throw new Error('Please provide a video file path');
    }
 
    if (!fs.existsSync(videoPath)) {
        throw new Error('Video file not found');
    }
 
    // Check if the file is actually a video file
    const validExtensions = ['.mp4', '.mov', '.avi', '.mkv'];
    const fileExtension = path.extname(videoPath).toLowerCase();
    if (!validExtensions.includes(fileExtension)) {
        throw new Error('Invalid video file format');
    }
}
 
// Main function
async function main() {
    try {
        // Get video path from command line arguments
        const videoPath = process.argv[2];
 
        // Validate video file
        await validateVideoFile(videoPath);
 
        // Setup stream and start streaming
        await setupStream();
        await streamVideo(videoPath);
 
    } catch (error) {
        console.error('Error:', error.message);
        process.exit(1);
    }
}
 
// Error handling for unhandled rejections
process.on('unhandledRejection', (error) => {
    console.error('Unhandled rejection:', error);
    process.exit(1);
});
 
// Start the application
main();