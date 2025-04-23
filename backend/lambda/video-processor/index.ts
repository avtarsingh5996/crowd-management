import { DynamoDB } from 'aws-sdk';
import { S3 } from 'aws-sdk';
import { Rekognition } from 'aws-sdk';
import { TimestreamWrite } from 'aws-sdk';
import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';

const dynamoDB = new DynamoDB.DocumentClient();
const s3 = new S3();
const rekognition = new Rekognition();
const timestream = new TimestreamWrite();

const BUCKET_NAME = process.env.BUCKET_NAME!;
const TABLE_NAME = process.env.TABLE_NAME!;
const TIMESTREAM_DB = process.env.TIMESTREAM_DB!;
const TIMESTREAM_TABLE = process.env.TIMESTREAM_TABLE!;

interface VideoFrame {
  cameraId: string;
  timestamp: number;
  frameData: string;
}

interface RekognitionLabel {
  Name?: string;
  Confidence?: number;
  Instances?: Array<{ Confidence?: number }>;
}

interface RekognitionResponse {
  Labels?: RekognitionLabel[];
}

export const handler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  try {
    if (!event.body) {
      throw new Error('No body provided in the event');
    }

    const videoFrame: VideoFrame = JSON.parse(event.body);
    
    // Save frame to S3
    await s3.putObject({
      Bucket: BUCKET_NAME,
      Key: `${videoFrame.cameraId}/${videoFrame.timestamp}.jpg`,
      Body: Buffer.from(videoFrame.frameData, 'base64'),
    }).promise();

    // Use Rekognition to detect people
    const rekognitionParams = {
      Image: {
        S3Object: {
          Bucket: BUCKET_NAME,
          Name: `${videoFrame.cameraId}/${videoFrame.timestamp}.jpg`,
        },
      },
    };

    const rekognitionResult = await rekognition.detectLabels(rekognitionParams).promise() as RekognitionResponse;
    
    // Count people in the frame
    const peopleCount = rekognitionResult.Labels?.filter(label => 
      label.Name?.toLowerCase() === 'person'
    ).reduce((sum, label) => sum + (label.Instances?.length || 0), 0) || 0;

    // Store in DynamoDB
    await dynamoDB.put({
      TableName: TABLE_NAME,
      Item: {
        cameraId: videoFrame.cameraId,
        timestamp: videoFrame.timestamp,
        peopleCount,
        metadata: {
          confidence: rekognitionResult.Labels?.find(label => 
            label.Name?.toLowerCase() === 'person'
          )?.Confidence || 0,
        },
      },
    }).promise();

    // Store in Timestream for time-series analysis
    try {
      await timestream.writeRecords({
        DatabaseName: TIMESTREAM_DB,
        TableName: TIMESTREAM_TABLE,
        Records: [
          {
            Dimensions: [
              {
                Name: 'camera_id',
                Value: videoFrame.cameraId,
                DimensionValueType: 'VARCHAR',
              },
            ],
            MeasureName: 'people_count',
            MeasureValue: peopleCount.toString(),
            MeasureValueType: 'BIGINT',
            Time: videoFrame.timestamp.toString(),
            TimeUnit: 'MILLISECONDS',
          },
        ],
      }).promise();
    } catch (error) {
      console.error('Error writing to Timestream:', error);
      // Continue execution even if Timestream write fails
    }

    return {
      statusCode: 200,
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
      body: JSON.stringify({
        message: 'Error processing video frame',
        error: errorMessage,
      }),
    };
  }
}; 