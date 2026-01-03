#!/bin/bash

# Test Email Logging and Postmark Integration
# Usage: ./scripts/test-email-logging.sh [base-url] [service-role-key] [test-email]

BASE_URL="${1:-http://localhost:3000}"
SERVICE_ROLE_KEY="${2:-}"
TEST_EMAIL="${3:-test@example.com}"

if [ -z "$SERVICE_ROLE_KEY" ]; then
  echo "Error: Service role key required"
  echo ""
  echo "Usage: $0 [base-url] [service-role-key] [test-email]"
  echo ""
  echo "Get your service role key from:"
  echo "  - Supabase Dashboard → Settings → API → service_role secret"
  echo "  - Or from your .env.local file: SUPABASE_SERVICE_ROLE_KEY"
  echo ""
  echo "Example:"
  echo "  $0 http://localhost:3000 'your-service-role-key-here' test@example.com"
  echo ""
  exit 1
fi

echo "🧪 Testing Email Logging System"
echo "================================"
echo "Base URL: $BASE_URL"
echo "Test Email: $TEST_EMAIL"
echo ""

# Step 1: Send test email
echo "📧 Step 1: Sending test email..."
RESPONSE=$(curl -s -X POST "$BASE_URL/api/test/email-logging" \
  -H "X-Service-Role-Key: $SERVICE_ROLE_KEY" \
  -H "Content-Type: application/json" \
  -d "{\"email\": \"$TEST_EMAIL\"}")

echo "$RESPONSE" | jq '.'

SUCCESS=$(echo "$RESPONSE" | jq -r '.success // false')
MESSAGE_ID=$(echo "$RESPONSE" | jq -r '.logEntry.postmark_message_id // empty')

if [ "$SUCCESS" != "true" ]; then
  echo "❌ Failed to send test email"
  exit 1
fi

if [ -z "$MESSAGE_ID" ]; then
  echo "⚠️  Warning: No Postmark message ID found"
  echo "Continuing anyway..."
else
  echo "✅ Email sent successfully! Message ID: $MESSAGE_ID"
fi

echo ""
echo "⏳ Waiting 2 seconds for log to be created..."
sleep 2

# Step 2: Check email stats
echo ""
echo "📊 Step 2: Checking email stats..."
STATS_RESPONSE=$(curl -s "$BASE_URL/api/test/email-stats?limit=5" \
  -H "X-Service-Role-Key: $SERVICE_ROLE_KEY")

echo "$STATS_RESPONSE" | jq '.stats'

# Step 3: Simulate webhook events (if we have a message ID)
if [ -n "$MESSAGE_ID" ]; then
  echo ""
  echo "🪝 Step 3: Simulating Postmark webhook events..."
  
  # Simulate Open
  echo "  → Simulating 'Open' event..."
  OPEN_RESPONSE=$(curl -s -X POST "$BASE_URL/api/test/postmark-webhook" \
    -H "X-Service-Role-Key: $SERVICE_ROLE_KEY" \
    -H "Content-Type: application/json" \
    -d "{
      \"recordType\": \"Open\",
      \"messageId\": \"$MESSAGE_ID\",
      \"receivedAt\": \"$(date -u +%Y-%m-%dT%H:%M:%SZ)\"
    }")
  
  OPEN_SUCCESS=$(echo "$OPEN_RESPONSE" | jq -r '.success // false')
  if [ "$OPEN_SUCCESS" = "true" ]; then
    echo "  ✅ Open event processed"
  else
    echo "  ❌ Open event failed: $(echo "$OPEN_RESPONSE" | jq -r '.error // .message')"
  fi
  
  sleep 1
  
  # Simulate Click
  echo "  → Simulating 'Click' event..."
  CLICK_RESPONSE=$(curl -s -X POST "$BASE_URL/api/test/postmark-webhook" \
    -H "X-Service-Role-Key: $SERVICE_ROLE_KEY" \
    -H "Content-Type: application/json" \
    -d "{
      \"recordType\": \"Click\",
      \"messageId\": \"$MESSAGE_ID\",
      \"receivedAt\": \"$(date -u +%Y-%m-%dT%H:%M:%SZ)\"
    }")
  
  CLICK_SUCCESS=$(echo "$CLICK_RESPONSE" | jq -r '.success // false')
  if [ "$CLICK_SUCCESS" = "true" ]; then
    echo "  ✅ Click event processed"
  else
    echo "  ❌ Click event failed: $(echo "$CLICK_RESPONSE" | jq -r '.error // .message')"
  fi
else
  echo ""
  echo "⚠️  Skipping webhook simulation (no message ID)"
fi

# Step 4: Verify final stats
echo ""
echo "📊 Step 4: Verifying final stats..."
FINAL_STATS=$(curl -s "$BASE_URL/api/test/email-stats?limit=1" \
  -H "X-Service-Role-Key: $SERVICE_ROLE_KEY")

echo "$FINAL_STATS" | jq '.logs[0] | {
  recipient: .recipient,
  status: .status,
  opened_at: .opened_at,
  clicked_at: .clicked_at,
  postmark_message_id: .postmark_message_id
}'

echo ""
echo "✅ Test complete!"
echo ""
echo "Next steps:"
echo "1. Check your email inbox for the test email"
echo "2. Set up Postmark webhook in production"
echo "3. Run sync endpoint to backfill missing logs:"
echo "   curl -X POST $BASE_URL/api/admin/sync-postmark-stats \\"
echo "     -H 'X-Service-Role-Key: $SERVICE_ROLE_KEY' \\"
echo "     -H 'Content-Type: application/json' \\"
echo "     -d '{\"days\": 30, \"backfillMissing\": true}'"

