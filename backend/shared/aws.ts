import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient } from "@aws-sdk/lib-dynamodb";
import { S3Client } from "@aws-sdk/client-s3";
import {
  BUCKET_NAME,
  TABLE_NAME,
  REGION,
  localstackEndpoint,
  publicLocalstackEndpoint,
} from "./config.js";

export const RESOURCE_CONFIG = {
  region: REGION,
  bucketName: BUCKET_NAME,
  tableName: TABLE_NAME,
};

function baseClientConfig(endpoint: string) {
  return {
    region: REGION,
    endpoint,
    credentials: {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID ?? "test",
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY ?? "test",
    },
  };
}

export const s3 = new S3Client({
  ...baseClientConfig(localstackEndpoint()),
  forcePathStyle: true,
});

// Used only for presigning URLs that must be reachable from the user's browser.
export const s3Public = new S3Client({
  ...baseClientConfig(publicLocalstackEndpoint()),
  forcePathStyle: true,
});

const dynamodb = new DynamoDBClient(baseClientConfig(localstackEndpoint()));
export const ddb = DynamoDBDocumentClient.from(dynamodb, {
  marshallOptions: { removeUndefinedValues: true },
});
