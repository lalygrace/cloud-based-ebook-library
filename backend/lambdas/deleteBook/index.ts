import type { APIGatewayProxyHandlerV2 } from "aws-lambda";
import { DeleteObjectCommand } from "@aws-sdk/client-s3";
import { DeleteCommand, GetCommand } from "@aws-sdk/lib-dynamodb";
import { ddb, RESOURCE_CONFIG, s3 } from "../../shared/aws.js";
import { error, json, noContent } from "../../shared/http.js";
import type { BookItem } from "../../shared/types.js";

export const handler: APIGatewayProxyHandlerV2 = async (event) => {
  console.log("deleteBook request", {
    requestId: event.requestContext.requestId,
  });

  if (event.requestContext.http.method === "OPTIONS") {
    return json(200, { ok: true });
  }

  const role = (
    event.headers?.["x-role"] ??
    event.headers?.["X-Role"] ??
    ""
  ).toLowerCase();
  if (role !== "admin")
    return error(
      403,
      "Forbidden: admin role required (send header x-role: admin)"
    );

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
