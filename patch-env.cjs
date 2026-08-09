const fs = require('fs');

let envStr = fs.readFileSync('src/EnvValidator.ts', 'utf8');

envStr = envStr.replace(/process\.env\.NODE_ENV = 'development';/g, "process.env.NODE_ENV = process.env.NODE_ENV || 'production';");
// Actually let's just make sure it sets it to production if missing, because if we are running dist/server.cjs it IS production.
envStr = envStr.replace(/if \(!process\.env\.NODE_ENV\) \{\s*process\.env\.NODE_ENV = 'development';\s*\}/g, `if (!process.env.NODE_ENV) {
    process.env.NODE_ENV = 'production';
  }`);

fs.writeFileSync('src/EnvValidator.ts', envStr);
console.log('Patched EnvValidator.ts');
