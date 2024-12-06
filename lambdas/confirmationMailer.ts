import { DynamoDBStreamHandler } from "aws-lambda";
import { SES_EMAIL_FROM, SES_EMAIL_TO, SES_REGION } from "../env";
import {
  SESClient,
  SendEmailCommand,
  SendEmailCommandInput,
} from "@aws-sdk/client-ses";

if (!SES_EMAIL_TO || !SES_EMAIL_FROM || !SES_REGION) {
  throw new Error(
    "Please add the SES_EMAIL_TO, SES_EMAIL_FROM and SES_REGION environment variables in an env.js file located in the root directory"
  );
}

const client = new SESClient({ region: SES_REGION });

export const handler: DynamoDBStreamHandler = async (event: any) => {
  console.log("DynamoDB Stream Event ", JSON.stringify(event));

  for (const record of event.Records) {
    console.log("DynamoDB Stream Event Record: ", JSON.stringify(record));
    const eventName = record.eventName;
    const dynamoDBRecord = record.dynamodb;
    const keys = dynamoDBRecord?.Keys;
    const fileName = keys.fileName?.S;

    // Object key may have spaces or unicode non-ASCII characters
    const srcKey = decodeURIComponent(fileName.replace(/\+/g, " "));
    try {
      const params = sendEmailParams(srcKey,eventName);
      await client.send(new SendEmailCommand(params));
    } catch (error: unknown) {
      console.log("ERROR is: ", error);
    }
  }
};

function sendEmailParams(srcKey: String, eventName: String) {
  const parameters: SendEmailCommandInput = {
    Destination: {
      ToAddresses: [SES_EMAIL_TO],
    },
    Message: {
      Body: {
        Html: {
          Charset: "UTF-8",
          Data: getHtmlContent(srcKey,eventName),
        },
      },
      Subject: {
        Charset: "UTF-8",
        Data: `${eventName} Confirmation`,
      },
    },
    Source: SES_EMAIL_FROM,
  };
  return parameters;
}

function getHtmlContent(srcKey: String, eventName: String) {
  return `
    <html>
      <body>
        <ul>
          <li style="font-size:18px">✉️ <b>${eventName} succesfully done for ${srcKey}</b></li>
        </ul>
      </body>
    </html> 
  `;
}