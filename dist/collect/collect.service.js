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
Object.defineProperty(exports, "__esModule", { value: true });
exports.CollectService = void 0;
const common_1 = require("@nestjs/common");
const database_service_1 = require("../database/database.service");
const collect_request_schema_1 = require("../database/schemas/collect_request.schema");
const hdfc_service_1 = require("../hdfc/hdfc.service");
const phonepe_service_1 = require("../phonepe/phonepe.service");
const edviron_pg_service_1 = require("../edviron-pg/edviron-pg.service");
const collect_req_status_schema_1 = require("../database/schemas/collect_req_status.schema");
const ccavenue_service_1 = require("../ccavenue/ccavenue.service");
const nodemailer = require("nodemailer");
const hdfc_razorpay_service_1 = require("../hdfc_razporpay/hdfc_razorpay.service");
const pay_u_service_1 = require("../pay-u/pay-u.service");
const smartgateway_service_1 = require("../smartgateway/smartgateway.service");
const nttdata_service_1 = require("../nttdata/nttdata.service");
let CollectService = class CollectService {
    constructor(phonepeService, hdfcService, edvironPgService, databaseService, ccavenueService, hdfcRazorpay, payuService, hdfcSmartgatewayService, nttdataService) {
        this.phonepeService = phonepeService;
        this.hdfcService = hdfcService;
        this.edvironPgService = edvironPgService;
        this.databaseService = databaseService;
        this.ccavenueService = ccavenueService;
        this.hdfcRazorpay = hdfcRazorpay;
        this.payuService = payuService;
        this.hdfcSmartgatewayService = hdfcSmartgatewayService;
        this.nttdataService = nttdataService;
    }
    async collect(amount, callbackUrl, school_id, trustee_id, disabled_modes = [], platform_charges, clientId, clientSecret, webHook, additional_data, custom_order_id, req_webhook_urls, school_name, easebuzz_sub_merchant_id, ccavenue_merchant_id, ccavenue_access_code, ccavenue_working_key, smartgateway_customer_id, smartgateway_merchant_id, smart_gateway_api_key, splitPayments, pay_u_key, pay_u_salt, hdfc_razorpay_id, hdfc_razorpay_secret, hdfc_razorpay_mid, nttdata_id, nttdata_secret, vendor) {
        console.log(req_webhook_urls, 'webhook url');
        console.log(webHook);
        console.log(ccavenue_merchant_id, 'ccavenue', ccavenue_access_code, ccavenue_working_key);
        if (custom_order_id) {
            const count = await this.databaseService.CollectRequestModel.countDocuments({
                school_id,
                custom_order_id,
            });
            if (count > 0) {
                throw new common_1.ConflictException('OrderId must be unique');
            }
        }
        console.log('collect request for amount: ' + amount + ' received.', {
            disabled_modes,
        });
        const gateway = clientId === 'edviron' ? collect_request_schema_1.Gateway.HDFC : collect_request_schema_1.Gateway.PENDING;
        const request = await new this.databaseService.CollectRequestModel({
            amount,
            callbackUrl,
            gateway: gateway,
            clientId,
            clientSecret,
            webHookUrl: webHook || null,
            disabled_modes,
            school_id,
            trustee_id,
            additional_data: JSON.stringify(additional_data),
            custom_order_id,
            req_webhook_urls,
            easebuzz_sub_merchant_id,
            ccavenue_merchant_id: ccavenue_merchant_id || null,
            ccavenue_access_code: ccavenue_access_code || null,
            ccavenue_working_key: ccavenue_working_key || null,
            pay_u_key: pay_u_key || null,
            pay_u_salt: pay_u_salt || null,
            ntt_data: {
                nttdata_id,
                nttdata_secret,
            },
        }).save();
        await new this.databaseService.CollectRequestStatusModel({
            collect_id: request._id,
            status: collect_req_status_schema_1.PaymentStatus.PENDING,
            order_amount: request.amount,
            transaction_amount: request.amount,
            payment_method: null,
        }).save();
        if (nttdata_id && nttdata_secret) {
            const { url, collect_req } = await this.nttdataService.createOrder(request);
            setTimeout(() => {
                this.nttdataService.terminateOrder(collect_req._id.toString());
            }, 15 * 60 * 1000);
            return { url, request: collect_req };
        }
        if (pay_u_key && pay_u_salt) {
            setTimeout(async () => {
                try {
                    await this.payuService.terminateOrder(request._id.toString());
                }
                catch (error) {
                    console.log(error.message);
                }
            }, 15 * 60 * 1000);
            return {
                url: `${process.env.URL}/pay-u/redirect?collect_id=${request._id}&school_name=${school_name?.split(' ').join('_')}`,
                request,
            };
        }
        if (ccavenue_merchant_id) {
            console.log('creating order with CCavenue');
            const transaction = await this.ccavenueService.createOrder(request);
            return { url: transaction.url, request };
        }
        if (hdfc_razorpay_id && hdfc_razorpay_secret && hdfc_razorpay_mid) {
            request.hdfc_razorpay_id = hdfc_razorpay_id;
            request.hdfc_razorpay_secret = hdfc_razorpay_secret;
            request.hdfc_razorpay_mid = hdfc_razorpay_mid;
            request.gateway = collect_request_schema_1.Gateway.EDVIRON_HDFC_RAZORPAY;
            await request.save();
            await new this.databaseService.CollectRequestStatusModel({
                collect_id: request._id,
                status: collect_req_status_schema_1.PaymentStatus.PENDING,
                order_amount: request.amount,
                transaction_amount: request.amount,
                payment_method: null,
            }).save();
            const orderData = await this.hdfcRazorpay.createOrder(request);
            if (orderData.status === 'created') {
                request.hdfc_razorpay_order_id = orderData.id;
                await request.save();
            }
            return {
                url: `${process.env.URL}/hdfc-razorpay/redirect?order_id=${orderData.id}&collect_id=${request._id}&school_name=${school_name
                    ?.split(' ')
                    .join('_')}`,
                request,
            };
        }
        if (smartgateway_customer_id && smartgateway_merchant_id && smart_gateway_api_key) {
            request.smartgateway_customer_id = smartgateway_customer_id;
            request.smartgateway_merchant_id = smartgateway_merchant_id;
            request.smart_gateway_api_key = smart_gateway_api_key;
            await request.save();
            const data = await this.hdfcSmartgatewayService.createOrder(request, smartgateway_customer_id, smartgateway_merchant_id, smart_gateway_api_key);
            return { url: data?.url, request: data?.request };
        }
        const transaction = (gateway === collect_request_schema_1.Gateway.PENDING
            ? await this.edvironPgService.collect(request, platform_charges, school_name, splitPayments || false, vendor)
            : await this.hdfcService.collect(request));
        await this.databaseService.CollectRequestModel.updateOne({
            _id: request._id,
        }, {
            payment_data: JSON.stringify(transaction.url),
        }, { new: true });
        return { url: transaction.url, request };
    }
    async sendCallbackEmail(collect_id) {
        const htmlToSend = `
    <html>
    <head>
      <style>
        body {
          font-family: Arial, sans-serif;
        }
        .container {
          padding: 20px;
          background-color: #f8f9fa;
          border-radius: 5px;
        }
        .header {
          font-size: 20px;
          font-weight: bold;
          color: #333;
        }
        .content {
          margin-top: 10px;
          font-size: 16px;
          color: #555;
        }
        .footer {
          margin-top: 20px;
          font-size: 14px;
          color: #777;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">Order Dropped Notification</div>
        <div class="content">
          <p>The user has dropped the order.</p>
          <p><strong>Order ID:</strong> ${collect_id}</p>
        </div>
        <div class="footer">
          <p>Thank you,</p>
          <p>Your Company Team</p>
        </div>
      </div>
    </body>
    </html>
  `;
        const transporter = nodemailer.createTransport({
            pool: true,
            host: 'smtp.gmail.com',
            port: 465,
            secure: true,
            auth: {
                type: 'OAuth2',
                user: process.env.EMAIL_USER,
                clientId: process.env.OAUTH_CLIENT_ID,
                clientSecret: process.env.OAUTH_CLIENT_SECRET,
                refreshToken: process.env.OAUTH_REFRESH_TOKEN,
            },
        });
        const mailOptions = {
            from: 'noreply@edviron.com',
            to: 'rpbarmaiya@gmail.com',
            subject: `Edviron - User Dropped`,
            html: htmlToSend,
        };
        try {
            const info = await transporter.sendMail(mailOptions);
            return 'mail sent successfully';
        }
        catch (e) {
            console.log(e.message);
        }
    }
};
exports.CollectService = CollectService;
exports.CollectService = CollectService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [phonepe_service_1.PhonepeService,
        hdfc_service_1.HdfcService,
        edviron_pg_service_1.EdvironPgService,
        database_service_1.DatabaseService,
        ccavenue_service_1.CcavenueService,
        hdfc_razorpay_service_1.HdfcRazorpayService,
        pay_u_service_1.PayUService,
        smartgateway_service_1.SmartgatewayService,
        nttdata_service_1.NttdataService])
], CollectService);
//# sourceMappingURL=collect.service.js.map