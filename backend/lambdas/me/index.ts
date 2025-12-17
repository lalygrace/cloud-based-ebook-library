import type { APIGatewayProxyHandler } from "aws-lambda";

import { requireAuth } from "../../shared/auth.js";
import { getHttpMethod, getRequestId } from "../../shared/apigw.js";
import { error, json } from "../../shared/http.js";

export const handler: APIGatewayProxyHandler = async (event) => {
  console.log("me request", { requestId: getRequestId(event) });

  if ((getHttpMethod(event) ?? "").toUpperCase() === "OPTIONS") {
    return json(200, { ok: true });
  }

  try {
    const auth = requireAuth(event.headers);
    return json(200, {
      user: {
        userId: auth.sub,
        email: auth.email,
        name: auth.name,
        role: auth.role,
      },
    });
  } catch (e) {
    const statusCode = (e as any)?.statusCode;
    if (statusCode === 401) return error(401, (e as Error).message);
    return error(401, "Unauthorized");
  }
};
