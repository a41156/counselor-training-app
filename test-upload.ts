import { v2 as cloudinary } from "cloudinary"

cloudinary.config({
  cloud_name: "dnq72ogtq",
  api_key: "542417249941929",
  api_secret: "IouN5UVEolrd_gZE-VzYMVBzm_0",
  secure: true,
})

async function testUpload() {
  console.log("Testing Cloudinary upload...")

  const testBuffer = Buffer.from("Hello World - test file")
  const base64 = testBuffer.toString("base64")
  const dataUri = `data:text/plain;base64,${base64}`

  try {
    const result = await cloudinary.uploader.upload(dataUri, {
      resource_type: "auto",
      folder: "counselor-training-test",
    })
    console.log("✅ Upload success!")
    console.log("URL:", result.secure_url)
  } catch (error) {
    console.error("❌ Upload failed:", error)
  }
}

testUpload()