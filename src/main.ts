import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const whitelist = [
    'http://localhost:3001',
    'http://localhost:3000',
    'https://dev.pg.edviron.com',
    'https://pg.edviron.com',
  ];
  app.enableCors({
    origin: function (origin, callback) {
      if (whitelist.indexOf(origin) !== -1) {
        callback(null, true);
      } else {
        callback(null, false);
      }
    },
    credentials: true,
  });
  await app.listen(process.env.PORT || 4001);
}
bootstrap();
