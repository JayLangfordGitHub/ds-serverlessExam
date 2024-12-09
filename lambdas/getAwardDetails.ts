import { APIGatewayProxyHandlerV2 } from "aws-lambda";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, GetCommand } from "@aws-sdk/lib-dynamodb";

const ddbDocClient = createDocumentClient();

export const handler: APIGatewayProxyHandlerV2 = async (event) => {
  try {
    console.log("Event: ", JSON.stringify(event));
    const parameters = event?.pathParameters;

    const awardBody = parameters?.awardBody;
    const movieId = parameters?.movieId ? parseInt(parameters.movieId) : undefined;

    if (!awardBody || !movieId) {
      return {
        statusCode: 400,
        body: JSON.stringify({ message: "Missing awardBody or movieId" }),
      };
    }

    const command = new GetCommand({
      TableName: process.env.TABLE_NAME,
      Key: { movieId: movieId, awardBody: awardBody },
    });

    const result = await ddbDocClient.send(command);

    if (!result.Item) {
      return {
        statusCode: 404,
        body: JSON.stringify({ message: "Details not found" }),
      };
    }

    return {
      statusCode: 200,
      body: JSON.stringify(result.Item),
    };
  } catch (error) {
    console.error("Error getting award details:", error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: "Internal Server Error" }),
    };
  }
};

function createDocumentClient() {
  const ddbClient = new DynamoDBClient({ region: process.env.REGION });
  const marshallOptions = {
    convertEmptyValues: true,
    removeUndefinedValues: true,
    convertClassInstanceToMap: true,
  };
  const unmarshallOptions = {
    wrapNumbers: false,
  };
  const translateConfig = { marshallOptions, unmarshallOptions };
  return DynamoDBDocumentClient.from(ddbClient, translateConfig);
}