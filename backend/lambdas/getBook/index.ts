import type { APIGatewayProxyHandler } from "aws-lambda";
import { GetCommand } from "@aws-sdk/lib-dynamodb";
import { GetObjectCommand, HeadObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { requireAuth } from "../../shared/auth.js";
import { getHttpMethod, getRequestId } from "../../shared/apigw.js";
import { ddb, RESOURCE_CONFIG, s3Public } from "../../shared/aws.js";
import { error, json } from "../../shared/http.js";
import { PRESIGN_EXPIRES_SECONDS } from "../../shared/config.js";
import type { BookItem } from "../../shared/types.js";

export const handler: APIGatewayProxyHandler = async (event) => {
  console.log("getBook request", { requestId: getRequestId(event) });

  if ((getHttpMethod(event) ?? "").toUpperCase() === "OPTIONS") {
    return json(200, { ok: true });
  }

  try {
    requireAuth(event.headers);
  } catch (e) {
    const statusCode = (e as any)?.statusCode;
    if (statusCode === 401) return error(401, (e as Error).message);
    return error(401, "Unauthorized");
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

    // Verify object exists to avoid broken presigned URLs
    try {
      await s3Public.send(
        new HeadObjectCommand({
          Bucket: RESOURCE_CONFIG.bucketName,
          Key: item.s3Key,
        })
      );
    } catch (e) {
      const code = (e as any)?.$metadata?.httpStatusCode;
      if (code === 404)
        return error(410, "File missing in storage. Please re-upload.");
      throw e;
    }

    const url = await getSignedUrl(
      s3Public,
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
