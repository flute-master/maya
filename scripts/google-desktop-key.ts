import {
  placeServiceAccountOnDesktop,
  readServiceAccount,
} from "../lib/google/auth"

async function main() {
  const key = await readServiceAccount()
  if (!key) {
    console.error(
      "No service-account key loaded. Upload it in Customize, or put maya-google-service-account.json on your Desktop."
    )
    process.exit(1)
  }
  const placed = await placeServiceAccountOnDesktop(key)
  console.log(`Loaded ${placed.email}`)
  for (const path of placed.written) {
    console.log(`Desktop copy: ${path}`)
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error)
  process.exit(1)
})
