import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { RekognitionClient, DetectLabelsCommand } from '@aws-sdk/client-rekognition';
import { TimestreamWriteClient, WriteRecordsCommand } from '@aws-sdk/client-timestream-write';
import { KinesisVideoClient, GetMediaCommand } from '@aws-sdk/client-kinesis-video';
import { KinesisVideoMediaClient, GetMediaCommand as GetMediaCommandV2 } from '@aws-sdk/client-kinesis-video-media';
import { DynamoDBDocumentClient, PutCommand } from '@aws-sdk/lib-dynamodb';
import { Stream } from 'stream';
import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';

const dynamoDB = DynamoDBDocumentClient.from(new DynamoDBClient({}));
const s3 = new S3Client({});
const rekognition = new RekognitionClient({});
const timestream = new TimestreamWriteClient({});
const kinesisVideo = new KinesisVideoClient({});
const kinesisVideoMedia = new KinesisVideoMediaClient({});

const BUCKET_NAME = process.env.BUCKET_NAME!;
const TABLE_NAME = process.env.TABLE_NAME!;
const TIMESTREAM_DB = process.env.TIMESTREAM_DB!;
const TIMESTREAM_TABLE = process.env.TIMESTREAM_TABLE!;
const VIDEO_STREAM_NAME = process.env.VIDEO_STREAM_NAME!;
const FRAME_RATE = parseInt(process.env.FRAME_RATE || '1'); // Process 1 frame per second

interface VideoFrame {
  cameraId: string;
  timestamp: number;
  frameData: string | Buffer;
}

interface RekognitionLabel {
  Name?: string;
  Confidence?: number;
  Instances?: Array<{ Confidence?: number }>;
}

interface RekognitionResponse {
  Labels?: RekognitionLabel[];
}

async function processFrame(frame: VideoFrame): Promise<{ peopleCount: number }> {
  // Convert frame data to Buffer if it's a base64 string
  const frameBuffer = typeof frame.frameData === 'string' 
    ? Buffer.from(frame.frameData, 'base64')
    : frame.frameData;

  // Save frame to S3
  await s3.send(new PutObjectCommand({
    Bucket: BUCKET_NAME,
    Key: `${frame.cameraId}/${frame.timestamp}.jpg`,
    Body: frameBuffer,
  }));

  // Use Rekognition to detect people
  const rekognitionResult = await rekognition.send(new DetectLabelsCommand({
    Image: {
      S3Object: {
        Bucket: BUCKET_NAME,
        Name: `${frame.cameraId}/${frame.timestamp}.jpg`,
      },
    },
  })) as RekognitionResponse;
  
  // Count people in the frame
  const peopleCount = rekognitionResult.Labels?.filter(label => 
    label.Name?.toLowerCase() === 'person'
  ).reduce((sum, label) => sum + (label.Instances?.length || 0), 0) || 0;

  // Store in DynamoDB
  await dynamoDB.send(new PutCommand({
    TableName: TABLE_NAME,
    Item: {
      cameraId: frame.cameraId,
      timestamp: frame.timestamp,
      peopleCount,
      metadata: {
        confidence: rekognitionResult.Labels?.find(label => 
          label.Name?.toLowerCase() === 'person'
        )?.Confidence || 0,
      },
    },
  }));

  // Store in Timestream
  try {
    await timestream.send(new WriteRecordsCommand({
      DatabaseName: TIMESTREAM_DB,
      TableName: TIMESTREAM_TABLE,
      Records: [
        {
          Dimensions: [
            {
              Name: 'camera_id',
              Value: frame.cameraId,
              DimensionValueType: 'VARCHAR',
            },
          ],
          MeasureName: 'people_count',
          MeasureValue: peopleCount.toString(),
          MeasureValueType: 'BIGINT',
          Time: frame.timestamp.toString(),
          TimeUnit: 'MILLISECONDS',
        },
      ],
    }));
  } catch (error) {
    console.error('Error writing to Timestream:', error);
  }

  return { peopleCount };
}

// Handle API Gateway requests (single frame)
async function handleApiGatewayRequest(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
  try {
    if (!event.body) {
      throw new Error('No body provided in the event');
    }

    const videoFrame: VideoFrame = JSON.parse(event.body);
    const { peopleCount } = await processFrame(videoFrame);

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
      body: JSON.stringify({
        message: 'Successfully processed video frame',
        peopleCount,
      }),
    };
  } catch (error) {
    console.error('Error processing video frame:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return {
      statusCode: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
      body: JSON.stringify({
        message: 'Error processing video frame',
        error: errorMessage,
      }),
    };
  }
}

// Handle Kinesis Video Stream
async function handleVideoStream(): Promise<void> {
  try {
    // Get the Kinesis Video Stream endpoint
    const describeStreamResponse = await kinesisVideo.send(new GetMediaCommand({
      StreamName: VIDEO_STREAM_NAME,
      StartSelector: {
        StartSelectorType: 'NOW',
      },
    }));

    // Get the media stream
    const mediaResponse = await kinesisVideoMedia.send(new GetMediaCommandV2({
      StreamARN: describeStreamResponse.StreamARN,
      StartSelector: {
        StartSelectorType: 'NOW',
      },
    }));

    if (!mediaResponse.Payload) {
      throw new Error('No media payload received');
    }

    // Process frames from the stream
    let frameCount = 0;
    const stream = mediaResponse.Payload as Stream;
    
    stream.on('data', async (chunk: Buffer) => {
      frameCount++;
      if (frameCount % FRAME_RATE === 0) {
        const frame: VideoFrame = {
          cameraId: 'camera1', // You might want to get this from the stream metadata
          timestamp: Date.now(),
          frameData: chunk,
        };
        await processFrame(frame);
      }
    });

    stream.on('error', (error: Error) => {
      console.error('Error processing video stream:', error);
    });

    // Keep the Lambda running while processing the stream
    await new Promise((resolve) => {
      stream.on('end', resolve);
    });

  } catch (error) {
    console.error('Error processing video stream:', error);
    throw error;
  }
}

export const handler = async (event: APIGatewayProxyEvent | any): Promise<APIGatewayProxyResult | void> => {
  // Check if this is an API Gateway request
  if (event.httpMethod) {
    return handleApiGatewayRequest(event as APIGatewayProxyEvent);
  }
  
  // Otherwise, handle as a video stream
  return handleVideoStream();
}; 