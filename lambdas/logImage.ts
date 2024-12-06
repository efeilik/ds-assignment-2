import { SQSHandler } from "aws-lambda";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, PutCommand, DeleteCommand } from "@aws-sdk/lib-dynamodb";

const dynamoClient = new DynamoDBClient({ region: process.env.AWS_REGION || "eu-west-1" });
const ddbDocClient = createDDbDocClient();
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
                    console.log("Event Name: ", messageRecord.eventName);
                    if (messageRecord.eventName.startsWith("ObjectCreated")) {
                        if (!srcKey.endsWith(".jpeg") && !srcKey.endsWith(".png")) {
                            throw new Error("Invalid file type, please upload .jpeg or .png files");
                        }
                        const params = {
                            TableName: process.env.TABLE_NAME,
                            Item: {
                                fileName: srcKey,
                            },
                        };

                        await ddbDocClient.send(new PutCommand(params));
                        console.log("Object Added succesfully");
                    }
                    else if (messageRecord.eventName.startsWith("ObjectRemoved")) {
                        const params = {
                            TableName: process.env.TABLE_NAME,
                            Key: { fileName: srcKey }
                        };
                        await ddbDocClient.send(new DeleteCommand(params));
                        console.log("Object Removed succesfully");
                    }
                    console.log(srcKey + "Logged in successfully");
                }
            }
        } catch (error) {
            console.error("Error: " + error);
            throw error;
        }
    }
};

function createDDbDocClient() {
    const ddbClient = new DynamoDBClient({ region: process.env.REGION || "eu-west-1" });
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