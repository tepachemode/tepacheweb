import hapi from '@hapi/hapi';
import inert from '@hapi/inert';
import path from 'path';
import { fileURLToPath } from 'url';

const fileName = fileURLToPath(import.meta.url);
const dirName = path.dirname(fileName);

const PORT = process.env.PORT || 616;

(async () => {
  const server = hapi.server({
    port: PORT,
    host: '0.0.0.0',
    routes: {
      files: {
        relativeTo: path.join(dirName, 'dist'),
      },
    },
  });

  await server.register(inert);

  // Chromecast receiver
  server.route({
    method: 'GET',
    path: '/receiver',
    handler: {
      file: 'receiver.html',
    },
  });

  server.route({
    method: 'GET',
    path: '/{param*}',
    handler: {
      directory: {
        path: '.',
        redirectToSlash: false,
      },
    },
  });

  server.ext('onPreResponse', (req, h) => {
    const { response } = req;
    if (response.isBoom && response.output.statusCode === 404) {
      return h.file('index.html');
    }
    return h.continue;
  });

  await server.start();

  console.log('Tepache Web running at', PORT);
})();
