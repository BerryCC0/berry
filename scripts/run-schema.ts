/**
 * Script to run the database schema
 * Usage: npx tsx scripts/run-schema.ts
 */

import { neon } from "@neondatabase/serverless";
import * as fs from "fs";
import * as path from "path";
import * as dotenv from "dotenv";

// Load environment variables from .env.local
dotenv.config({ path: ".env.local" });

const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  console.error("❌ DATABASE_URL not found in .env.local");
  process.exit(1);
}

console.log("🔌 Connecting to Neon database...\n");

const sql = neon(DATABASE_URL);

// Helper to run raw SQL
async function runRawSQL(query: string): Promise<void> {
  // The neon client with tagged templates doesn't allow raw strings,
  // but we can use sql.query() for that
  const result = await sql.query(query, []);
  return;
}

async function runSchema() {
  const schemaPath = path.join(__dirname, "schema.sql");
  const schemaContent = fs.readFileSync(schemaPath, "utf8");

  // Remove comments and split by semicolons
  const lines = schemaContent.split("\n");
  let currentStatement = "";
  const statements: string[] = [];

  for (const line of lines) {
    const trimmedLine = line.trim();
    
    // Skip comment-only lines
    if (trimmedLine.startsWith("--")) {
      continue;
    }
    
    // Remove inline comments
    const lineWithoutComment = line.split("--")[0];
    currentStatement += lineWithoutComment + "\n";
    
    // Check if statement is complete (ends with semicolon)
    if (trimmedLine.endsWith(";")) {
      const stmt = currentStatement.trim();
      if (stmt.length > 1) {
        statements.push(stmt);
      }
      currentStatement = "";
    }
  }

  console.log(`📜 Found ${statements.length} SQL statements to execute\n`);

  let successCount = 0;
  let errorCount = 0;

  for (let i = 0; i < statements.length; i++) {
    const stmt = statements[i];
    const preview = stmt.replace(/\s+/g, " ").slice(0, 60);
    
    try {
      await runRawSQL(stmt);
      console.log(`✓ [${i + 1}/${statements.length}] ${preview}...`);
      successCount++;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      
      // Check for "already exists" type errors (not really errors for IF NOT EXISTS)
      if (
        message.includes("already exists") ||
        message.includes("duplicate key") ||
        message.includes("relation") && message.includes("already")
      ) {
        console.log(`○ [${i + 1}/${statements.length}] ${preview}... (already exists)`);
        successCount++;
      } else {
        console.error(`✗ [${i + 1}/${statements.length}] ${preview}...`);
        console.error(`  Error: ${message}\n`);
        errorCount++;
      }
    }
  }

  console.log(`\n${"─".repeat(50)}`);
  console.log(`✅ Schema execution complete!`);
  console.log(`   ✓ Success: ${successCount}`);
  console.log(`   ✗ Errors: ${errorCount}`);
  
  if (errorCount === 0) {
    console.log(`\n🎉 Database is ready for Berry OS!`);
  }
}

runSchema().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
