"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.EdvironPgModule = void 0;
const common_1 = require("@nestjs/common");
const edviron_pg_controller_1 = require("./edviron-pg.controller");
const edviron_pg_service_1 = require("./edviron-pg.service");
const database_module_1 = require("../database/database.module");
const easebuzz_service_1 = require("../easebuzz/easebuzz.service");
const cashfree_module_1 = require("../cashfree/cashfree.module");
const nttdata_service_1 = require("../nttdata/nttdata.service");
const pos_paytm_service_1 = require("../pos-paytm/pos-paytm.service");
const worldline_service_1 = require("../worldline/worldline.service");
let EdvironPgModule = class EdvironPgModule {
};
exports.EdvironPgModule = EdvironPgModule;
exports.EdvironPgModule = EdvironPgModule = __decorate([
    (0, common_1.Module)({
        controllers: [edviron_pg_controller_1.EdvironPgController],
        providers: [
            edviron_pg_service_1.EdvironPgService,
            easebuzz_service_1.EasebuzzService,
            nttdata_service_1.NttdataService,
            worldline_service_1.WorldlineService,
            pos_paytm_service_1.PosPaytmService,
        ],
        imports: [
            database_module_1.DatabaseModule,
            (0, common_1.forwardRef)(() => cashfree_module_1.CashfreeModule),
        ],
        exports: [edviron_pg_service_1.EdvironPgService, cashfree_module_1.CashfreeModule],
    })
], EdvironPgModule);
//# sourceMappingURL=edviron-pg.module.js.map