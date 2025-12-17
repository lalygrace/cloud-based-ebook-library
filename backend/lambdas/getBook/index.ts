import type { APIGatewayProxyHandlerV2 } from "aws-lambda";
import { GetCommand } from "@aws-sdk/lib-dynamodb";
import { GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { ddb, RESOURCE_CONFIG, s3 } from "../../shared/aws.js";
import { error, json } from "../../shared/http.js";
import { PRESIGN_EXPIRES_SECONDS } from "../../shared/config.js";
import type { BookItem } from "../../shared/types.js";

export const handler: APIGatewayProxyHandlerV2 = async (event) => {
  console.log("getBook request", { requestId: event.requestContext.requestId });

  if (event.requestContext.http.method === "OPTIONS") {
    return json(200, { ok: true });
  }

  const bookId = event.pathParameters?.bookId;
  if (!bookId) return error(400, "Missing bookId");

  try {
    const res = await ddb.send(
      new GetCommand({
        TableName: RESOURCE_CONFIG.tableName,
        Key: { bookId },
      })
    );

    const item = res.Item as BookItem | undefined;
    if (!item) return error(404, "Book not found");

    const url = await getSignedUrl(
      s3,
      new GetObjectCommand({
        Bucket: RESOURCE_CONFIG.bucketName,
        Key: item.s3Key,
        ResponseContentType: item.contentType,
        ResponseContentDisposition: `attachment; filename=\"${item.originalFileName.replace(
          /\"/g,
          ""
        )}\"`,
      }),
      { expiresIn: PRESIGN_EXPIRES_SECONDS }
    );

    return json(200, { item, url, expiresInSeconds: PRESIGN_EXPIRES_SECONDS });
  } catch (err) {
    console.error("getBook error", err);
    return error(500, "Failed to get book");
  }
};
