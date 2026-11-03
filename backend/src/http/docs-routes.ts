import { createRequire } from 'node:module';
import path from 'node:path';
import express from 'express';

export interface DocsOptions {
  /** `api-contract/openapi.yaml` dosyasının yolu. */
  specPath: string;
}

const require = createRequire(import.meta.url);

const page = `<!doctype html>
<html lang="tr">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Ritma API Belgeleri</title>
  <link rel="stylesheet" href="/docs/assets/swagger-ui.css">
</head>
<body>
  <div id="swagger-ui"></div>
  <script src="/docs/assets/swagger-ui-bundle.js"></script>
  <script>
    window.ui = SwaggerUIBundle({
      url: '/docs/openapi.yaml',
      dom_id: '#swagger-ui',
      persistAuthorization: true,
    });
  </script>
</body>
</html>
`;

export function createDocsRouter({ specPath }: DocsOptions): express.Router {
  const router = express.Router();
  const assetsDir = path.dirname(require.resolve('swagger-ui-dist/package.json'));

  router.get('/openapi.yaml', (_req, res) => {
    res.type('application/yaml').sendFile(specPath);
  });
  router.get('/', (_req, res) => {
    res.type('html').send(page);
  });
  router.use('/assets', express.static(assetsDir));
  return router;
}
