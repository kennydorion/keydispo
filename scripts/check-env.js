// Simple check to fail CI if required VITE_* secrets are missing
const required = [
  'VITE_FB_API_KEY',
  'VITE_FB_AUTH_DOMAIN',
  'VITE_FB_PROJECT_ID',
  'VITE_FB_STORAGE_BUCKET',
  'VITE_FB_MESSAGING_SENDER_ID',
  'VITE_FB_APP_ID'
]

const missing = required.filter((k) => !process.env[k] || String(process.env[k]).trim() === '')

if (missing.length) {
  console.error('\n❌ Missing required environment variables for production build:', missing)
  console.error('→ Define them as GitHub Actions secrets with the exact names above.')
  process.exit(1)
} else {
  console.log('✅ All required VITE_* env vars present for production build.')
}
