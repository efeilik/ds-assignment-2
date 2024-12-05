import { SNSHandler, SQSHandler } from "aws-lambda";
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

export const handler: SNSHandler = async (event: any) => {
  console.log("SNS Event ", JSON.stringify(event));
  for (const record of event.Records) {
    console.log("Record Sns: ", record.Sns);
    const snsRecord = record.Sns;
    const body = JSON.parse(snsRecord.Message);
    console.log("Record body ", JSON.stringify(body));
    const id = body.id;
    const value = body.value;
    const metadataType = snsRecord.MessageAttributes.metadata_type.Value;

    if (!id || !value || !metadataType) {
      console.error("Invalid format");
    }

    // Object key may have spaces or unicode non-ASCII characters.
    const srcKey = decodeURIComponent(id.replace(/\+/g, " "));
    try {
      const params = sendEmailParams( srcKey );
      await client.send(new SendEmailCommand(params));
    } catch (error: unknown) {
      console.log("ERROR is: ", error);
      // return;
    }
  }
};

function sendEmailParams(srcKey: String) {
  const parameters: SendEmailCommandInput = {
    Destination: {
      ToAddresses: [SES_EMAIL_TO],
    },
    Message: {
      Body: {
        Html: {
          Charset: "UTF-8",
          Data: getHtmlContent(srcKey),
        },
      },
      Subject: {
        Charset: "UTF-8",
        Data: `Upload Confirmation`,
      },
    },
    Source: SES_EMAIL_FROM,
  };
  return parameters;
}

function getHtmlContent(srcKey: String) {
  return `
    <html>
      <body>
        <h2>Sent from: </h2>
        <ul>
          <li style="font-size:18px">👤 <b>File path: ${srcKey} received</b></li>
        </ul>
      </body>
    </html> 
  `;
}