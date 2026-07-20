import { writeFile } from "fs/promises";
import path from "path";

const UPLOAD_ROOT = path.join(process.cwd(), "public", "uploads");

export async function saveFile(
  buffer: Buffer,
  subdir: "templates" | "generated",
  filename: string
): Promise<string> {
  const dir = path.join(UPLOAD_ROOT, subdir);
  const filePath = path.join(dir, filename);
  await writeFile(filePath, buffer);
  // Public URL path, since it's served from /public
  return `/uploads/${subdir}/${filename}`;
}
