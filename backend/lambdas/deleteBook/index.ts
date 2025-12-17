import type { APIGatewayProxyHandler } from "aws-lambda";
import { DeleteObjectCommand } from "@aws-sdk/client-s3";
import { DeleteCommand, GetCommand } from "@aws-sdk/lib-dynamodb";
import { requireAuth } from "../../shared/auth.js";
import { getHttpMethod, getRequestId } from "../../shared/apigw.js";
import { ddb, RESOURCE_CONFIG, s3 } from "../../shared/aws.js";
import { error, json, noContent } from "../../shared/http.js";
import type { BookItem } from "../../shared/types.js";

export const handler: APIGatewayProxyHandler = async (event) => {
  console.log("deleteBook request", {
    requestId: getRequestId(event),
  });

  if ((getHttpMethod(event) ?? "").toUpperCase() === "OPTIONS") {
    return json(200, { ok: true });
  }

  let auth;
  try {
    auth = requireAuth(event.headers);
  } catch (e) {
    const statusCode = (e as any)?.statusCode;
    if (statusCode === 401) return error(401, (e as Error).message);
    return error(401, "Unauthorized");
  }

  if (auth.role !== "admin")
    return error(403, "Forbidden: admin role required");

  const bookId = event.pathParameters?.bookId;
  if (!bookId) return error(400, "Missing bookId");

  try {
    const get = await ddb.send(
      new GetCommand({
        TableName: RESOURCE_CONFIG.tableName,
        Key: { bookId },
      })
    );

    const item = get.Item as BookItem | undefined;
    if (!item) return error(404, "Book not found");

    await s3.send(
      new DeleteObjectCommand({
        Bucket: RESOURCE_CONFIG.bucketName,
        Key: item.s3Key,
      })
    );

    await ddb.send(
      new DeleteCommand({
        TableName: RESOURCE_CONFIG.tableName,
        Key: { bookId },
      })
    );

    console.log("deleteBook success", { bookId });
    return noContent();
  } catch (err) {
    console.error("deleteBook error", err);
    return error(500, "Failed to delete book");
  }
};
