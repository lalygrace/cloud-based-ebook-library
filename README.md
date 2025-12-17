# Cloud-Based E‑Book Library (LocalStack + Next.js)

A simple but professional, teacher-friendly serverless e‑book library:

- **Next.js (TypeScript)** frontend
- **API Gateway → Lambda → S3/DynamoDB** backend
- **Pre‑signed URLs** for secure downloads
- **Role simulation** for deletes (`x-role: admin`)
- **LocalStack Docker** with **persistent state** (survives restarts)

## 0) Prerequisites

- Node.js 20+ (you have Node 22)
- `pnpm`
- Docker Desktop

## 1) Install dependencies

Frontend:

```bash
cd frontend
pnpm install
```

Backend:

```bash
cd backend
pnpm install
```

## 2) Build Lambda artifacts

We build each Lambda into a zip in `infra/localstack/artifacts/`.

```bash
cd backend
pnpm build
```

## 3) Start LocalStack (persistent)

`docker-compose.yml` mounts `infra/localstack/state` into the container.
That’s what makes **S3 buckets, DynamoDB tables, API Gateway config, etc. non‑volatile**.

```bash
cd ..
docker compose up -d
```

LocalStack runs init scripts in `infra/localstack/init/ready.d/`.
The script will:

- create S3 bucket + DynamoDB table
- create an IAM role + least-priv policy (demo)
- create/update Lambda functions from `infra/localstack/artifacts/*.zip`
- create API Gateway REST API routes and deploy a `local` stage

## 4) Write the frontend API base URL

The provisioning script saves the discovered API base URL into:

- `infra/localstack/state/ebook-library.env`

Use the helper script to write `frontend/.env.local`:

```bash
./scripts/localstack-api-env.sh
```

## 5) Run the frontend

```bash
cd frontend
pnpm dev
```

Open http://localhost:3000

## API Endpoints

Base: `NEXT_PUBLIC_API_BASE_URL`

- `POST /books` → upload book
- `GET /books` → list books
- `GET /books/{bookId}` → get metadata + presigned URL
- `DELETE /books/{bookId}` → delete (requires header `x-role: admin`)

## Data Flow

1. **Upload**: UI reads file → base64 → `POST /books` → Lambda stores file in S3 and metadata in DynamoDB.
2. **List**: UI calls `GET /books` → returns metadata list.
3. **Download**: UI calls `GET /books/{id}` → Lambda returns a **pre‑signed S3 URL** → browser downloads.
4. **Delete (admin)**: UI calls `DELETE /books/{id}` with `x-role: admin` → Lambda deletes S3 object + DynamoDB item.

## AWS Best Practices (as demonstrated)

- **API Gateway as the only public interface** (frontend does not call S3/DDB directly)
- **Stateless Lambdas**: all state in S3/DynamoDB
- **Least privilege IAM** for Lambda (scoped S3 and table access)
- **Pre‑signed URLs**: secure downloads without exposing bucket policy
- **Structured logging** (console logs simulate CloudWatch logs)

## Later: Deploy to real AWS

This layout maps cleanly to AWS:

- replace LocalStack endpoint with real AWS endpoint (remove custom endpoint config)
- use real IAM roles/policies
- deploy API Gateway + Lambdas via CDK/SAM/Terraform
