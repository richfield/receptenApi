const fs = require('fs');
const path = require('path');
const swaggerJSDoc = require('swagger-jsdoc');

const projectRoot = path.resolve(__dirname, '..');
const swaggerDefinition = require(path.join(projectRoot, 'swaggerDef.js'));

const options = {
  definition: swaggerDefinition,
  // Path to the API docs
  apis: [path.join(projectRoot, 'src', 'routes', '*.ts')],
};

const openapiSpec = swaggerJSDoc(options);

const outPath = path.join(process.cwd(), 'openapi.json');
fs.writeFileSync(outPath, JSON.stringify(openapiSpec, null, 2));
console.log('Wrote', outPath);
