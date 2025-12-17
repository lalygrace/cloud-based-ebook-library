import type { APIGatewayProxyHandler } from "aws-lambda";
import { GetCommand } from "@aws-sdk/lib-dynamodb";
import { z } from "zod";

import { signToken, verifyPassword } from "../../shared/auth.js";
import { getHttpMethod, getRequestId } from "../../shared/apigw.js";
import { ddb } from "../../shared/aws.js";
import { error, json, parseJsonBody } from "../../shared/http.js";
import { USERS_TABLE_NAME } from "../../shared/config.js";
import type { UserItem } from "../../shared/types.js";

const LoginSchema = z.object({
  email: z.string().email().max(320),
  password: z.string().min(1).max(200),
});

export const handler: APIGatewayProxyHandler = async (event) => {
  console.log("login request", { requestId: getRequestId(event) });

  if ((getHttpMethod(event) ?? "").toUpperCase() === "OPTIONS") {
    return json(200, { ok: true });
  }

  const parsed = parseJsonBody<unknown>(event.body ?? null);
  if (!parsed.ok) return error(400, parsed.message);

  const validated = LoginSchema.safeParse(parsed.value);
  if (!validated.success)
    return error(400, "Validation failed", validated.error.flatten());

  const email = validated.data.email.trim().toLowerCase();

  try {
    const res = await ddb.send(
      new GetCommand({
        TableName: USERS_TABLE_NAME,
        Key: { email },
      })
    );

    const item = res.Item as UserItem | undefined;
    if (!item) return error(401, "Invalid email or password");

    const ok = await verifyPassword(validated.data.password, item.passwordHash);
    if (!ok) return error(401, "Invalid email or password");

    const token = signToken({
      sub: item.userId,
      email: item.email,
      name: item.name,
      role: item.role,
    });

    return json(200, {
      token,
      user: {
        userId: item.userId,
        email: item.email,
        name: item.name,
        role: item.role,
        createdAt: item.createdAt,
      },
    });
  } catch (err) {
    console.error("login error", err);
    return error(500, "Failed to login");
  }
};
