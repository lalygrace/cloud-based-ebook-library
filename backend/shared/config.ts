export const REGION = process.env.AWS_REGION ?? "us-east-1";
export const TABLE_NAME = process.env.TABLE_NAME ?? "EBookLibraryBooks";
export const USERS_TABLE_NAME =
  process.env.USERS_TABLE_NAME ?? "EBookLibraryUsers";
export const BUCKET_NAME = process.env.BUCKET_NAME ?? "ebook-library-files";
export const PRESIGN_EXPIRES_SECONDS = Number(
  process.env.PRESIGN_EXPIRES_SECONDS ?? 300
);

export const JWT_SECRET =
  process.env.JWT_SECRET ?? "local-dev-insecure-secret-change-me";

export function localstackEndpoint(): string {
  const host =
    process.env.LOCALSTACK_HOSTNAME ??
    process.env.AWS_ENDPOINT_HOST ??
    "localhost";
  const port = process.env.AWS_ENDPOINT_PORT ?? "4566";
  return `http://${host}:${port}`;
}

export function publicLocalstackEndpoint(): string {
  const host = process.env.PUBLIC_AWS_ENDPOINT_HOST ?? "localhost";
  const port = process.env.PUBLIC_AWS_ENDPOINT_PORT ?? "4566";
  return `http://${host}:${port}`;
}
