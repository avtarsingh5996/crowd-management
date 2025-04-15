import boto3
import time
from datetime import datetime

# AWS configuration
STREAM_NAME = "CrowdVideoStream"
REGION = "<your-region>"  # e.g., "us-east-1"
ACCESS_KEY = "<your-access-key>"
SECRET_KEY = "<your-secret-key>"

# Initialize Kinesis Video Streams client
kvs_client = boto3.client(
    "kinesisvideo",
    region_name=REGION,
    aws_access_key_id=ACCESS_KEY,
    aws_secret_access_key=SECRET_KEY
)

# Get the data endpoint for the stream
response = kvs_client.get_data_endpoint(
    StreamName=STREAM_NAME,
    APIName="PUT_MEDIA"
)
endpoint = response["DataEndpoint"]

# Initialize Kinesis Video Streams media client
kvs_media_client = boto3.client(
    "kinesis-video-media",
    endpoint_url=endpoint,
    region_name=REGION,
    aws_access_key_id=ACCESS_KEY,
    aws_secret_access_key=SECRET_KEY
)

def upload_video(video_path):
    print(f"Uploading video to {STREAM_NAME}...")
    with open(video_path, "rb") as video_file:
        response = kvs_media_client.put_media(
            StreamName=STREAM_NAME,
            Payload=video_file,
            FragmentTimecode=int(time.time() * 1000),  # Current time in milliseconds
            ProducerTimestamp=datetime.now()
        )
        print(f"Response: {response}")
        while True:
            chunk = response["Payload"].read(1024 * 1024)  # Read in 1MB chunks
            if not chunk:
                break
        print("Upload complete.")

if __name__ == "__main__":
    VIDEO_PATH = "/path/to/crowd-video.mp4"  # Replace with your video path
    upload_video(VIDEO_PATH)
