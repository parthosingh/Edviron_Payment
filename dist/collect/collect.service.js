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
const pos_paytm_service_1 = require("../pos-paytm/pos-paytm.service");
const nttdata_service_1 = require("../nttdata/nttdata.service");
const worldline_service_1 = require("../worldline/worldline.service");
const transactionStatus_1 = require("../types/transactionStatus");
const razorpay_nonseamless_service_1 = require("../razorpay-nonseamless/razorpay-nonseamless.service");
const gatepay_service_1 = require("../gatepay/gatepay.service");
const cashfree_service_1 = require("../cashfree/cashfree.service");
const easebuzz_service_1 = require("../easebuzz/easebuzz.service");
let CollectService = class CollectService {
    constructor(phonepeService, hdfcService, edvironPgService, databaseService, ccavenueService, hdfcRazorpay, payuService, hdfcSmartgatewayService, posPaytmService, nttdataService, worldLineService, razorpayNonseamlessService, gatepayService, cashfreeService, easebuzzService) {
        this.phonepeService = phonepeService;
        this.hdfcService = hdfcService;
        this.edvironPgService = edvironPgService;
        this.databaseService = databaseService;
        this.ccavenueService = ccavenueService;
        this.hdfcRazorpay = hdfcRazorpay;
        this.payuService = payuService;
        this.hdfcSmartgatewayService = hdfcSmartgatewayService;
        this.posPaytmService = posPaytmService;
        this.nttdataService = nttdataService;
        this.worldLineService = worldLineService;
        this.razorpayNonseamlessService = razorpayNonseamlessService;
        this.gatepayService = gatepayService;
        this.cashfreeService = cashfreeService;
        this.easebuzzService = easebuzzService;
    }
    async collect(amount, callbackUrl, school_id, trustee_id, disabled_modes = [], platform_charges, clientId, clientSecret, webHook, additional_data, custom_order_id, req_webhook_urls, school_name, easebuzz_sub_merchant_id, ccavenue_merchant_id, ccavenue_access_code, ccavenue_working_key, smartgateway_customer_id, smartgateway_merchant_id, smart_gateway_api_key, splitPayments, pay_u_key, pay_u_salt, hdfc_razorpay_id, hdfc_razorpay_secret, hdfc_razorpay_mid, nttdata_id, nttdata_secret, nttdata_hash_req_key, nttdata_hash_res_key, nttdata_res_salt, nttdata_req_salt, worldline_merchant_id, worldline_encryption_key, worldline_encryption_iV, worldline_scheme_code, currency, vendor, vendorgateway, easebuzzVendors, cashfreeVedors, isVBAPayment, vba_account_number, worldLine_vendors, easebuzz_school_label, razorpay_vendors, razorpay_credentials, gatepay_credentials, isCFNonSeamless, razorpay_seamless_credentials, isSelectGateway, isEasebuzzNonpartner, easebuzz_non_partner_cred, razorpay_partner) {
        console.log(vendor, 'vendor to save in db');
        if (custom_order_id) {
            const count = await this.databaseService.CollectRequestModel.countDocuments({
                school_id,
                custom_order_id,
            });
            if (count > 0) {
                throw new common_1.ConflictException('OrderId must be unique');
            }
        }
        const gateway = clientId === 'edviron' ? collect_request_schema_1.Gateway.HDFC : collect_request_schema_1.Gateway.PENDING;
        console.log({ isSelectGateway });
        console.log(razorpay_vendors, 'vendors');
        const request = await new this.databaseService.CollectRequestModel({
            amount,
            callbackUrl,
            gateway: gateway,
            clientId,
            currency: currency || "INR",
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
                nttdata_hash_req_key,
                nttdata_hash_res_key,
                nttdata_res_salt,
                nttdata_req_salt,
            },
            easebuzzVendors,
            cashfreeVedors,
            isVBAPayment: isVBAPayment || false,
            vba_account_number: vba_account_number || 'NA',
            worldline_vendors_info: worldLine_vendors,
            razorpay_vendors_info: razorpay_vendors,
            isSplitPayments: splitPayments || false,
            easebuzz_split_label: easebuzz_school_label,
            razorpay: {
                razorpay_id: razorpay_credentials?.razorpay_id || null,
                razorpay_secret: razorpay_credentials?.razorpay_secret || null,
                razorpay_mid: razorpay_credentials?.razorpay_mid || null,
            },
            isCFNonSeamless: isCFNonSeamless || false,
            razorpay_seamless: {
                razorpay_id: razorpay_seamless_credentials?.razorpay_id || null,
                razorpay_secret: razorpay_seamless_credentials?.razorpay_secret || null,
                razorpay_mid: razorpay_seamless_credentials?.razorpay_mid || null,
            },
            isMasterGateway: isSelectGateway || false
        }).save();
        console.log(request, "request");
        await new this.databaseService.CollectRequestStatusModel({
            collect_id: request._id,
            status: collect_req_status_schema_1.PaymentStatus.PENDING,
            order_amount: request.amount,
            transaction_amount: request.amount,
            payment_method: null,
        }).save();
        let non_seamless_payment_links = {
            cashfree: null,
            easebuzz: null,
            edv_easebuzz: null,
            razorpay: null,
            ccavenue: null,
            pay_u: null,
            worldline: null,
            gatepay: null,
            nttdata: null,
            hdfc_razorpay: null,
            hdfc_smartgateway: null,
            edviron_pg: null,
        };
        if (nttdata_id && nttdata_secret) {
            console.log('enter atom');
            const { url, collect_req } = await this.nttdataService.createOrder(request);
            setTimeout(() => {
                this.nttdataService.terminateOrder(collect_req._id.toString());
            }, 15 * 60 * 1000);
            if (isSelectGateway) {
                const ntt_data_url = url;
                non_seamless_payment_links.nttdata = ntt_data_url;
            }
            else {
                return { url, request: collect_req };
            }
        }
        if (razorpay_credentials?.razorpay_id &&
            razorpay_credentials?.razorpay_secret &&
            razorpay_credentials?.razorpay_mid) {
            console.log(razorpay_vendors, 'checking vendors');
            if (splitPayments && razorpay_vendors && razorpay_vendors.length > 0) {
                request.vendors_info = vendor;
                await request.save();
                razorpay_vendors.map(async (info) => {
                    const { vendor_id, percentage, amount, notes, name, linked_account_notes, on_hold, on_hold_until, } = info;
                    let split_amount = 0;
                    if (amount) {
                        split_amount = amount;
                    }
                    if (percentage && percentage !== 0) {
                        split_amount = (request.amount * percentage) / 100;
                    }
                    await new this.databaseService.VendorTransactionModel({
                        vendor_id: vendor_id,
                        amount: split_amount,
                        collect_id: request._id,
                        gateway: collect_request_schema_1.Gateway.EDVIRON_RAZORPAY,
                        status: transactionStatus_1.TransactionStatus.PENDING,
                        trustee_id: request.trustee_id,
                        school_id: request.school_id,
                        custom_order_id: request.custom_order_id || '',
                        name,
                        razorpay_vendors: info,
                    }).save();
                });
            }
            let collect_id = request._id.toString();
            if (razorpay_partner) {
                const { url, collect_req } = await this.razorpayNonseamlessService.createOrderV2(request);
                this.scheduleUpdate(15 * 60 * 1000, collect_id);
                this.scheduleUpdate(20 * 60 * 1000, collect_id);
                this.scheduleUpdate(60 * 60 * 1000, collect_id);
                return { url, request: collect_req };
            }
            const { url, collect_req } = await this.razorpayNonseamlessService.createOrder(request);
            this.scheduleUpdate(15 * 60 * 1000, collect_id);
            this.scheduleUpdate(20 * 60 * 1000, collect_id);
            this.scheduleUpdate(60 * 60 * 1000, collect_id);
            if (isSelectGateway) {
                non_seamless_payment_links.razorpay = url;
            }
            else {
                return { url, request: collect_req };
            }
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
            if (isSelectGateway) {
                const payu_url = `${process.env.URL}/pay-u/redirect?collect_id=${request._id}&school_name=${school_name?.split(' ').join('_')}`;
                non_seamless_payment_links.pay_u = payu_url;
            }
            else {
                return {
                    url: `${process.env.URL}/pay-u/redirect?collect_id=${request._id}&school_name=${school_name?.split(' ').join('_')}`,
                    request,
                };
            }
        }
        if (gatepay_credentials?.gatepay_mid &&
            gatepay_credentials?.gatepay_key &&
            gatepay_credentials?.gatepay_iv &&
            gatepay_credentials.gatepay_terminal_id) {
            console.log('gatepay enter9');
            if (!request.gatepay) {
                (request.gatepay = {
                    gatepay_mid: gatepay_credentials?.gatepay_mid,
                    gatepay_key: gatepay_credentials?.gatepay_key,
                    gatepay_iv: gatepay_credentials?.gatepay_iv,
                    gatepay_terminal_id: gatepay_credentials?.gatepay_terminal_id,
                    txnId: '',
                    token: '',
                });
            }
            else {
                (request.gatepay.gatepay_mid = gatepay_credentials?.gatepay_mid);
                request.gatepay.gatepay_key = gatepay_credentials?.gatepay_key;
                request.gatepay.gatepay_iv = gatepay_credentials?.gatepay_iv;
                request.gatepay.txnId = '';
                request.gatepay.token = '';
                request.gatepay.gatepay_terminal_id =
                    gatepay_credentials?.gatepay_terminal_id;
            }
            await request.save();
            const { url, collect_req } = await this.gatepayService.createOrder(request);
            if (isSelectGateway) {
                non_seamless_payment_links.gatepay = url;
            }
            else {
                return { url, request: collect_req };
            }
        }
        if (ccavenue_merchant_id) {
            const transaction = await this.ccavenueService.createOrder(request);
            if (isSelectGateway) {
                non_seamless_payment_links.ccavenue = transaction.url;
            }
            else {
                return { url: transaction.url, request };
            }
        }
        if (hdfc_razorpay_id && hdfc_razorpay_secret && hdfc_razorpay_mid) {
            request.hdfc_razorpay_id = hdfc_razorpay_id;
            request.hdfc_razorpay_secret = hdfc_razorpay_secret;
            request.hdfc_razorpay_mid = hdfc_razorpay_mid;
            await request.save();
            const orderData = await this.hdfcRazorpay.createOrder(request);
            if (orderData.status === 'created') {
                request.hdfc_razorpay_order_id = orderData.id;
                await request.save();
            }
            if (isSelectGateway) {
                const hdfc_razorpay_url = `${process.env.URL}/hdfc-razorpay/redirect?order_id=${orderData.id}&collect_id=${request._id}&school_name=${school_name
                    ?.split(' ')
                    .join('_')}`;
                non_seamless_payment_links.hdfc_razorpay = hdfc_razorpay_url;
            }
            else {
                return {
                    url: `${process.env.URL}/hdfc-razorpay/redirect?order_id=${orderData.id}&collect_id=${request._id}&school_name=${school_name
                        ?.split(' ')
                        .join('_')}`,
                    request,
                };
            }
        }
        if (worldline_merchant_id &&
            worldline_encryption_key &&
            worldline_encryption_iV &&
            worldline_scheme_code) {
            if (splitPayments && worldLine_vendors && worldLine_vendors.length > 0) {
                worldLine_vendors.map(async (info) => {
                    const { vendor_id, percentage, amount, name } = info;
                    let split_amount = 0;
                    if (amount) {
                        split_amount = amount;
                    }
                    if (percentage && percentage !== 0) {
                        split_amount = (request.amount * percentage) / 100;
                    }
                    await new this.databaseService.VendorTransactionModel({
                        vendor_id: vendor_id,
                        amount: split_amount,
                        collect_id: request._id,
                        gateway: collect_request_schema_1.Gateway.EDVIRON_WORLDLINE,
                        status: transactionStatus_1.TransactionStatus.PENDING,
                        trustee_id: request.trustee_id,
                        school_id: request.school_id,
                        custom_order_id: request.custom_order_id || '',
                        name,
                        worldline_vendors_info: worldLine_vendors,
                    }).save();
                });
            }
            if (!request.worldline) {
                request.worldline = {
                    worldline_merchant_id: worldline_merchant_id,
                    worldline_encryption_key: worldline_encryption_key,
                    worldline_encryption_iV: worldline_encryption_iV,
                    worldline_scheme_code: worldline_scheme_code,
                    worldline_token: '',
                };
            }
            else {
                request.worldline.worldline_merchant_id = worldline_merchant_id;
                request.worldline.worldline_encryption_key = worldline_encryption_key;
                request.worldline.worldline_encryption_iV = worldline_encryption_iV;
                request.worldline.worldline_scheme_code = worldline_scheme_code;
                if (!request.worldline.worldline_token) {
                    request.worldline.worldline_token = '';
                }
            }
            await request.save();
            const { url, collect_req } = await this.worldLineService.SingleUrlIntegeration(request);
            try {
                request.payment_data = url;
                await request.save();
            }
            catch (e) {
                console.log(e);
            }
            if (isSelectGateway) {
                non_seamless_payment_links.worldline = url;
            }
            else {
                console.log('false');
                return { url, request: collect_req };
            }
        }
        if (smartgateway_customer_id &&
            smartgateway_merchant_id &&
            smart_gateway_api_key) {
            request.smartgateway_customer_id = smartgateway_customer_id;
            request.smartgateway_merchant_id = smartgateway_merchant_id;
            request.smart_gateway_api_key = smart_gateway_api_key;
            await request.save();
            const data = await this.hdfcSmartgatewayService.createOrder(request, smartgateway_customer_id, smartgateway_merchant_id, smart_gateway_api_key);
            if (isSelectGateway) {
                console.log('smart gateway');
                non_seamless_payment_links.hdfc_smartgateway = data?.url;
            }
            else {
                return { url: data?.url, request: data?.request };
            }
        }
        if (isSelectGateway) {
            console.log({ isEasebuzzNonpartner }, easebuzz_non_partner_cred);
            if (isEasebuzzNonpartner &&
                easebuzz_non_partner_cred &&
                easebuzz_non_partner_cred.easebuzz_key &&
                easebuzz_non_partner_cred.easebuzz_merchant_email &&
                easebuzz_non_partner_cred.easebuzz_submerchant_id) {
                console.log('easebuzz non partner');
                request.easebuzz_sub_merchant_id = easebuzz_non_partner_cred.easebuzz_submerchant_id,
                    request.easebuzz_non_partner = true;
                request.easebuzz_non_partner_cred = easebuzz_non_partner_cred;
                await request.save();
                const schoolName = school_name || ' ';
                const info = await this.easebuzzService.createOrderV2NonSplit(request, platform_charges, schoolName);
                non_seamless_payment_links.edv_easebuzz = info.collect_request_url;
            }
        }
        if (isSelectGateway) {
            if (request.clientId) {
                const transaction = (gateway === collect_request_schema_1.Gateway.PENDING
                    ? await this.edvironPgService.collect(request, platform_charges, school_name, splitPayments || false, vendor, vendorgateway, easebuzzVendors, cashfreeVedors, easebuzz_school_label, isSelectGateway)
                    : await this.hdfcService.collect(request));
                console.log(transaction, 'p');
                await this.databaseService.CollectRequestModel.updateOne({
                    _id: request._id,
                }, {
                    payment_data: JSON.stringify(transaction.url),
                }, { new: true, upsert: true });
                non_seamless_payment_links.edviron_pg = transaction.url;
                request.non_seamless_payment_links = non_seamless_payment_links;
            }
            request.non_seamless_payment_links = non_seamless_payment_links;
            await request.save();
            return {
                url: `${process.env.PG_FRONTEND}/select-gateway?collect_id=${request._id}`, request
            };
        }
        const transaction = (gateway === collect_request_schema_1.Gateway.PENDING
            ? await this.edvironPgService.collect(request, platform_charges, school_name, splitPayments || false, vendor, vendorgateway, easebuzzVendors, cashfreeVedors, easebuzz_school_label)
            : await this.hdfcService.collect(request));
        await this.databaseService.CollectRequestModel.updateOne({
            _id: request._id,
        }, {
            payment_data: JSON.stringify(transaction.url),
        }, { new: true });
        if (isSelectGateway) {
            return {
                url: `${process.env.PG_FRONTEND}/payments/select-gateway?collect_id=${request._id}`,
                request,
            };
        }
        return { url: transaction.url, request };
    }
    async posCollect(amount, callbackUrl, school_id, trustee_id, machine_name, platform_charges, paytm_pos, additional_data, custom_order_id, req_webhook_urls, school_name) {
        const gateway = machine_name === 'PAYTM_POS' ? collect_request_schema_1.Gateway.PAYTM_POS : collect_request_schema_1.Gateway.MOSAMBEE_POS;
        const request = await this.databaseService.CollectRequestModel.create({
            amount,
            callbackUrl,
            gateway: gateway,
            req_webhook_urls,
            school_id,
            trustee_id,
            additional_data: JSON.stringify(additional_data),
            custom_order_id: custom_order_id || null,
            isPosTransaction: true,
        });
        await new this.databaseService.CollectRequestStatusModel({
            collect_id: request._id,
            status: collect_req_status_schema_1.PaymentStatus.PENDING,
            order_amount: request.amount,
            transaction_amount: request.amount,
            payment_method: null,
        }).save();
        if (machine_name === collect_request_schema_1.Gateway.PAYTM_POS) {
            if (paytm_pos) {
                request.paytmPos = paytm_pos;
                request.save();
            }
            return await this.posPaytmService.initiatePOSPayment(request);
        }
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
    async scheduleUpdate(delay, collect_id) {
        console.log(delay);
        setTimeout(async () => {
            try {
                await this.razorpayNonseamlessService.updateOrder(collect_id);
            }
            catch (error) {
                console.log(error.message);
            }
        }, delay);
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
        pos_paytm_service_1.PosPaytmService,
        nttdata_service_1.NttdataService,
        worldline_service_1.WorldlineService,
        razorpay_nonseamless_service_1.RazorpayNonseamlessService,
        gatepay_service_1.GatepayService,
        cashfree_service_1.CashfreeService,
        easebuzz_service_1.EasebuzzService])
], CollectService);
//# sourceMappingURL=collect.service.js.map