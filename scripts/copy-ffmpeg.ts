// This script copies the @ffmpeg/core-mt files to the public directory
// so that they can be served by the Vite server.

import * as fs from "fs/promises";
import * as path from "path";

async function copyFFmpegFiles(core: string) {
  const sourceDir = path.join(
    __dirname,
    "..",
    "node_modules",
    "@ffmpeg",
    core,
    "dist",
    "esm",
  );
  const publicDir = path.join(__dirname, "..", "public", core);

  try {
    // Ensure the source directory exists
    await fs.access(sourceDir);

    // Create the public directory if it doesn't exist
    try {
      await fs.access(publicDir);
    } catch (error) {
      if (error.code === "ENOENT") {
        await fs.mkdir(publicDir, { recursive: true }); // recursive: true creates parent directories if needed
        console.log(`Created directory: ${publicDir}`);
      } else {
        throw error; // Re-throw other errors
      }
    }

    // Read files from the source directory
    const files = await fs.readdir(sourceDir);

    for (const file of files) {
      const sourceFile = path.join(sourceDir, file);
      const publicFile = path.join(publicDir, file);

      try {
        const stat = await fs.stat(sourceFile);
        if (stat.isFile()) {
          await fs.copyFile(sourceFile, publicFile);
          console.log(`Copied: ${file} to public`);
        } else {
          console.log(`Skipping directory/non-file: ${file}`);
        }
      } catch (error) {
        console.error(`Error processing file ${file}:`, error);
      }
    }

    console.log("File copying completed.");
  } catch (error) {
    if (error.code === "ENOENT" && error.path === sourceDir) {
      console.error(
        `Source directory not found: ${sourceDir}. Make sure @ffmpeg/core-mt is installed.`,
      );
    } else {
      console.error("An error occurred:", error);
    }
  }
}

copyFFmpegFiles("core");
copyFFmpegFiles("core-mt");