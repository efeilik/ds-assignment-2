import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, UpdateCommand } from "@aws-sdk/lib-dynamodb";
import { SNSHandler } from "aws-lambda";

const ddbDocClient = createDDbDocClient();

export const handler : SNSHandler = async (event: any) => {
    console.log("Event: ", event);
    for (const record of event.Records) {

        console.log("Record Sns: ",record.Sns);
        const snsRecord = record.Sns;
        const body = JSON.parse(snsRecord.Message);
        console.log("Body: ", body);
        const id = body.id;
        const value = body.value;
        const metadataType = snsRecord.MessageAttributes.metadata_type.Value;
    
        if (!id || !value || !metadataType) {
          console.error("Invalid format");
        }
    
        const updateCommand = new UpdateCommand({
          TableName: process.env.TABLE_NAME,
          Key: { fileName: id },
          UpdateExpression: "SET #attr = :value",
          ExpressionAttributeNames: {
            "#attr": metadataType,
          },
          ExpressionAttributeValues: {
            ":value": value,
          },
        });
    
        try {
          await ddbDocClient.send(updateCommand);
          console.log("updated", metadataType, "for", id);
        } catch (error) {
          console.error("Failed to update: " ,error);
        }
      }
};

function createDDbDocClient() {
    const ddbClient = new DynamoDBClient({ region: process.env.REGION || "eu-west-1"});
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
