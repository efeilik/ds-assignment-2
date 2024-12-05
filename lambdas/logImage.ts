import { SQSHandler } from "aws-lambda";
import { DynamoDBClient, PutItemCommand } from "@aws-sdk/client-dynamodb";

const dynamoClient = new DynamoDBClient({ region: process.env.AWS_REGION || "eu-west-1" });

export const handler: SQSHandler = async (event) => {
    console.log("Event ", JSON.stringify(event));
  for (const record of event.Records) {
    try {
      const recordBody = JSON.parse(record.body);
      const snsMessage = JSON.parse(recordBody.Message);
      if (snsMessage.Records) {
        console.log("Record body ", JSON.stringify(snsMessage));
        for (const messageRecord of snsMessage.Records) {
          const s3e = messageRecord.s3;
          const srcKey = decodeURIComponent(s3e.object.key.replace(/\+/g, " "));
          if (!srcKey.endsWith(".jpeg") && !srcKey.endsWith(".png")) {
            throw new Error("Invalid file type, please upload .jpeg or .png files");
          }
          const params = {
            TableName: process.env.TABLE_NAME,
            Item: {
              fileName: { S: srcKey },
            },
          };
          await dynamoClient.send(new PutItemCommand(params));
          console.log(srcKey + "Logged in successfully");
        }
      }
    } catch (error) {
      console.error("Error: " + error);
      throw error;
    }
  }
};
