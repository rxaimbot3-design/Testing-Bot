const fs = require('fs');
let server = fs.readFileSync('server.ts', 'utf8');

server = server.replace(/const PORT = Number\(process\.env\.PORT\) \|\| 3000;/g, 'const PORT = 3000;');
server = server.replace(/const port = process\.env\.PORT \|\| 3000;/g, 'const port = 3000;');

fs.writeFileSync('server.ts', server);
console.log('Patched PORT');
