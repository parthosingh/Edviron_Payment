"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.PayUController = void 0;
const common_1 = require("@nestjs/common");
const axios_1 = require("axios");
const qs = require("qs");
const pay_u_service_1 = require("./pay-u.service");
const database_service_1 = require("../database/database.service");
const collect_request_schema_1 = require("../database/schemas/collect_request.schema");
const mongoose_1 = require("mongoose");
const collect_req_status_schema_1 = require("../database/schemas/collect_req_status.schema");
const jwt = require("jsonwebtoken");
const edviron_pg_service_1 = require("../edviron-pg/edviron-pg.service");
let PayUController = class PayUController {
    constructor(payUService, databaseService, edvironPgService) {
        this.payUService = payUService;
        this.databaseService = databaseService;
        this.edvironPgService = edvironPgService;
    }
    async testPayment() {
        try {
            const url = 'https://test.payu.in/_payment';
            const headers = {
                Accept: 'application/json',
                'Content-Type': 'application/x-www-form-urlencoded',
                Cookie: 'ePBfYcIbiJPsAyduYb3rPre11uRvaI7a; PHPSESSID=gdtsmpkbmilsv9beouqc1t10u4',
            };
            const data = qs.stringify({
                key: 'BuxMPz',
                txnid: '123456789',
                amount: '10.00',
                firstname: 'raj',
                email: 'test@gmail.com',
                phone: '9876543210',
                productinfo: 'iPhone',
                pg: 'NB',
                bankcode: 'TESTPGNB',
                surl: 'https://apiplayground-response.herokuapp.com/',
                furl: 'https://apiplayground-response.herokuapp.com/',
                hash: 'fc9d296e94e641ad711817a85dc3eab17b2660d4c411e1e5972131819d81c68411ac50c230f56795d2e393691811a2e17a1c8a39d6d51c050197c0a85b810318',
            });
            const response = await axios_1.default.post(url, data, { headers });
            console.log(response.data);
            return response.data;
        }
        catch (error) {
            throw new Error(`Payment request failed: ${error.message}`);
        }
    }
    async redirectPayu(req, res) {
        const collect_id = req.query.collect_id;
        const [request, req_status] = await Promise.all([
            this.databaseService.CollectRequestModel.findById(collect_id),
            this.databaseService.CollectRequestStatusModel.findOne({
                collect_id: new mongoose_1.Types.ObjectId(collect_id),
            }),
        ]);
        if (!request || !req_status) {
            throw new common_1.ConflictException('url fordge');
        }
        if (req_status.status === collect_req_status_schema_1.PaymentStatus.SUCCESS) {
            return res.send(`
        <script>
          alert('This payment has already been completed.');
          window.location.href = '${process.env.URL}/pay-u/callback/?collect_id=${collect_id}';
        </script>
      `);
        }
        if (req_status.status === collect_req_status_schema_1.PaymentStatus.SUCCESS) {
            return res.send(`
        <script>
          alert('This payment has already been completed.');
          window.location.href = '${process.env.URL}/pay-u/callback/?collect_id=${collect_id}';
        </script>
      `);
        }
        const created_at = new Date(req_status.createdAt).getTime();
        const now = Date.now();
        const expiry_duration = 15 * 60 * 1000;
        if (now - created_at > expiry_duration) {
            return res.send(`
        <script>
          alert('The payment session has expired. Please initiate the payment again.');
          window.location.href = '${process.env.URL}/pay-u/callback/?collect_id=${collect_id}';
        </script>
      `);
        }
        const { student_details } = JSON.parse(request.additional_data);
        const fullName = student_details.student_name?.trim() || '';
        const nameParts = fullName.split(' ').filter(Boolean);
        const firstName = nameParts[0] || 'NA';
        const lastName = nameParts.length > 1 ? nameParts[nameParts.length - 1] : '';
        const hash = await this.payUService.generate512HASH(request.pay_u_key, collect_id, request.amount, request.pay_u_salt, firstName);
        res.send(`<form action="https://secure.payu.in/_payment" method="post" name="redirect">
        <input type="hidden" name="key" value="${request.pay_u_key}" />
        <input type="hidden" name="txnid" value="${collect_id}" />
        <input type="hidden" name="productinfo" value="school_fee" />
        <input type="hidden" name="amount" value="${request.amount}" />
        <input type="hidden" name="email" value="noreply@edviron.com" />
        <input type="hidden" name="firstname" value=${firstName} />
        <input type="hidden" name="lastname" value=${lastName} />
        <input type="hidden" name="surl" value="${process.env.URL}/pay-u/callback/?collect_id=${collect_id}" />
        <input type="hidden" name="furl" value="${process.env.URL}/pay-u/callback/?collect_id=${collect_id}" />
        <input type="hidden" name="phone" value="0000000000" />
        <input type="hidden" name="hash" value="${hash}" />
      </form>
      <script type="text/javascript">
          window.onload = function(){
              document.forms['redirect'].submit();
          }
      </script>`);
    }
    async testUpi() {
        try {
            const url = 'https://secure.payu.in/_payment';
            const headers = {
                Accept: 'application/json',
                'Content-Type': 'application/x-www-form-urlencoded',
                Cookie: 'ePBfYcIbiJPsAyduYb3rPre11uRvaI7a; PHPSESSID=gdtsmpkbmilsv9beouqc1t10u4',
            };
            const data = qs.stringify({
                key: 'BuxMPz',
                txnid: '123456789',
                amount: '10.00',
                firstname: 'raj',
                email: 'test@gmail.com',
                phone: '9876543210',
                productinfo: 'iPhone',
                pg: 'UPI',
                bankcode: 'UPI',
                vpa: 'kk@okaxis',
                surl: 'https://apiplayground-response.herokuapp.com/',
                furl: 'https://apiplayground-response.herokuapp.com/',
                hash: 'fc9d296e94e641ad711817a85dc3eab17b2660d4c411e1e5972131819d81c68411ac50c230f56795d2e393691811a2e17a1c8a39d6d51c050197c0a85b810318',
            });
            const response = await axios_1.default.post(url, data, { headers });
            return response.data;
        }
        catch (error) {
            throw new Error(`Payment request failed: ${error.message}`);
        }
    }
    async handleCallback(req, res) {
        console.log(req.body);
        const { collect_id } = req.query;
        const collectRequest = await this.databaseService.CollectRequestModel.findById(collect_id);
        if (!collectRequest) {
            throw new common_1.BadRequestException('Error in collect request');
        }
        collectRequest.gateway = collect_request_schema_1.Gateway.EDVIRON_PAY_U;
        await collectRequest.save();
        const { status } = await this.payUService.checkStatus(collect_id);
        if (collectRequest?.sdkPayment) {
            if (status === `SUCCESS`) {
                console.log(`SDK payment success for ${collect_id}`);
                return res.redirect(`${process.env.PG_FRONTEND}/payment-success?collect_id=${collect_id}`);
            }
            return res.redirect(`${process.env.PG_FRONTEND}/payment-failure?collect_id=${collect_id}`);
        }
        const callbackUrl = new URL(collectRequest.callbackUrl);
        if (status !== `SUCCESS`) {
            return res.redirect(`${callbackUrl.toString()}?EdvironCollectRequestId=${collect_id}&status=${status}&reason=Payment-failed`);
        }
        callbackUrl.searchParams.set('EdvironCollectRequestId', collect_id);
        callbackUrl.searchParams.set('status', 'SUCCESS');
        return res.redirect(callbackUrl.toString());
    }
    async handleCallbackPost(req, res) {
        console.log(req.body);
        const { collect_id } = req.query;
        const collectRequest = await this.databaseService.CollectRequestModel.findById(collect_id);
        if (!collectRequest) {
            throw new common_1.BadRequestException('Error in collect request');
        }
        collectRequest.gateway = collect_request_schema_1.Gateway.EDVIRON_PAY_U;
        await collectRequest.save();
        const { status } = await this.payUService.checkStatus(collect_id);
        if (collectRequest?.sdkPayment) {
            if (status === `SUCCESS`) {
                console.log(`SDK payment success for ${collect_id}`);
                return res.redirect(`${process.env.PG_FRONTEND}/payment-success?collect_id=${collect_id}`);
            }
            return res.redirect(`${process.env.PG_FRONTEND}/payment-failure?collect_id=${collect_id}`);
        }
        const callbackUrl = new URL(collectRequest.callbackUrl);
        if (status !== `SUCCESS`) {
            return res.redirect(`${callbackUrl.toString()}?EdvironCollectRequestId=${collect_id}&status=${status}&reason=Payment-failed`);
        }
        callbackUrl.searchParams.set('EdvironCollectRequestId', collect_id);
        callbackUrl.searchParams.set('status', 'SUCCESS');
        return res.redirect(callbackUrl.toString());
    }
    async checkStatus(req, res) {
        const collect_id = req.query.collect_id;
        const status = await this.payUService.checkStatus(collect_id);
        res.json(status);
    }
    async handleWebhook(body, res) {
        try {
            const data = JSON.stringify(body);
            console.log(data);
            await new this.databaseService.WebhooksModel({
                body: data,
            }).save();
            const { status, txnid, mode, addedon, field3, field7, field8, field9, net_amount_debit, bank_ref_no, error_Message, card_no, mihpayid, bankcode, } = body;
            const collectIdObject = new mongoose_1.Types.ObjectId(txnid);
            const collectReq = await this.databaseService.CollectRequestModel.findById(collectIdObject);
            if (!collectReq)
                throw new Error('Collect request not found');
            let transaction_amount = net_amount_debit;
            let payment_method = mode.toLowerCase();
            let payment_message = field7;
            const saveWebhook = await new this.databaseService.WebhooksModel({
                collect_id: collectIdObject,
                body: data,
            }).save();
            const pendingCollectReq = await this.databaseService.CollectRequestStatusModel.findOne({
                collect_id: collectIdObject,
            });
            collectReq.gateway = collect_request_schema_1.Gateway.EDVIRON_PAY_U;
            await collectReq.save();
            try {
                if (pendingCollectReq &&
                    pendingCollectReq.status === collect_req_status_schema_1.PaymentStatus.FAILED &&
                    status.toUpperCase() === 'SUCCESS') {
                    const tokenData = {
                        school_id: collectReq?.school_id,
                        trustee_id: collectReq?.trustee_id,
                    };
                    const token = jwt.sign(tokenData, process.env.KEY, {
                        noTimestamp: true,
                    });
                    console.log('Refunding Duplicate Payment request');
                    const autoRefundConfig = {
                        method: 'POST',
                        url: `${process.env.VANILLA_SERVICE_ENDPOINT}/main-backend/initiate-auto-refund`,
                        headers: {
                            accept: 'application/json',
                            'Content-Type': 'application/json',
                        },
                        data: {
                            token,
                            refund_amount: collectReq.amount,
                            collect_id: txnid,
                            school_id: collectReq.school_id,
                            trustee_id: collectReq?.trustee_id,
                            custom_id: collectReq.custom_order_id || 'NA',
                            gateway: collect_request_schema_1.Gateway.EDVIRON_PAY_U,
                            reason: 'Auto Refund due to dual payment',
                        },
                    };
                    console.time('Refunding Duplicate Payment request');
                    const autoRefundResponse = await axios_1.default.request(autoRefundConfig);
                    console.timeEnd('Refunding Duplicate Payment request');
                    collectReq.gateway = collect_request_schema_1.Gateway.EDVIRON_PG;
                    pendingCollectReq.isAutoRefund = true;
                    pendingCollectReq.status = collect_req_status_schema_1.PaymentStatus.FAILED;
                    await pendingCollectReq.save();
                    await collectReq.save();
                    return res.status(200).send('OK');
                }
            }
            catch (e) {
                console.log(e.message, 'Error in AutoRefund');
                return res.status(400).send('Error in AutoRefund');
            }
            const reqToCheck = await this.payUService.checkStatus(txnid);
            const payment_time = new Date(addedon);
            let platform_type = '';
            let details;
            try {
                switch (mode) {
                    case 'UPI':
                        payment_method = 'upi';
                        platform_type = 'UPI';
                        details = {
                            app: {
                                channel: 'NA',
                                upi_id: field3,
                            },
                        };
                        break;
                    case 'CC':
                        payment_method = 'credit_card';
                        platform_type = 'CreditCard';
                        details = {
                            card: {
                                card_bank_name: 'NA',
                                card_network: bankcode,
                                card_number: card_no,
                                card_type: 'credit_card',
                            },
                        };
                        break;
                    case 'DC':
                        payment_method = 'credit_card';
                        platform_type = 'CreditCard';
                        details = {
                            card: {
                                card_bank_name: 'NA',
                                card_network: bankcode,
                                card_number: card_no,
                                card_type: 'credit_card',
                            },
                        };
                        break;
                }
            }
            catch (e) { }
            if (status.toUpperCase() === 'SUCCESS') {
                try {
                    const payment_mode = platform_type;
                    const tokenData = {
                        school_id: collectReq?.school_id,
                        trustee_id: collectReq?.trustee_id,
                        order_amount: pendingCollectReq?.order_amount,
                        transaction_amount,
                        platform_type,
                        payment_mode,
                        collect_id: collectReq?._id,
                    };
                    const _jwt = jwt.sign(tokenData, process.env.KEY, {
                        noTimestamp: true,
                    });
                    let data = JSON.stringify({
                        token: _jwt,
                        school_id: collectReq?.school_id,
                        trustee_id: collectReq?.trustee_id,
                        order_amount: pendingCollectReq?.order_amount,
                        transaction_amount,
                        platform_type,
                        payment_mode,
                        collect_id: collectReq?._id,
                    });
                    let config = {
                        method: 'post',
                        maxBodyLength: Infinity,
                        url: `${process.env.VANILLA_SERVICE_ENDPOINT}/erp/add-commission`,
                        headers: {
                            accept: 'application/json',
                            'content-type': 'application/json',
                            'x-api-version': '2023-08-01',
                        },
                        data: data,
                    };
                    try {
                        const { data: commissionRes } = await axios_1.default.request(config);
                        console.log(commissionRes, 'Commission saved');
                    }
                    catch (e) {
                        console.log(`failed to save commision ${e.message}`);
                    }
                }
                catch (e) {
                    console.log(`Error in saving` + e.message);
                }
            }
            const updateReq = await this.databaseService.CollectRequestStatusModel.updateOne({
                collect_id: collectIdObject,
            }, {
                $set: {
                    status,
                    transaction_amount,
                    payment_method,
                    details: JSON.stringify(details),
                    bank_reference: body.bank_ref_num,
                    payment_time,
                },
            }, {
                upsert: true,
                new: true,
            });
            const custom_order_id = collectReq?.custom_order_id || '';
            const additional_data = collectReq?.additional_data || '';
            const webHookUrl = collectReq?.req_webhook_urls;
            const webHookDataInfo = {
                collect_id: txnid,
                amount: collectReq.amount,
                status,
                trustee_id: collectReq.trustee_id,
                school_id: collectReq.school_id,
                req_webhook_urls: collectReq?.req_webhook_urls,
                custom_order_id,
                createdAt: collectReq?.createdAt,
                transaction_time: payment_time || pendingCollectReq?.updatedAt,
                additional_data,
                details: pendingCollectReq?.details,
                transaction_amount: pendingCollectReq?.transaction_amount,
                bank_reference: pendingCollectReq?.bank_reference,
                payment_method: pendingCollectReq?.payment_method,
                payment_details: pendingCollectReq?.details,
                formattedDate: `${payment_time.getFullYear()}-${String(payment_time.getMonth() + 1).padStart(2, '0')}-${String(payment_time.getDate()).padStart(2, '0')}`,
            };
            if (webHookUrl !== null && webHookUrl.length !== 0) {
                console.log('calling webhook');
                if (collectReq?.trustee_id.toString() === '66505181ca3e97e19f142075') {
                    console.log('Webhook called for webschool');
                    setTimeout(async () => {
                        await this.edvironPgService.sendErpWebhook(webHookUrl, webHookDataInfo);
                    }, 60000);
                }
                else {
                    await this.edvironPgService.sendErpWebhook(webHookUrl, webHookDataInfo);
                }
            }
            await this.edvironPgService.sendMailAfterTransaction(collectIdObject.toString());
            return res.status(200).send('OK');
        }
        catch (error) {
            return res.status(400).send(error.message || 'Error in saving webhook');
        }
    }
};
exports.PayUController = PayUController;
__decorate([
    (0, common_1.Get)('/nb'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], PayUController.prototype, "testPayment", null);
__decorate([
    (0, common_1.Get)('redirect'),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Res)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], PayUController.prototype, "redirectPayu", null);
__decorate([
    (0, common_1.Get)('/upi'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], PayUController.prototype, "testUpi", null);
__decorate([
    (0, common_1.Get)('/callback'),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Res)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], PayUController.prototype, "handleCallback", null);
__decorate([
    (0, common_1.Post)('/callback'),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Res)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], PayUController.prototype, "handleCallbackPost", null);
__decorate([
    (0, common_1.Post)('/check-status'),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Res)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], PayUController.prototype, "checkStatus", null);
__decorate([
    (0, common_1.Post)('/webhook'),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.Res)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], PayUController.prototype, "handleWebhook", null);
exports.PayUController = PayUController = __decorate([
    (0, common_1.Controller)('pay-u'),
    __metadata("design:paramtypes", [pay_u_service_1.PayUService,
        database_service_1.DatabaseService,
        edviron_pg_service_1.EdvironPgService])
], PayUController);
//# sourceMappingURL=pay-u.controller.js.map