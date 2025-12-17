import type { APIGatewayProxyHandlerV2 } from "aws-lambda";
import { ScanCommand } from "@aws-sdk/lib-dynamodb";
import { ddb, RESOURCE_CONFIG } from "../../shared/aws.js";
import { error, json } from "../../shared/http.js";
import type { BookItem } from "../../shared/types.js";

export const handler: APIGatewayProxyHandlerV2 = async (event) => {
  console.log("listBooks request", {
    requestId: event.requestContext.requestId,
  });

  if (event.requestContext.http.method === "OPTIONS") {
    return json(200, { ok: true });
  }

  try {
    const res = await ddb.send(
      new ScanCommand({
        TableName: RESOURCE_CONFIG.tableName,
      })
    );

    const items = (res.Items ?? []) as BookItem[];
    items.sort((a, b) => (a.uploadedAt < b.uploadedAt ? 1 : -1));

    return json(200, { items });
  } catch (err) {
    console.error("listBooks error", err);
    return error(500, "Failed to list books");
  }
};
