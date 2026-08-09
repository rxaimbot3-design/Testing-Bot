import fs from "fs";

let content = fs.readFileSync("src/EnvValidator.ts", "utf-8");

content = content.replace(
  /if \(!token\) \{\s*missingRequired\.push\('DISCORD_BOT_TOKEN'\);\s*warnings\.push\('❌ Critical: DISCORD_BOT_TOKEN is missing\. Discord Bot will remain offline\.'\);\s*\}/,
  `if (!token) {
    missingOptional.push('DISCORD_BOT_TOKEN');
    warnings.push('⚠️ Warning: DISCORD_BOT_TOKEN is missing. Discord Bot will remain offline.');
  }`
);

fs.writeFileSync("src/EnvValidator.ts", content);
