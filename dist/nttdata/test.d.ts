declare const log: {
    id: string;
    date_created: string;
    content: {
        order: {
            udf4: string;
            resp_category: null;
            payer_vpa: string;
            emi_details: {
                bank: null;
                monthly_payment: null;
                interest: null;
                conversion_details: null;
                principal_amount: null;
                additional_processing_fee_info: null;
                tenure: null;
                subvention_info: never[];
                emi_type: null;
                processed_by: null;
            };
            txn_detail: {
                txn_flow_type: string;
                gateway: string;
                error_message: string;
                status: string;
                last_updated: string;
                txn_amount: number;
                txn_uuid: string;
                gateway_id: number;
                error_code: null;
                metadata: {
                    payment_channel: string;
                };
                surcharge_amount: null;
                currency: string;
                tax_amount: null;
                created: string;
                txn_amount_breakup: {
                    sno: number;
                    method: string;
                    name: string;
                    amount: number;
                }[];
                express_checkout: boolean;
                offer_deduction_amount: null;
                redirect: boolean;
                order_id: string;
                remaining_refundable_amount: number;
                txn_id: string;
                net_amount: number;
            };
            maximum_eligible_refund_amount: number;
            udf8: string;
            udf3: string;
            udf6: string;
            offers: never[];
            bank_error_code: string;
            status: string;
            order_expiry: string;
            bank_error_message: string;
            payer_app_name: null;
            id: string;
            return_url: string;
            last_updated: string;
            txn_uuid: string;
            gateway_id: number;
            conflicted: boolean;
            metadata: {
                order_expiry: string;
                payment_page_client_id: string;
                payment_links: {
                    mobile: string;
                    web: string;
                    iframe: string;
                };
                merchant_payload: {
                    customerEmail: string;
                    customerPhone: string;
                };
                payment_page_sdk_payload: {
                    firstName: string;
                    displayBusinessAs: string;
                    currency: string;
                    service: string;
                    description: string;
                    lastName: string;
                    amount: number;
                    action: string;
                    collectAvsInfo: boolean;
                };
            };
            currency: string;
            date_created: string;
            resp_message: null;
            udf2: string;
            payment_links: {
                mobile: string;
                web: string;
                iframe: string;
            };
            customer_email: null;
            customer_phone: null;
            udf5: string;
            status_id: number;
            merchant_id: string;
            resp_code: null;
            udf9: string;
            amount: number;
            gateway_reference_id: null;
            refunded: boolean;
            auth_type: string;
            order_id: string;
            payment_method: string;
            udf7: string;
            additional_info: {};
            upi: {
                txn_flow_type: string;
                payer_vpa: string;
            };
            udf10: string;
            payment_gateway_response: {
                epg_txn_id: string;
                network_error_code: string;
                auth_ref_num: null;
                arn: null;
                eci: null;
                resp_message: string;
                created: string;
                current_blocked_amount: null;
                rrn: string;
                umrn: null;
                resp_code: string;
                network_error_message: null;
                gateway_merchant_id: string;
                auth_id_code: string;
                txn_id: string;
            };
            effective_amount: number;
            txn_id: string;
            product_id: string;
            customer_id: string;
            payment_method_type: string;
            amount_refunded: number;
            udf1: string;
        };
    };
    event_name: string;
};
