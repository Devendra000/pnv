import { NextResponse } from "next/server"
import { writeFile } from "fs/promises"
import path from "path"
import { auth } from "@/auth"
import crypto from "crypto"

export async function POST(req: Request) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const formData = await req.formData()
    const file = formData.get("file") as File | null

    if (!file) {
      return NextResponse.json({ error: "No file uploaded" }, { status: 400 })
    }

    // Validate size (5MB)
    if (file.size > 5 * 1024 * 1024) {
      return NextResponse.json({ error: "File exceeds 5MB limit" }, { status: 400 })
    }

    // Validate type
    if (!file.type.startsWith("image/")) {
      return NextResponse.json({ error: "Only image files are allowed" }, { status: 400 })
    }

    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)

    const uniqueSuffix = crypto.randomBytes(8).toString("hex")
    const originalName = file.name.replace(/[^a-zA-Z0-9.-]/g, "_")
    const filename = `${uniqueSuffix}-${originalName}`
    
    // Determine folder
    const requestedFolder = formData.get("folder") as string || "misc"
    // Sanitize folder to prevent directory traversal
    const safeFolder = requestedFolder.replace(/[^a-zA-Z0-9_-]/g, "")
    
    // Save to public/uploads/[folder]
    const dirPath = path.join(process.cwd(), "public/uploads", safeFolder)
    
    // Use fs/promises mkdir to ensure directory exists
    const fs = await import("fs/promises")
    await fs.mkdir(dirPath, { recursive: true })
    
    const filepath = path.join(dirPath, filename)
    await writeFile(filepath, buffer)

    return NextResponse.json({ url: `/uploads/${safeFolder}/${filename}` })
  } catch (error) {
    console.error("Upload error:", error)
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
  }
}
