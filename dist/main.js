"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const core_1 = require("@nestjs/core");
const app_module_1 = require("./app.module");
async function bootstrap() {
    const app = await core_1.NestFactory.create(app_module_1.AppModule);
    const whitelist = [
        'http://localhost:3001',
        'http://localhost:3000',
        'https://dev.pg.edviron.com',
        'https://pg.edviron.com',
        'https://qa.pg.edviron.com',
        'https://partner.edviron.com',
        'https://merchant.edviron.com',
        'https://dev.dqeoas0bnp0pl.amplifyapp.com'
    ];
    app.enableCors({
        origin: function (origin, callback) {
            if (whitelist.indexOf(origin) !== -1) {
                callback(null, true);
            }
            else {
                callback(null, false);
            }
        },
        credentials: true,
    });
    await app.listen(process.env.PORT || 4001);
}
bootstrap();
//# sourceMappingURL=main.js.map