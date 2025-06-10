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
exports.CollectRequestSchema = exports.CollectRequest = exports.paytmPos = exports.PaymentIds = exports.Gateway = void 0;
const mongoose_1 = require("@nestjs/mongoose");
var Gateway;
(function (Gateway) {
    Gateway["PHONEPE"] = "PHONEPE";
    Gateway["HDFC"] = "HDFC";
    Gateway["EDVIRON_PG"] = "EDVIRON_PG";
    Gateway["EDVIRON_PAY_U"] = "EDVIRON_PAY_U";
    Gateway["EDVIRON_CCAVENUE"] = "EDVIRON_CCAVENUE";
    Gateway["EDVIRON_CASHFREE"] = "EDVIRON_CASHFREE";
    Gateway["EDVIRON_EASEBUZZ"] = "EDVIRON_EASEBUZZ";
    Gateway["PENDING"] = "PENDING";
    Gateway["EXPIRED"] = "EXPIRED";
    Gateway["EDVIRON_HDFC_RAZORPAY"] = "EDVIRON_HDFC_RAZORPAY";
    Gateway["SMART_GATEWAY"] = "EDVIRON_SMARTGATEWAY";
    Gateway["PAYTM_POS"] = "PAYTM_POS";
    Gateway["MOSAMBEE_POS"] = "MOSAMBEE_POS";
    Gateway["EDVIRON_NTTDATA"] = "EDVIRON_NTTDATA";
    Gateway["EDVIRON_WORLDLINE"] = "EDVIRON_WORLDLINE";
})(Gateway || (exports.Gateway = Gateway = {}));
let PaymentIds = class PaymentIds {
};
exports.PaymentIds = PaymentIds;
__decorate([
    (0, mongoose_1.Prop)({ type: String, required: false }),
    __metadata("design:type", Object)
], PaymentIds.prototype, "cashfree_id", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: String, required: false }),
    __metadata("design:type", Object)
], PaymentIds.prototype, "easebuzz_id", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: String, required: false }),
    __metadata("design:type", Object)
], PaymentIds.prototype, "easebuzz_upi_id", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: String, required: false }),
    __metadata("design:type", Object)
], PaymentIds.prototype, "easebuzz_cc_id", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: String, required: false }),
    __metadata("design:type", Object)
], PaymentIds.prototype, "easebuzz_dc_id", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: String, required: false }),
    __metadata("design:type", Object)
], PaymentIds.prototype, "ccavenue_id", void 0);
exports.PaymentIds = PaymentIds = __decorate([
    (0, mongoose_1.Schema)()
], PaymentIds);
let paytmPos = class paytmPos {
};
exports.paytmPos = paytmPos;
__decorate([
    (0, mongoose_1.Prop)({ type: String, required: false }),
    __metadata("design:type", Object)
], paytmPos.prototype, "paytmMid", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: String, required: false }),
    __metadata("design:type", Object)
], paytmPos.prototype, "paytmTid", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: String, required: false }),
    __metadata("design:type", Object)
], paytmPos.prototype, "channel_id", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: String, required: false }),
    __metadata("design:type", Object)
], paytmPos.prototype, "paytm_merchant_key", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: String, required: false }),
    __metadata("design:type", Object)
], paytmPos.prototype, "device_id", void 0);
exports.paytmPos = paytmPos = __decorate([
    (0, mongoose_1.Schema)()
], paytmPos);
let CollectRequest = class CollectRequest {
};
exports.CollectRequest = CollectRequest;
__decorate([
    (0, mongoose_1.Prop)({ required: true }),
    __metadata("design:type", Number)
], CollectRequest.prototype, "amount", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", Date)
], CollectRequest.prototype, "createdAt", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", Date)
], CollectRequest.prototype, "updatedAt", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true }),
    __metadata("design:type", String)
], CollectRequest.prototype, "callbackUrl", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true, default: Gateway.PHONEPE }),
    __metadata("design:type", String)
], CollectRequest.prototype, "gateway", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: false }),
    __metadata("design:type", String)
], CollectRequest.prototype, "clientId", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: false }),
    __metadata("design:type", String)
], CollectRequest.prototype, "easebuzz_sub_merchant_id", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: false }),
    __metadata("design:type", String)
], CollectRequest.prototype, "clientSecret", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: false }),
    __metadata("design:type", String)
], CollectRequest.prototype, "webHookUrl", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true, default: [] }),
    __metadata("design:type", Array)
], CollectRequest.prototype, "disabled_modes", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: false, default: '' }),
    __metadata("design:type", String)
], CollectRequest.prototype, "additional_data", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true }),
    __metadata("design:type", String)
], CollectRequest.prototype, "school_id", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true }),
    __metadata("design:type", String)
], CollectRequest.prototype, "trustee_id", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: false }),
    __metadata("design:type", String)
], CollectRequest.prototype, "payment_data", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: false, default: false }),
    __metadata("design:type", Boolean)
], CollectRequest.prototype, "sdkPayment", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: false, default: false }),
    __metadata("design:type", Boolean)
], CollectRequest.prototype, "isVBAPayment", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: false, default: false }),
    __metadata("design:type", Boolean)
], CollectRequest.prototype, "isVBAPaymentComplete", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: false, unique: true }),
    __metadata("design:type", String)
], CollectRequest.prototype, "custom_order_id", void 0);
__decorate([
    (0, mongoose_1.Prop)({ default: [] }),
    __metadata("design:type", Array)
], CollectRequest.prototype, "req_webhook_urls", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: false }),
    __metadata("design:type", String)
], CollectRequest.prototype, "ccavenue_merchant_id", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: false }),
    __metadata("design:type", String)
], CollectRequest.prototype, "ccavenue_access_code", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: false }),
    __metadata("design:type", String)
], CollectRequest.prototype, "ccavenue_working_key", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: false }),
    __metadata("design:type", String)
], CollectRequest.prototype, "smartgateway_merchant_id", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: false }),
    __metadata("design:type", String)
], CollectRequest.prototype, "smartgateway_customer_id", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: false }),
    __metadata("design:type", String)
], CollectRequest.prototype, "smart_gateway_api_key", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: false }),
    __metadata("design:type", String)
], CollectRequest.prototype, "deepLink", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: PaymentIds, required: false }),
    __metadata("design:type", PaymentIds)
], CollectRequest.prototype, "paymentIds", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: false }),
    __metadata("design:type", Array)
], CollectRequest.prototype, "vendors_info", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: false }),
    __metadata("design:type", Array)
], CollectRequest.prototype, "easebuzzVendors", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: false }),
    __metadata("design:type", Array)
], CollectRequest.prototype, "cashfreeVedors", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: false }),
    __metadata("design:type", Array)
], CollectRequest.prototype, "worldline_vendors_info", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: false }),
    __metadata("design:type", String)
], CollectRequest.prototype, "hdfc_razorpay_id", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: false }),
    __metadata("design:type", String)
], CollectRequest.prototype, "hdfc_razorpay_secret", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: false }),
    __metadata("design:type", String)
], CollectRequest.prototype, "hdfc_razorpay_payment_id", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: false }),
    __metadata("design:type", String)
], CollectRequest.prototype, "hdfc_razorpay_order_id", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: false }),
    __metadata("design:type", String)
], CollectRequest.prototype, "hdfc_razorpay_mid", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: false, default: false }),
    __metadata("design:type", Boolean)
], CollectRequest.prototype, "isSplitPayments", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: false, default: false }),
    __metadata("design:type", Boolean)
], CollectRequest.prototype, "isQRPayment", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: false }),
    __metadata("design:type", String)
], CollectRequest.prototype, "pay_u_key", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: false }),
    __metadata("design:type", String)
], CollectRequest.prototype, "pay_u_salt", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: false }),
    __metadata("design:type", String)
], CollectRequest.prototype, "easebuzz_split_label", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: false }),
    __metadata("design:type", String)
], CollectRequest.prototype, "pos_machine_name", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: false }),
    __metadata("design:type", String)
], CollectRequest.prototype, "pos_machine_device_id", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: false }),
    __metadata("design:type", String)
], CollectRequest.prototype, "pos_machine_device_code", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: false, default: false }),
    __metadata("design:type", Boolean)
], CollectRequest.prototype, "isPosTransaction", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: paytmPos, required: false }),
    __metadata("design:type", paytmPos)
], CollectRequest.prototype, "paytmPos", void 0);
__decorate([
    (0, mongoose_1.Prop)({
        required: false,
        type: {
            nttdata_id: { type: String, required: false, default: null },
            nttdata_secret: { type: String, required: false, default: null },
            ntt_atom_token: { type: String, required: false, default: null },
            ntt_atom_txn_id: { type: String, required: false, default: null },
            nttdata_hash_req_key: { type: String, required: false, default: null },
            nttdata_req_salt: { type: String, required: false, default: null },
            nttdata_hash_res_key: { type: String, required: false, default: null },
            nttdata_res_salt: { type: String, required: false, default: null },
        },
        _id: false,
    }),
    __metadata("design:type", Object)
], CollectRequest.prototype, "ntt_data", void 0);
__decorate([
    (0, mongoose_1.Prop)({
        required: false,
        type: {
            worldline_merchant_id: { type: String, required: false, default: null },
            worldline_encryption_key: {
                type: String,
                required: false,
                default: null,
            },
            worldline_encryption_iV: { type: String, required: false, default: null },
            worldline_token: { type: String, required: false, default: null },
        },
        _id: false,
    }),
    __metadata("design:type", Object)
], CollectRequest.prototype, "worldline", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: false }),
    __metadata("design:type", String)
], CollectRequest.prototype, "worldline_token", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: false }),
    __metadata("design:type", String)
], CollectRequest.prototype, "vba_account_number", void 0);
exports.CollectRequest = CollectRequest = __decorate([
    (0, mongoose_1.Schema)({ timestamps: true })
], CollectRequest);
exports.CollectRequestSchema = mongoose_1.SchemaFactory.createForClass(CollectRequest);
const dummy = {
    msg: 'fd2183845d31196291ad62be8cebb4a50fd84e94caedb9380bd010519a25225031a27db2ebfa589bfb4acb3b9ba1f0ca3265d6b946a1489f0bb74785516a8ba0b9b370fe139dd1e99dc731937b4062185f201859628a553602731d7ffaa03b09b917d52797839c845780cef50639f3865aeb3701d9f2351cc9878b4b366a2eb1064c7b0682c0eceaf7a0a0cb57bfa41bce008964f8ea902479f46c1fdaf07082c4af5a07fb721bc685feb47a533e49d5207b72f6e32d9eb6d21406e6adbc05bede96611c1de80339cf90447ec79fda0067e5ce3f6096fe5d250dc99e45a79c2973a6a200e4de4c262a6e0a14070ac27ea2443c3dd3aa538ec48142481d3e704ddb42350ac480b403ee03900e4083254148ecc90594ebf77f3ef1ca1727c1fd3b5ee97f9ba647be89bfe280e30e786452589a38c22c9a887529de895fd62b3a2a153933d5f33b9e018b98e3049825cdb90001b8d53a7c70df688fe17e73210c170c0117e910eb0ea7b1ef4f5d17f54df9084356fbd7f1aad7e05bca1c84d74fea7f85b73109338fdbd72a769cd13964e4b85ad8dc4d82ab3030fe84fae3f18e5d865a2919456f48626a9e20be9a9d8dee78b199b94b79fcf5caa29fddbc949f14570d02fa65eb11b26bab4eec7f4315ace373fa7461e8dc3b064598e869843029d08876cb3982609c508a3704cf073dd86715a1d0cdb11bd3a545c626d60423e21822d6bd54c91d8a63077ddd03fc20638ff1bb032ac8ea41395fd9a981ab66177a2e6248c1830143e953d1fd25f2e21c7dcc04c861c814c4e2498d491d9818bba2a080b49070766ab5a6b199acbcc07da3175bd2ff3e5ec3ca1fa3a88c14cb456e3eabd7bbbb53ac3e264a2f376806f317caa0bb77601fca3cfb53af6ea4086704aad288e80c36399b932098b371bef910e25bfce7ff6569440fb8ad7e1cee493fc384b1630c0cf907e3a9113c2c7b4b1ec41b380e0f651071243450a784598d41bfbac7898c0860ad7dc41020d95c14347f83ee988521c34042d347c21683160e4378b40c68d4062dac5531f3891953e33e4a87ace406b03baf0dd91d8fd59e2029e995220fa0e945983a96ff476b3e09a3cc90cee66203733ed7afb04dd8ae9750ac827a22ae7881f81adb605456c07bcca3808bbda810dc6a66d4570b1f2969e2e53bdfd8046ecd19928e3e1ddc17ee868648062dcacb1c6cc7df08734bec19347da33276617c272608005e94611029d54041c7c392c850cecf5474f198c31a40105c5fa31fc731aa21c802eb460b25cc46c389840c3ac8aace621eefe7985d6ae17cc8524ca5b760a59c870415b1bc32b60c3f2f5dd9b7eef8b6feb5dbd57af0ecb5400c14698a730a9fb4dbcb0b7e4624b0800d33c3cc4d8fe560e28302896610f0ed549e9eff49d9f467b1955b5feaea8ec2b8c094b9dc4ba60e0a39c0bc062c985a27c9282c58573dc14eba0154114ebe368a1e19432f0de937d11eb078719da36e18b8d1cffab81789e1d6c7466d3d2101c788f471984230bae2c07a877bd07a203a51d3751c3d6f864fb612818c36e730e37f713ba69c79a0272c6a48d9720e4354ec77a588ffead2060b491aab42962f7a63461b7fd436e427f8d346877492302ececbdb92e99122b2d4c0d6ed6cfe91d08228ebcaf09316fc1d42baa80ccd650291737c40675e70fd06c2d21772a8e1699bc9398a8d69762303c1884842f31ccb245acd4704136049faece338efdb090be59972bce05ebac607197b8a54ab88472a5c5c476d9568ca2eeaba98c1b809cdf8120162d3e89fd10bb80108a56a0d2a80a0342ae04d22d50ee8d7172aeb5a36bbbde17c373cf952f9a9180313c1d742b3c11ee59139384abd5173e94d43ecfe5b3ffebac9b4f535c76087d67a57b0030cf846e84759b9579bcf3fbf1049a8546ede35ca8f00bd0e94078a7ebab6fd0ff484485cee8eed070c51b72ceec8962861f8e06d4dd98388562daaa5dc22e981bbb7a9e9749ff936615ce562890a93f24fd985207aa406bd638bbea81eee848356c0505881170857b3ac5634909b1dea1602076c9f66f2b60628a84c44caaf9efc0d0119969ea41ecce3b1918294ed124db4f4097501700fa1b5c612ed4176ed564bad7357b88be78377af3c8e4b9680bbe2a6a6b0594b31780658b1934161973ae9b08a8f0f1e5f6b9ff3bd78aa9f05df4cc5b8cb30faa0c71070d524f7f1ac41369845cf2c44d521a585a6fd3fd84b0b9b9810f5d1dbef269e42a24973ecc98f04d2adc2108373287c120ea7084fe99868286c59e280824914',
    tpsl_mrct_cd: 'L1079940',
};
const d2 = {
    merchantCode: 'L1079940',
    merchantTransactionIdentifier: '6847d32ed3c85e46a4804273',
    merchantTransactionRequestType: 'T',
    responseType: 'web',
    transactionState: 'F',
    merchantAdditionalDetails: 'NA{consent:N}',
    paymentMethod: {
        token: '282b713e-b694-449b-8b9d-8ba0b21f629e',
        instrumentAliasName: 'Card-VISA',
        instrumentToken: '',
        bankSelectionCode: '34120',
        paymentMode: 'Credit card',
        aCS: null,
        oTP: null,
        paymentTransaction: {
            amount: '2.02',
            balanceAmount: '0.00',
            bankReferenceIdentifier: '516106550375',
            dateTime: '10-06-2025 12:10:19',
            errorMessage: '',
            identifier: '659285794',
            refundIdentifier: '',
            statusCode: '0300',
            statusMessage: 'success',
            instruction: null,
            reference: '659285794',
            refundDdetails: null,
            otherDetails: {
                relatedTranDetails: [],
            },
            rrnNumber: null,
            authCode: '',
            retTranStatus: null,
            paymentDate: null,
            bankName: null,
            paymentModeCode: null,
            cardType: null,
            cardExpiry: null,
            mandateId: '',
            cardTokenStatus: '',
            tranChargesNONINR: null,
            serviceTaxNONINR: null,
            currencyCRN: null,
            nonINRAMTwithout_tax: null,
            nonINRAMTwith_tax: null,
            upfrontChargeFlg: null,
        },
        authentication: null,
        error: {
            code: '',
            desc: '',
        },
        desItc: null,
        walletDetails: null,
        upi: null,
    },
    error: null,
    merchantResponseString: null,
};
const dc = {
    merchantCode: 'L1079940',
    merchantTransactionIdentifier: '6847d5704f17b46b90923e26',
    merchantTransactionRequestType: 'T',
    responseType: 'web',
    transactionState: 'F',
    merchantAdditionalDetails: 'NA{consent:N}',
    paymentMethod: {
        token: 'b057df28-131d-46e4-a3ce-45ae079cd0fc',
        instrumentAliasName: 'Card-VISA',
        instrumentToken: '',
        bankSelectionCode: '34130',
        paymentMode: 'Debit card',
        aCS: null,
        oTP: null,
        paymentTransaction: {
            amount: '2.00',
            balanceAmount: '0.00',
            bankReferenceIdentifier: '516106560899',
            dateTime: '10-06-2025 12:20:17',
            errorMessage: '',
            identifier: '659293689',
            refundIdentifier: '',
            statusCode: '0399',
            statusMessage: 'failure',
            instruction: null,
            reference: '659293689',
            refundDdetails: null,
            otherDetails: {
                relatedTranDetails: [],
            },
            rrnNumber: null,
            authCode: '',
            retTranStatus: null,
            paymentDate: null,
            bankName: null,
            paymentModeCode: null,
            cardType: null,
            cardExpiry: null,
            mandateId: '',
            cardTokenStatus: '',
            tranChargesNONINR: null,
            serviceTaxNONINR: null,
            currencyCRN: null,
            nonINRAMTwithout_tax: null,
            nonINRAMTwith_tax: null,
            upfrontChargeFlg: null,
        },
        authentication: null,
        error: {
            code: 'Transaction Cancelled at Bank end',
            desc: '',
        },
        desItc: null,
        walletDetails: null,
        upi: null,
    },
    error: null,
    merchantResponseString: null,
};
//# sourceMappingURL=collect_request.schema.js.map