import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient } from "@aws-sdk/lib-dynamodb";
import { S3Client } from "@aws-sdk/client-s3";
import {
  BUCKET_NAME,
  TABLE_NAME,
  REGION,
  localstackEndpoint,
} from "./config.js";

export const RESOURCE_CONFIG = {
  region: REGION,
  bucketName: BUCKET_NAME,
  tableName: TABLE_NAME,
};

function baseClientConfig() {
  return {
    region: REGION,
    endpoint: localstackEndpoint(),
    credentials: {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID ?? "test",
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY ?? "test",
    },
  };
}

export const s3 = new S3Client({
  ...baseClientConfig(),
  forcePathStyle: true,
});

const dynamodb = new DynamoDBClient(baseClientConfig());
export const ddb = DynamoDBDocumentClient.from(dynamodb, {
  marshallOptions: { removeUndefinedValues: true },
});
