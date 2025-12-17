import type { APIGatewayProxyHandler } from "aws-lambda";
import { GetCommand, PutCommand } from "@aws-sdk/lib-dynamodb";
import { randomUUID } from "node:crypto";
import { z } from "zod";

import { hashPassword, signToken } from "../../shared/auth.js";
import { getHttpMethod, getRequestId } from "../../shared/apigw.js";
import { ddb } from "../../shared/aws.js";
import { error, json, parseJsonBody } from "../../shared/http.js";
import { ADMIN_EMAIL, USERS_TABLE_NAME } from "../../shared/config.js";
import type { UserItem } from "../../shared/types.js";

const SignupSchema = z.object({
  email: z.string().email().max(320),
  name: z.string().min(1).max(200),
  password: z.string().min(8).max(200),
});

export const handler: APIGatewayProxyHandler = async (event) => {
  console.log("signup request", { requestId: getRequestId(event) });

  if ((getHttpMethod(event) ?? "").toUpperCase() === "OPTIONS") {
    return json(200, { ok: true });
  }

  const parsed = parseJsonBody<unknown>(event.body ?? null);
  if (!parsed.ok) return error(400, parsed.message);

  const validated = SignupSchema.safeParse(parsed.value);
  if (!validated.success)
    return error(400, "Validation failed", validated.error.flatten());

  const email = validated.data.email.trim().toLowerCase();
  const name = validated.data.name.trim();

  try {
    const existing = await ddb.send(
      new GetCommand({
        TableName: USERS_TABLE_NAME,
        Key: { email },
      })
    );
    if (existing.Item) return error(409, "Email already registered");

    const userId = randomUUID();
    const createdAt = new Date().toISOString();
    const passwordHash = await hashPassword(validated.data.password);

    const item: UserItem = {
      userId,
      email,
      name,
      role: email === ADMIN_EMAIL ? "admin" : "user",
      passwordHash,
      createdAt,
    };

    await ddb.send(
      new PutCommand({
        TableName: USERS_TABLE_NAME,
        Item: item,
      })
    );

    const token = signToken({
      sub: userId,
      email,
      name,
      role: item.role,
    });

    return json(201, {
      token,
      user: { userId, email, name, role: item.role, createdAt },
    });
  } catch (err) {
    console.error("signup error", err);
    return error(500, "Failed to sign up");
  }
};
