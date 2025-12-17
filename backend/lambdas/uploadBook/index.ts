import type { APIGatewayProxyHandlerV2 } from "aws-lambda";
import { PutObjectCommand } from "@aws-sdk/client-s3";
import { PutCommand } from "@aws-sdk/lib-dynamodb";
import { randomUUID } from "node:crypto";
import { z } from "zod";
import { ddb, RESOURCE_CONFIG, s3 } from "../../shared/aws.js";
import { error, json, parseJsonBody } from "../../shared/http.js";
import { safeFileName } from "../../shared/sanitize.js";
import type { BookItem } from "../../shared/types.js";

const UploadSchema = z.object({
  title: z.string().min(1).max(200),
  author: z.string().min(1).max(200),
  genre: z.string().min(1).max(100).optional(),
  fileName: z.string().min(1).max(300),
  contentType: z.string().min(1).max(100),
  fileBase64: z.string().min(1),
});

const MAX_BYTES = 10 * 1024 * 1024; // demo-friendly limit

export const handler: APIGatewayProxyHandlerV2 = async (event) => {
  console.log("uploadBook request", {
    requestId: event.requestContext.requestId,
  });

  if (event.requestContext.http.method === "OPTIONS") {
    return json(200, { ok: true });
  }

  const parsed = parseJsonBody<unknown>(event.body ?? null);
  if (!parsed.ok) return error(400, parsed.message);

  const validated = UploadSchema.safeParse(parsed.value);
  if (!validated.success)
    return error(400, "Validation failed", validated.error.flatten());

  const { title, author, genre, fileName, contentType, fileBase64 } =
    validated.data;

  let bytes: Buffer;
  try {
    bytes = Buffer.from(fileBase64, "base64");
  } catch {
    return error(400, "fileBase64 must be valid base64");
  }

  if (!bytes.length) return error(400, "Empty file");
  if (bytes.length > MAX_BYTES)
    return error(413, `File too large (max ${MAX_BYTES} bytes for demo)`);

  const bookId = randomUUID();
  const safeName = safeFileName(fileName);
  const s3Key = `books/${bookId}/${safeName}`;
  const uploadedAt = new Date().toISOString();

  try {
    await s3.send(
      new PutObjectCommand({
        Bucket: RESOURCE_CONFIG.bucketName,
        Key: s3Key,
        Body: bytes,
        ContentType: contentType,
      })
    );

    const item: BookItem = {
      bookId,
      title,
      author,
      genre,
      s3Key,
      contentType,
      originalFileName: fileName,
      uploadedAt,
    };

    await ddb.send(
      new PutCommand({
        TableName: RESOURCE_CONFIG.tableName,
        Item: item,
      })
    );

    console.log("uploadBook success", { bookId, s3Key });
    return json(201, item);
  } catch (err) {
    console.error("uploadBook error", err);
    return error(500, "Failed to upload book");
  }
};
