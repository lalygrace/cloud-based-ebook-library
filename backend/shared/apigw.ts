export function getHttpMethod(event: any): string | undefined {
  return (
    event?.requestContext?.http?.method ??
    event?.httpMethod ??
    event?.requestContext?.httpMethod
  );
}

export function getRequestId(event: any): string | undefined {
  return event?.requestContext?.requestId;
}
