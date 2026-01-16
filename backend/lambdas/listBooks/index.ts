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
    const limitParam = event.queryStringParameters?.limit;
    const q = (event.queryStringParameters?.q ?? "").trim().toLowerCase();
    const genre = (event.queryStringParameters?.genre ?? "")
      .trim()
      .toLowerCase();

    const limit = limitParam
      ? Math.max(1, Math.min(100, Number(limitParam)))
      : undefined;

    const lastKeyStr = event.queryStringParameters?.lastKey ?? "";
    const exclusiveStartKey = lastKeyStr ? JSON.parse(lastKeyStr) : undefined;

    const res = await ddb.send(
      new ScanCommand({
        TableName: RESOURCE_CONFIG.tableName,
        Limit: limit,
        ExclusiveStartKey: exclusiveStartKey,
      })
    );

    let items = (res.Items ?? []) as BookItem[];
    if (q) {
      items = items.filter((it) => {
        const text = `${it.title} ${it.author} ${it.genre ?? ""}`.toLowerCase();
        return text.includes(q);
      });
    }
    if (genre) {
      items = items.filter((it) => (it.genre ?? "").toLowerCase() === genre);
    }

    items.sort((a, b) => (a.uploadedAt < b.uploadedAt ? 1 : -1));

    return json(200, { items, lastKey: res.LastEvaluatedKey ?? null });
  } catch (err) {
    console.error("listBooks error", err);
    return error(500, "Failed to list books");
  }
};
