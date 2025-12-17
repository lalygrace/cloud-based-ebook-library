import type { APIGatewayProxyHandler } from "aws-lambda";
import { ScanCommand } from "@aws-sdk/lib-dynamodb";
import { requireAuth } from "../../shared/auth.js";
import { ddb, RESOURCE_CONFIG } from "../../shared/aws.js";
import { getHttpMethod, getRequestId } from "../../shared/apigw.js";
import { error, json } from "../../shared/http.js";
import type { BookItem } from "../../shared/types.js";

export const handler: APIGatewayProxyHandler = async (event) => {
  console.log("listBooks request", {
    requestId: getRequestId(event),
  });

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
