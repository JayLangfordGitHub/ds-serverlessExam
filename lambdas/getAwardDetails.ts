import { APIGatewayProxyHandlerV2 } from "aws-lambda";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import {
  DynamoDBDocumentClient,
  QueryCommand,
  QueryCommandInput,
} from "@aws-sdk/lib-dynamodb";

const ddbDocClient = createDocumentClient();

export const handler: APIGatewayProxyHandlerV2 = async (event, context) => {
  try {
    console.log("Event: ", JSON.stringify(event));

    const parameters = event?.pathParameters;
    const queryParams = event?.queryStringParameters;

    const movieId = parameters?.movieId ? parseInt(parameters.movieId) : undefined;
    const awardBody = parameters?.awardBody;

    if (!movieId || !awardBody) {
      return {
        statusCode: 400,
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ message: "Missing movieId or awardBody in path" }),
      };
    }

    let minAwards = 0;
    if (queryParams?.min) {
      minAwards = parseInt(queryParams.min);
      if (isNaN(minAwards)) {
        return {
          statusCode: 400,
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ message: "Invalid 'min' query parameter" }),
        };
      }
    }

    const commandInput: QueryCommandInput = {
      TableName: process.env.TABLE_NAME,
      KeyConditionExpression: "movieId = :movieId and awardBody = :awardBody",
      ExpressionAttributeValues: {
        ":movieId": movieId,
        ":awardBody": awardBody,
      },
    };

    const commandOutput = await ddbDocClient.send(new QueryCommand(commandInput));

    const awards = commandOutput.Items || [];

    const totalAwards = awards.reduce((sum, award) => sum + (award.numAwards || 0), 0);

    // Updated condition to make `min` inclusive
    if (totalAwards < minAwards) {
      return {
        statusCode: 400,
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ message: "Request failed" }),
      };
    }

    return {
      statusCode: 200,
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ data: awards }),
    };
  } catch (error: any) {
    console.log("Error: ", JSON.stringify(error));
    return {
      statusCode: 500,
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ error }),
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
  const unmarshallOptions = { wrapNumbers: false };
  const translateConfig = { marshallOptions, unmarshallOptions };
  return DynamoDBDocumentClient.from(ddbClient, translateConfig);
}