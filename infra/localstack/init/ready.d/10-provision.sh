#!/usr/bin/env bash
set -euo pipefail

REGION="${AWS_DEFAULT_REGION:-us-east-1}"
ACCOUNT_ID="000000000000"

BUCKET_NAME="${BUCKET_NAME:-ebook-library-files}"
TABLE_NAME="${TABLE_NAME:-EBookLibraryBooks}"
USERS_TABLE_NAME="${USERS_TABLE_NAME:-EBookLibraryUsers}"
API_NAME="${API_NAME:-EBookLibraryApi}"
STAGE_NAME="${STAGE_NAME:-local}"

ROLE_NAME="${ROLE_NAME:-ebook-library-lambda-role}"
POLICY_NAME="${POLICY_NAME:-ebook-library-lambda-policy}"
JWT_SECRET="${JWT_SECRET:-local-dev-insecure-secret-change-me}"
ADMIN_EMAIL="${ADMIN_EMAIL:-admin@local.test}"

function log() {
  echo "[provision] $*"
}

function ensure_bucket() {
  if awslocal s3api head-bucket --bucket "$BUCKET_NAME" >/dev/null 2>&1; then
    log "S3 bucket exists: $BUCKET_NAME"
  else
    log "Creating S3 bucket: $BUCKET_NAME"
    awslocal s3api create-bucket --bucket "$BUCKET_NAME" --region "$REGION" >/dev/null
  fi
}

function ensure_table() {
  if awslocal dynamodb describe-table --table-name "$TABLE_NAME" >/dev/null 2>&1; then
    log "DynamoDB table exists: $TABLE_NAME"
  else
    log "Creating DynamoDB table: $TABLE_NAME"
    awslocal dynamodb create-table \
      --table-name "$TABLE_NAME" \
      --attribute-definitions AttributeName=bookId,AttributeType=S \
      --key-schema AttributeName=bookId,KeyType=HASH \
      --billing-mode PAY_PER_REQUEST \
      --region "$REGION" >/dev/null
  fi
}

function ensure_users_table() {
  if awslocal dynamodb describe-table --table-name "$USERS_TABLE_NAME" >/dev/null 2>&1; then
    log "DynamoDB users table exists: $USERS_TABLE_NAME"
  else
    log "Creating DynamoDB users table: $USERS_TABLE_NAME"
    awslocal dynamodb create-table \
      --table-name "$USERS_TABLE_NAME" \
      --attribute-definitions AttributeName=email,AttributeType=S \
      --key-schema AttributeName=email,KeyType=HASH \
      --billing-mode PAY_PER_REQUEST \
      --region "$REGION" >/dev/null
  fi
}

function ensure_role() {
  if awslocal iam get-role --role-name "$ROLE_NAME" >/dev/null 2>&1; then
    log "IAM role exists: $ROLE_NAME"
  else
    log "Creating IAM role: $ROLE_NAME"
    cat > /tmp/trust.json <<'JSON'
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": { "Service": "lambda.amazonaws.com" },
      "Action": "sts:AssumeRole"
    }
  ]
}
JSON
    awslocal iam create-role --role-name "$ROLE_NAME" --assume-role-policy-document file:///tmp/trust.json >/dev/null
  fi

  # Inline policy: least privilege for this demo.
  cat > /tmp/policy.json <<JSON
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": ["s3:PutObject","s3:GetObject","s3:DeleteObject"],
      "Resource": "arn:aws:s3:::$BUCKET_NAME/*"
    },
    {
      "Effect": "Allow",
      "Action": ["dynamodb:PutItem","dynamodb:GetItem","dynamodb:Scan","dynamodb:DeleteItem"],
      "Resource": "arn:aws:dynamodb:$REGION:$ACCOUNT_ID:table/$TABLE_NAME"
    },
    {
      "Effect": "Allow",
      "Action": ["logs:CreateLogGroup","logs:CreateLogStream","logs:PutLogEvents"],
      "Resource": "*"
    }
  ]
}
JSON

  awslocal iam put-role-policy \
    --role-name "$ROLE_NAME" \
    --policy-name "$POLICY_NAME" \
    --policy-document file:///tmp/policy.json >/dev/null

  ROLE_ARN="arn:aws:iam::$ACCOUNT_ID:role/$ROLE_NAME"
}

function ensure_lambda() {
  local fn="$1"
  local zip="/artifacts/${fn}.zip"

  if [[ ! -f "$zip" ]]; then
    log "ERROR: Missing lambda artifact: $zip"
    log "Build backend first: (host) cd backend && pnpm install && pnpm build"
    exit 1
  fi

  local lambda_env
  lambda_env="Variables={BUCKET_NAME=$BUCKET_NAME,TABLE_NAME=$TABLE_NAME,USERS_TABLE_NAME=$USERS_TABLE_NAME,JWT_SECRET=$JWT_SECRET,ADMIN_EMAIL=$ADMIN_EMAIL,AWS_ENDPOINT_HOST=localstack,AWS_ENDPOINT_PORT=4566,PUBLIC_AWS_ENDPOINT_HOST=localhost,PUBLIC_AWS_ENDPOINT_PORT=4566,PRESIGN_EXPIRES_SECONDS=300}"

  if awslocal lambda get-function --function-name "$fn" >/dev/null 2>&1; then
    log "Updating Lambda code: $fn"
    awslocal lambda update-function-code --function-name "$fn" --zip-file "fileb://${zip}" >/dev/null

    # Keep env vars in sync across updates
    awslocal lambda update-function-configuration --function-name "$fn" --environment "$lambda_env" >/dev/null
  else
    log "Creating Lambda: $fn"
    awslocal lambda create-function \
      --function-name "$fn" \
      --runtime nodejs20.x \
      --handler index.handler \
      --timeout 30 \
      --memory-size 256 \
      --role "$ROLE_ARN" \
      --zip-file "fileb://${zip}" \
      --environment "$lambda_env" >/dev/null
  fi
}

function ensure_api() {
  local api_id
  api_id=$(awslocal apigateway get-rest-apis --query "items[?name=='$API_NAME'].id | [0]" --output text)
  if [[ "$api_id" == "None" || -z "$api_id" ]]; then
    log "Creating API Gateway REST API: $API_NAME"
    api_id=$(awslocal apigateway create-rest-api --name "$API_NAME" --query id --output text)
  else
    log "API Gateway REST API exists: $API_NAME ($api_id)"
  fi

  local root_id
  root_id=$(awslocal apigateway get-resources --rest-api-id "$api_id" --query "items[?path=='/'].id | [0]" --output text)

  # /books
  local books_id
  books_id=$(awslocal apigateway get-resources --rest-api-id "$api_id" --query "items[?path=='/books'].id | [0]" --output text)
  if [[ "$books_id" == "None" || -z "$books_id" ]]; then
    books_id=$(awslocal apigateway create-resource --rest-api-id "$api_id" --parent-id "$root_id" --path-part "books" --query id --output text)
  fi

  # /books/{bookId}
  local book_id
  book_id=$(awslocal apigateway get-resources --rest-api-id "$api_id" --query "items[?path=='/books/{bookId}'].id | [0]" --output text)
  if [[ "$book_id" == "None" || -z "$book_id" ]]; then
    book_id=$(awslocal apigateway create-resource --rest-api-id "$api_id" --parent-id "$books_id" --path-part "{bookId}" --query id --output text)
  fi

  # /auth
  local auth_id
  auth_id=$(awslocal apigateway get-resources --rest-api-id "$api_id" --query "items[?path=='/auth'].id | [0]" --output text)
  if [[ "$auth_id" == "None" || -z "$auth_id" ]]; then
    auth_id=$(awslocal apigateway create-resource --rest-api-id "$api_id" --parent-id "$root_id" --path-part "auth" --query id --output text)
  fi

  # /auth/signup
  local auth_signup_id
  auth_signup_id=$(awslocal apigateway get-resources --rest-api-id "$api_id" --query "items[?path=='/auth/signup'].id | [0]" --output text)
  if [[ "$auth_signup_id" == "None" || -z "$auth_signup_id" ]]; then
    auth_signup_id=$(awslocal apigateway create-resource --rest-api-id "$api_id" --parent-id "$auth_id" --path-part "signup" --query id --output text)
  fi

  # /auth/login
  local auth_login_id
  auth_login_id=$(awslocal apigateway get-resources --rest-api-id "$api_id" --query "items[?path=='/auth/login'].id | [0]" --output text)
  if [[ "$auth_login_id" == "None" || -z "$auth_login_id" ]]; then
    auth_login_id=$(awslocal apigateway create-resource --rest-api-id "$api_id" --parent-id "$auth_id" --path-part "login" --query id --output text)
  fi

  # /auth/me
  local auth_me_id
  auth_me_id=$(awslocal apigateway get-resources --rest-api-id "$api_id" --query "items[?path=='/auth/me'].id | [0]" --output text)
  if [[ "$auth_me_id" == "None" || -z "$auth_me_id" ]]; then
    auth_me_id=$(awslocal apigateway create-resource --rest-api-id "$api_id" --parent-id "$auth_id" --path-part "me" --query id --output text)
  fi

  local lambda_uri_base="arn:aws:apigateway:$REGION:lambda:path/2015-03-31/functions"

  function add_lambda_integration() {
    local resource_id="$1"
    local method="$2"
    local fn="$3"

    # method (idempotent)
    awslocal apigateway put-method --rest-api-id "$api_id" --resource-id "$resource_id" --http-method "$method" --authorization-type "NONE" >/dev/null 2>&1 || true

    local fn_arn="arn:aws:lambda:$REGION:$ACCOUNT_ID:function:$fn"
    awslocal apigateway put-integration \
      --rest-api-id "$api_id" \
      --resource-id "$resource_id" \
      --http-method "$method" \
      --type AWS_PROXY \
      --integration-http-method POST \
      --uri "$lambda_uri_base/$fn_arn/invocations" >/dev/null

    awslocal lambda add-permission \
      --function-name "$fn" \
      --statement-id "apigw-${api_id}-${resource_id}-${method}-${fn}" \
      --action lambda:InvokeFunction \
      --principal apigateway.amazonaws.com \
      --source-arn "arn:aws:execute-api:$REGION:$ACCOUNT_ID:$api_id/*/*/*" >/dev/null 2>&1 || true
  }

  function add_cors_options() {
    local resource_id="$1"
    awslocal apigateway put-method --rest-api-id "$api_id" --resource-id "$resource_id" --http-method OPTIONS --authorization-type NONE >/dev/null 2>&1 || true

    awslocal apigateway put-integration --rest-api-id "$api_id" --resource-id "$resource_id" --http-method OPTIONS --type MOCK --request-templates '{"application/json":"{\"statusCode\": 200}"}' >/dev/null 2>&1 || true

    awslocal apigateway put-method-response \
      --rest-api-id "$api_id" \
      --resource-id "$resource_id" \
      --http-method OPTIONS \
      --status-code 200 \
      --response-parameters '{"method.response.header.Access-Control-Allow-Headers":true,"method.response.header.Access-Control-Allow-Methods":true,"method.response.header.Access-Control-Allow-Origin":true}' >/dev/null 2>&1 || true

    awslocal apigateway put-integration-response \
      --rest-api-id "$api_id" \
      --resource-id "$resource_id" \
      --http-method OPTIONS \
      --status-code 200 \
      --response-parameters '{"method.response.header.Access-Control-Allow-Headers":"\"Content-Type,Authorization\"","method.response.header.Access-Control-Allow-Methods":"\"GET,POST,DELETE,OPTIONS\"","method.response.header.Access-Control-Allow-Origin":"\"*\""}' >/dev/null 2>&1 || true
  }

  add_lambda_integration "$books_id" GET listBooks
  add_lambda_integration "$books_id" POST uploadBook
  add_lambda_integration "$book_id" GET getBook
  add_lambda_integration "$book_id" DELETE deleteBook

  add_lambda_integration "$auth_signup_id" POST signup
  add_lambda_integration "$auth_login_id" POST login
  add_lambda_integration "$auth_me_id" GET me

  add_cors_options "$books_id"
  add_cors_options "$book_id"
  add_cors_options "$auth_signup_id"
  add_cors_options "$auth_login_id"
  add_cors_options "$auth_me_id"

  # deploy
  awslocal apigateway create-deployment --rest-api-id "$api_id" --stage-name "$STAGE_NAME" >/dev/null

  log "API base URL (use in frontend): http://localhost:4566/restapis/$api_id/$STAGE_NAME/_user_request_"

  # Save for convenience inside the persisted state volume
  echo "API_ID=$api_id" > /var/lib/localstack/ebook-library.env
  echo "API_BASE_URL=http://localhost:4566/restapis/$api_id/$STAGE_NAME/_user_request_" >> /var/lib/localstack/ebook-library.env
}

log "Provisioning LocalStack resources (persistent volume enabled)"
ensure_bucket
ensure_table
ensure_users_table
ensure_role
ensure_lambda uploadBook
ensure_lambda listBooks
ensure_lambda getBook
ensure_lambda deleteBook
ensure_lambda signup
ensure_lambda login
ensure_lambda me
ensure_api
log "Provisioning complete"
