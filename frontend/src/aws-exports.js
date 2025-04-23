const awsmobile = {
  "aws_project_region": "us-east-1",
  "aws_cognito_region": "us-east-1",
  "aws_user_pools_id": "YOUR_USER_POOL_ID",
  "aws_user_pools_web_client_id": "YOUR_CLIENT_ID",
  "oauth": {},
  "aws_appsync_graphqlEndpoint": "YOUR_APPSYNC_ENDPOINT",
  "aws_appsync_region": "us-east-1",
  "aws_appsync_authenticationType": "AMAZON_COGNITO_USER_POOLS",
  "aws_cloud_logic_custom": [
    {
      "name": "crowdManagementApi",
      "endpoint": "YOUR_API_GATEWAY_ENDPOINT",
      "region": "us-east-1"
    }
  ]
};

export default awsmobile; 