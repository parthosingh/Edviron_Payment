/// <reference types="mongoose/types/aggregate" />
/// <reference types="mongoose/types/callback" />
/// <reference types="mongoose/types/collection" />
/// <reference types="mongoose/types/connection" />
/// <reference types="mongoose/types/cursor" />
/// <reference types="mongoose/types/document" />
/// <reference types="mongoose/types/error" />
/// <reference types="mongoose/types/expressions" />
/// <reference types="mongoose/types/helpers" />
/// <reference types="mongoose/types/middlewares" />
/// <reference types="mongoose/types/indexes" />
/// <reference types="mongoose/types/models" />
/// <reference types="mongoose/types/mongooseoptions" />
/// <reference types="mongoose/types/pipelinestage" />
/// <reference types="mongoose/types/populate" />
/// <reference types="mongoose/types/query" />
/// <reference types="mongoose/types/schemaoptions" />
/// <reference types="mongoose/types/schematypes" />
/// <reference types="mongoose/types/session" />
/// <reference types="mongoose/types/types" />
/// <reference types="mongoose/types/utility" />
/// <reference types="mongoose/types/validation" />
/// <reference types="mongoose/types/virtuals" />
/// <reference types="mongoose/types/inferschematype" />
import { CollectRequest } from '../database/schemas/collect_request.schema';
import { GatewayService } from '../types/gateway.type';
import { Transaction } from '../types/transaction';
import { DatabaseService } from '../database/database.service';
import { TransactionStatus } from '../types/transactionStatus';
import { platformChange } from 'src/collect/collect.controller';
import { CashfreeService } from 'src/cashfree/cashfree.service';
import { Types } from 'mongoose';
import { RazorpayService } from '../razorpay/razorpay.service';
export declare class EdvironPgService implements GatewayService {
    private readonly databaseService;
    private readonly cashfreeService;
    private readonly razorpayService;
    constructor(databaseService: DatabaseService, cashfreeService: CashfreeService, razorpayService: RazorpayService);
    collect(request: CollectRequest, platform_charges: platformChange[], school_name: any, splitPayments: boolean, vendor?: [
        {
            vendor_id: string;
            percentage?: number;
            amount?: number;
            name?: string;
        }
    ], vendorgateway?: {
        easebuzz: boolean;
        cashfree: boolean;
    }, easebuzzVendors?: [
        {
            vendor_id: string;
            amount?: number;
            name?: string;
        }
    ], cashfreeVedors?: [
        {
            vendor_id: string;
            percentage?: number;
            amount?: number;
            name?: string;
        }
    ], easebuzz_school_label?: string | null, isSelectGateway?: boolean | null): Promise<Transaction | undefined>;
    checkStatus(collect_request_id: String, collect_request: CollectRequest): Promise<{
        status: TransactionStatus;
        amount: number;
        transaction_amount?: number;
        status_code?: number;
        details?: any;
        custom_order_id?: string;
    }>;
    terminateOrder(collect_id: string): Promise<boolean>;
    easebuzzCheckStatus(collect_request_id: String, collect_request: CollectRequest): Promise<any>;
    getPaymentDetails(school_id: string, startDate: string, mode: string): Promise<any[]>;
    getQr(collect_id: string, request: CollectRequest, ezb_split_payments: {
        [key: string]: number;
    }): Promise<void>;
    getSchoolInfo(school_id: string): Promise<any>;
    getAllSchoolInfo(school_id: string): Promise<any>;
    sendTransactionmail(email: string, request: CollectRequest): Promise<string>;
    sendErpWebhook(webHookUrl: string[], webhookData: any, webhook_key?: string | null): Promise<void>;
    test(): Promise<void>;
    createVendor(client_id: string, vendor_info: {
        vendor_id: string;
        status: string;
        name: string;
        email: string;
        phone: string;
        verify_account: string;
        dashboard_access: string;
        schedule_option: number;
        bank: {
            account_number: string;
            account_holder: string;
            ifsc: string;
        };
        kyc_details: {
            account_type: string;
            business_type: string;
            uidai?: string;
            gst?: string;
            cin?: string;
            pan?: string;
            passport_number?: string;
        };
    }): Promise<any>;
    checkCreatedVendorStatus(vendor_id: string, client_id: string): Promise<{
        name: any;
        email: any;
        vendor_id: any;
        status: any;
    }>;
    convertISTStartToUTC(dateStr: string): Promise<string>;
    convertISTEndToUTC(dateStr: string): Promise<string>;
    getVendorTransactions(query: any, limit: number, page: number, payment_modes?: string[]): Promise<{
        vendorsTransaction: any[];
        totalCount: number;
        page: number;
        limit: number;
        totalPages: number;
    }>;
    getSingleTransactionInfo(collect_id: string): Promise<any[]>;
    getPaymentId(collect_id: string, request: CollectRequest): Promise<any>;
    getTransactionReportBatched(trustee_id: string, start_date: string, end_date: string, status?: string | null, school_id?: string[]): Promise<{
        length: number;
        transactions: any[];
    }>;
    subtrusteeTransactionAggregation(trustee_id: string, start_date: string, end_date: string, school_id: string[], status?: string | null, mode?: string[] | null, isQRPayment?: boolean | null, gateway?: string[] | null): Promise<{
        transactions: any;
    }>;
    getTransactionReportBatchedFilterdV2(trustee_id: string, start_date: string, end_date: string, status?: string | null, school_id?: string[] | null, mode?: string[] | null, isQRPayment?: boolean | null, gateway?: string[] | null): Promise<{
        length: number;
        transactions: any[];
    }>;
    getTransactionReportBatchedFilterd(trustee_id: string, start_date: string, end_date: string, status?: string | null, school_id?: string | null, mode?: string[] | null, isQRPayment?: boolean | null, gateway?: string[] | null): Promise<{
        length: number;
        transactions: any[];
    }>;
    generateBacthTransactions(trustee_id: string, start_date: string, end_date: string, status?: string | null): Promise<{
        transactions: any[];
        totalTransactions: number;
        month: string;
        year: string;
    }>;
    generateMerchantBacthTransactions(school_id: string, start_date: string, end_date: string, status?: string | null): Promise<{
        transactions: any[];
        totalTransactions: number;
        month: string;
        year: string;
    }>;
    getBatchTransactions(trustee_id: string, year: string): Promise<(import("mongoose").Document<unknown, {}, import("../database/schemas/batch.transactions.schema").BatchTransactionsDocument> & import("../database/schemas/batch.transactions.schema").BatchTransactions & Document & Required<{
        _id: import("mongoose").Schema.Types.ObjectId;
    }>)[]>;
    getMerchantBatchTransactions(school_id: string, year: string): Promise<(import("mongoose").Document<unknown, {}, import("../database/schemas/batch.transactions.schema").BatchTransactionsDocument> & import("../database/schemas/batch.transactions.schema").BatchTransactions & Document & Required<{
        _id: import("mongoose").Schema.Types.ObjectId;
    }>)[]>;
    getSUbTrusteeBatchTransactions(school_id: string[], year: string): Promise<(import("mongoose").Document<unknown, {}, import("../database/schemas/batch.transactions.schema").BatchTransactionsDocument> & import("../database/schemas/batch.transactions.schema").BatchTransactions & Document & Required<{
        _id: import("mongoose").Schema.Types.ObjectId;
    }>)[]>;
    getSubTrusteeBatchTransactions(school_ids: string[], year: string): Promise<any>;
    getSingleTransaction(collect_id: string): Promise<any>;
    sendMailAfterTransaction(collect_id: string): Promise<boolean>;
    retriveEasebuzz(txnid: string, key: string, salt: string): Promise<any>;
    getNonpartnerStatus(collect_id: string): Promise<{
        status: String;
        status_code: number;
        custom_order_id: string;
        amount: Number;
        transaction_amount: Number;
        details: {
            payment_mode: String;
            bank_ref: string;
            payment_methods: any;
            transaction_time: string;
            formattedTransactionDate: string;
            order_status: String;
            isSettlementComplete: null;
            transfer_utr: null;
            service_charge: null;
        };
        capture_status: String;
        installments: {
            school_id: string;
            collect_id: import("mongoose").FlattenMaps<CollectRequest>;
            trustee_id: string;
            student_id: string;
            student_name: string;
            status: string;
            student_number: string;
            student_email: string;
            additional_data: string;
            amount: number;
            net_amount: number;
            discount: number;
            year: string;
            callback_url: string;
            month: string;
            fee_heads: import("mongoose").FlattenMaps<{
                label: string;
                amount: number;
                net_amount: number;
                discount: number;
            }>[];
            label: string;
            gst: string;
            webhook_url: string;
            isSplitPayments: boolean;
            preSelected: boolean;
            vendors_info?: [import("mongoose").FlattenMaps<{
                vendor_id: string;
                amount: number;
                name: string;
            }>] | undefined;
            easebuzzVendors?: [import("mongoose").FlattenMaps<{
                vendor_id: string;
                amount: number;
                name: string;
            }>] | undefined;
            cashfreeVedors?: [import("mongoose").FlattenMaps<{
                vendor_id: string;
                amount: number;
                name: string;
            }>] | undefined;
            URL: string;
            alinkColor: string;
            all: import("mongoose").FlattenMaps<HTMLAllCollection>;
            anchors: import("mongoose").FlattenMaps<HTMLCollectionOf<HTMLAnchorElement>>;
            applets: import("mongoose").FlattenMaps<HTMLCollection>;
            bgColor: string;
            body: import("mongoose").FlattenMaps<HTMLElement>;
            characterSet: string;
            charset: string;
            compatMode: string;
            contentType: string;
            cookie: string;
            currentScript: import("mongoose").FlattenMaps<HTMLScriptElement> | import("mongoose").FlattenMaps<SVGScriptElement> | null;
            defaultView: import("mongoose").FlattenMaps<Window & typeof globalThis> | null;
            designMode: string;
            dir: string;
            doctype: import("mongoose").FlattenMaps<DocumentType> | null;
            documentElement: import("mongoose").FlattenMaps<HTMLElement>;
            documentURI: string;
            domain: string;
            embeds: import("mongoose").FlattenMaps<HTMLCollectionOf<HTMLEmbedElement>>;
            fgColor: string;
            forms: import("mongoose").FlattenMaps<HTMLCollectionOf<HTMLFormElement>>;
            fullscreen: boolean;
            fullscreenEnabled: boolean;
            head: import("mongoose").FlattenMaps<HTMLHeadElement>;
            hidden: boolean;
            images: import("mongoose").FlattenMaps<HTMLCollectionOf<HTMLImageElement>>;
            implementation: import("mongoose").FlattenMaps<DOMImplementation>;
            inputEncoding: string;
            lastModified: string;
            linkColor: string;
            links: import("mongoose").FlattenMaps<HTMLCollectionOf<HTMLAnchorElement | HTMLAreaElement>>;
            location: import("mongoose").FlattenMaps<Location>;
            onfullscreenchange: ((this: Document, ev: Event) => any) | null;
            onfullscreenerror: ((this: Document, ev: Event) => any) | null;
            onpointerlockchange: ((this: Document, ev: Event) => any) | null;
            onpointerlockerror: ((this: Document, ev: Event) => any) | null;
            onreadystatechange: ((this: Document, ev: Event) => any) | null;
            onvisibilitychange: ((this: Document, ev: Event) => any) | null;
            ownerDocument: null;
            pictureInPictureEnabled: boolean;
            plugins: import("mongoose").FlattenMaps<HTMLCollectionOf<HTMLEmbedElement>>;
            readyState: DocumentReadyState;
            referrer: string;
            rootElement: import("mongoose").FlattenMaps<SVGSVGElement> | null;
            scripts: import("mongoose").FlattenMaps<HTMLCollectionOf<HTMLScriptElement>>;
            scrollingElement: import("mongoose").FlattenMaps<Element> | null;
            timeline: import("mongoose").FlattenMaps<DocumentTimeline>;
            title: string;
            visibilityState: DocumentVisibilityState;
            vlinkColor: string;
            adoptNode: <T extends Node>(node: T) => T;
            captureEvents: () => void;
            caretRangeFromPoint: (x: number, y: number) => Range | null;
            clear: () => void;
            close: () => void;
            createAttribute: (localName: string) => Attr;
            createAttributeNS: (namespace: string | null, qualifiedName: string) => Attr;
            createCDATASection: (data: string) => CDATASection;
            createComment: (data: string) => Comment;
            createDocumentFragment: () => DocumentFragment;
            createElement: {
                <K extends keyof HTMLElementTagNameMap>(tagName: K, options?: ElementCreationOptions | undefined): HTMLElementTagNameMap[K];
                <K_1 extends keyof HTMLElementDeprecatedTagNameMap>(tagName: K_1, options?: ElementCreationOptions | undefined): HTMLElementDeprecatedTagNameMap[K_1];
                (tagName: string, options?: ElementCreationOptions | undefined): HTMLElement;
            };
            createElementNS: {
                (namespaceURI: "http://www.w3.org/1999/xhtml", qualifiedName: string): HTMLElement;
                <K_2 extends keyof SVGElementTagNameMap>(namespaceURI: "http://www.w3.org/2000/svg", qualifiedName: K_2): SVGElementTagNameMap[K_2];
                (namespaceURI: "http://www.w3.org/2000/svg", qualifiedName: string): SVGElement;
                <K_3 extends keyof MathMLElementTagNameMap>(namespaceURI: "http://www.w3.org/1998/Math/MathML", qualifiedName: K_3): MathMLElementTagNameMap[K_3];
                (namespaceURI: "http://www.w3.org/1998/Math/MathML", qualifiedName: string): MathMLElement;
                (namespaceURI: string | null, qualifiedName: string, options?: ElementCreationOptions | undefined): Element;
                (namespace: string | null, qualifiedName: string, options?: string | ElementCreationOptions | undefined): Element;
            };
            createEvent: {
                (eventInterface: "AnimationEvent"): AnimationEvent;
                (eventInterface: "AnimationPlaybackEvent"): AnimationPlaybackEvent;
                (eventInterface: "AudioProcessingEvent"): AudioProcessingEvent;
                (eventInterface: "BeforeUnloadEvent"): BeforeUnloadEvent;
                (eventInterface: "BlobEvent"): BlobEvent;
                (eventInterface: "ClipboardEvent"): ClipboardEvent;
                (eventInterface: "CloseEvent"): CloseEvent;
                (eventInterface: "CompositionEvent"): CompositionEvent;
                (eventInterface: "CustomEvent"): CustomEvent<any>;
                (eventInterface: "DeviceMotionEvent"): DeviceMotionEvent;
                (eventInterface: "DeviceOrientationEvent"): DeviceOrientationEvent;
                (eventInterface: "DragEvent"): DragEvent;
                (eventInterface: "ErrorEvent"): ErrorEvent;
                (eventInterface: "Event"): Event;
                (eventInterface: "Events"): Event;
                (eventInterface: "FocusEvent"): FocusEvent;
                (eventInterface: "FontFaceSetLoadEvent"): FontFaceSetLoadEvent;
                (eventInterface: "FormDataEvent"): FormDataEvent;
                (eventInterface: "GamepadEvent"): GamepadEvent;
                (eventInterface: "HashChangeEvent"): HashChangeEvent;
                (eventInterface: "IDBVersionChangeEvent"): IDBVersionChangeEvent;
                (eventInterface: "InputEvent"): InputEvent;
                (eventInterface: "KeyboardEvent"): KeyboardEvent;
                (eventInterface: "MIDIConnectionEvent"): MIDIConnectionEvent;
                (eventInterface: "MIDIMessageEvent"): MIDIMessageEvent;
                (eventInterface: "MediaEncryptedEvent"): MediaEncryptedEvent;
                (eventInterface: "MediaKeyMessageEvent"): MediaKeyMessageEvent;
                (eventInterface: "MediaQueryListEvent"): MediaQueryListEvent;
                (eventInterface: "MediaStreamTrackEvent"): MediaStreamTrackEvent;
                (eventInterface: "MessageEvent"): MessageEvent<any>;
                (eventInterface: "MouseEvent"): MouseEvent;
                (eventInterface: "MouseEvents"): MouseEvent;
                (eventInterface: "MutationEvent"): MutationEvent;
                (eventInterface: "MutationEvents"): MutationEvent;
                (eventInterface: "OfflineAudioCompletionEvent"): OfflineAudioCompletionEvent;
                (eventInterface: "PageTransitionEvent"): PageTransitionEvent;
                (eventInterface: "PaymentMethodChangeEvent"): PaymentMethodChangeEvent;
                (eventInterface: "PaymentRequestUpdateEvent"): PaymentRequestUpdateEvent;
                (eventInterface: "PictureInPictureEvent"): PictureInPictureEvent;
                (eventInterface: "PointerEvent"): PointerEvent;
                (eventInterface: "PopStateEvent"): PopStateEvent;
                (eventInterface: "ProgressEvent"): ProgressEvent<EventTarget>;
                (eventInterface: "PromiseRejectionEvent"): PromiseRejectionEvent;
                (eventInterface: "RTCDTMFToneChangeEvent"): RTCDTMFToneChangeEvent;
                (eventInterface: "RTCDataChannelEvent"): RTCDataChannelEvent;
                (eventInterface: "RTCErrorEvent"): RTCErrorEvent;
                (eventInterface: "RTCPeerConnectionIceErrorEvent"): RTCPeerConnectionIceErrorEvent;
                (eventInterface: "RTCPeerConnectionIceEvent"): RTCPeerConnectionIceEvent;
                (eventInterface: "RTCTrackEvent"): RTCTrackEvent;
                (eventInterface: "SecurityPolicyViolationEvent"): SecurityPolicyViolationEvent;
                (eventInterface: "SpeechSynthesisErrorEvent"): SpeechSynthesisErrorEvent;
                (eventInterface: "SpeechSynthesisEvent"): SpeechSynthesisEvent;
                (eventInterface: "StorageEvent"): StorageEvent;
                (eventInterface: "SubmitEvent"): SubmitEvent;
                (eventInterface: "ToggleEvent"): ToggleEvent;
                (eventInterface: "TouchEvent"): TouchEvent;
                (eventInterface: "TrackEvent"): TrackEvent;
                (eventInterface: "TransitionEvent"): TransitionEvent;
                (eventInterface: "UIEvent"): UIEvent;
                (eventInterface: "UIEvents"): UIEvent;
                (eventInterface: "WebGLContextEvent"): WebGLContextEvent;
                (eventInterface: "WheelEvent"): WheelEvent;
                (eventInterface: string): Event;
            };
            createNodeIterator: (root: Node, whatToShow?: number | undefined, filter?: NodeFilter | null | undefined) => NodeIterator;
            createProcessingInstruction: (target: string, data: string) => ProcessingInstruction;
            createRange: () => Range;
            createTextNode: (data: string) => Text;
            createTreeWalker: (root: Node, whatToShow?: number | undefined, filter?: NodeFilter | null | undefined) => TreeWalker;
            execCommand: (commandId: string, showUI?: boolean | undefined, value?: string | undefined) => boolean;
            exitFullscreen: () => Promise<void>;
            exitPictureInPicture: () => Promise<void>;
            exitPointerLock: () => void;
            getElementById: (elementId: string) => HTMLElement | null;
            getElementsByClassName: (classNames: string) => HTMLCollectionOf<Element>;
            getElementsByName: (elementName: string) => NodeListOf<HTMLElement>;
            getElementsByTagName: {
                <K_4 extends keyof HTMLElementTagNameMap>(qualifiedName: K_4): HTMLCollectionOf<HTMLElementTagNameMap[K_4]>;
                <K_5 extends keyof SVGElementTagNameMap>(qualifiedName: K_5): HTMLCollectionOf<SVGElementTagNameMap[K_5]>;
                <K_6 extends keyof MathMLElementTagNameMap>(qualifiedName: K_6): HTMLCollectionOf<MathMLElementTagNameMap[K_6]>;
                <K_7 extends keyof HTMLElementDeprecatedTagNameMap>(qualifiedName: K_7): HTMLCollectionOf<HTMLElementDeprecatedTagNameMap[K_7]>;
                (qualifiedName: string): HTMLCollectionOf<Element>;
            };
            getElementsByTagNameNS: {
                (namespaceURI: "http://www.w3.org/1999/xhtml", localName: string): HTMLCollectionOf<HTMLElement>;
                (namespaceURI: "http://www.w3.org/2000/svg", localName: string): HTMLCollectionOf<SVGElement>;
                (namespaceURI: "http://www.w3.org/1998/Math/MathML", localName: string): HTMLCollectionOf<MathMLElement>;
                (namespace: string | null, localName: string): HTMLCollectionOf<Element>;
            };
            getSelection: () => Selection | null;
            hasFocus: () => boolean;
            hasStorageAccess: () => Promise<boolean>;
            importNode: <T_1 extends Node>(node: T_1, deep?: boolean | undefined) => T_1;
            open: {
                (unused1?: string | undefined, unused2?: string | undefined): Document;
                (url: string | URL, name: string, features: string): Window | null;
            };
            queryCommandEnabled: (commandId: string) => boolean;
            queryCommandIndeterm: (commandId: string) => boolean;
            queryCommandState: (commandId: string) => boolean;
            queryCommandSupported: (commandId: string) => boolean;
            queryCommandValue: (commandId: string) => string;
            releaseEvents: () => void;
            requestStorageAccess: () => Promise<void>;
            write: (...text: string[]) => void;
            writeln: (...text: string[]) => void;
            addEventListener: {
                <K_8 extends keyof DocumentEventMap>(type: K_8, listener: (this: Document, ev: DocumentEventMap[K_8]) => any, options?: boolean | AddEventListenerOptions | undefined): void;
                (type: string, listener: EventListenerOrEventListenerObject, options?: boolean | AddEventListenerOptions | undefined): void;
            };
            removeEventListener: {
                <K_9 extends keyof DocumentEventMap>(type: K_9, listener: (this: Document, ev: DocumentEventMap[K_9]) => any, options?: boolean | EventListenerOptions | undefined): void;
                (type: string, listener: EventListenerOrEventListenerObject, options?: boolean | EventListenerOptions | undefined): void;
            };
            baseURI: string;
            childNodes: import("mongoose").FlattenMaps<NodeListOf<ChildNode>>;
            firstChild: import("mongoose").FlattenMaps<ChildNode> | null;
            isConnected: boolean;
            lastChild: import("mongoose").FlattenMaps<ChildNode> | null;
            nextSibling: import("mongoose").FlattenMaps<ChildNode> | null;
            nodeName: string;
            nodeType: number;
            nodeValue: string | null;
            parentElement: import("mongoose").FlattenMaps<HTMLElement> | null;
            parentNode: import("mongoose").FlattenMaps<ParentNode> | null;
            previousSibling: import("mongoose").FlattenMaps<ChildNode> | null;
            textContent: string | null;
            appendChild: <T_2 extends Node>(node: T_2) => T_2;
            cloneNode: (deep?: boolean | undefined) => Node;
            compareDocumentPosition: (other: Node) => number;
            contains: (other: Node | null) => boolean;
            getRootNode: (options?: GetRootNodeOptions | undefined) => Node;
            hasChildNodes: () => boolean;
            insertBefore: <T_3 extends Node>(node: T_3, child: Node | null) => T_3;
            isDefaultNamespace: (namespace: string | null) => boolean;
            isEqualNode: (otherNode: Node | null) => boolean;
            isSameNode: (otherNode: Node | null) => boolean;
            lookupNamespaceURI: (prefix: string | null) => string | null;
            lookupPrefix: (namespace: string | null) => string | null;
            normalize: () => void;
            removeChild: <T_4 extends Node>(child: T_4) => T_4;
            replaceChild: <T_5 extends Node>(node: Node, child: T_5) => T_5;
            ELEMENT_NODE: 1;
            ATTRIBUTE_NODE: 2;
            TEXT_NODE: 3;
            CDATA_SECTION_NODE: 4;
            ENTITY_REFERENCE_NODE: 5;
            ENTITY_NODE: 6;
            PROCESSING_INSTRUCTION_NODE: 7;
            COMMENT_NODE: 8;
            DOCUMENT_NODE: 9;
            DOCUMENT_TYPE_NODE: 10;
            DOCUMENT_FRAGMENT_NODE: 11;
            NOTATION_NODE: 12;
            DOCUMENT_POSITION_DISCONNECTED: 1;
            DOCUMENT_POSITION_PRECEDING: 2;
            DOCUMENT_POSITION_FOLLOWING: 4;
            DOCUMENT_POSITION_CONTAINS: 8;
            DOCUMENT_POSITION_CONTAINED_BY: 16;
            DOCUMENT_POSITION_IMPLEMENTATION_SPECIFIC: 32;
            dispatchEvent: (event: Event) => boolean;
            activeElement: import("mongoose").FlattenMaps<Element> | null;
            adoptedStyleSheets: import("mongoose").FlattenMaps<CSSStyleSheet>[];
            fullscreenElement: import("mongoose").FlattenMaps<Element> | null;
            pictureInPictureElement: import("mongoose").FlattenMaps<Element> | null;
            pointerLockElement: import("mongoose").FlattenMaps<Element> | null;
            styleSheets: import("mongoose").FlattenMaps<StyleSheetList>;
            elementFromPoint: (x: number, y: number) => Element | null;
            elementsFromPoint: (x: number, y: number) => Element[];
            getAnimations: () => Animation[];
            fonts: import("mongoose").FlattenMaps<FontFaceSet>;
            onabort: ((this: GlobalEventHandlers, ev: UIEvent) => any) | null;
            onanimationcancel: ((this: GlobalEventHandlers, ev: AnimationEvent) => any) | null;
            onanimationend: ((this: GlobalEventHandlers, ev: AnimationEvent) => any) | null;
            onanimationiteration: ((this: GlobalEventHandlers, ev: AnimationEvent) => any) | null;
            onanimationstart: ((this: GlobalEventHandlers, ev: AnimationEvent) => any) | null;
            onauxclick: ((this: GlobalEventHandlers, ev: MouseEvent) => any) | null;
            onbeforeinput: ((this: GlobalEventHandlers, ev: InputEvent) => any) | null;
            onblur: ((this: GlobalEventHandlers, ev: FocusEvent) => any) | null;
            oncancel: ((this: GlobalEventHandlers, ev: Event) => any) | null;
            oncanplay: ((this: GlobalEventHandlers, ev: Event) => any) | null;
            oncanplaythrough: ((this: GlobalEventHandlers, ev: Event) => any) | null;
            onchange: ((this: GlobalEventHandlers, ev: Event) => any) | null;
            onclick: ((this: GlobalEventHandlers, ev: MouseEvent) => any) | null;
            onclose: ((this: GlobalEventHandlers, ev: Event) => any) | null;
            oncontextmenu: ((this: GlobalEventHandlers, ev: MouseEvent) => any) | null;
            oncopy: ((this: GlobalEventHandlers, ev: ClipboardEvent) => any) | null;
            oncuechange: ((this: GlobalEventHandlers, ev: Event) => any) | null;
            oncut: ((this: GlobalEventHandlers, ev: ClipboardEvent) => any) | null;
            ondblclick: ((this: GlobalEventHandlers, ev: MouseEvent) => any) | null;
            ondrag: ((this: GlobalEventHandlers, ev: DragEvent) => any) | null;
            ondragend: ((this: GlobalEventHandlers, ev: DragEvent) => any) | null;
            ondragenter: ((this: GlobalEventHandlers, ev: DragEvent) => any) | null;
            ondragleave: ((this: GlobalEventHandlers, ev: DragEvent) => any) | null;
            ondragover: ((this: GlobalEventHandlers, ev: DragEvent) => any) | null;
            ondragstart: ((this: GlobalEventHandlers, ev: DragEvent) => any) | null;
            ondrop: ((this: GlobalEventHandlers, ev: DragEvent) => any) | null;
            ondurationchange: ((this: GlobalEventHandlers, ev: Event) => any) | null;
            onemptied: ((this: GlobalEventHandlers, ev: Event) => any) | null;
            onended: ((this: GlobalEventHandlers, ev: Event) => any) | null;
            onerror: OnErrorEventHandler;
            onfocus: ((this: GlobalEventHandlers, ev: FocusEvent) => any) | null;
            onformdata: ((this: GlobalEventHandlers, ev: FormDataEvent) => any) | null;
            ongotpointercapture: ((this: GlobalEventHandlers, ev: PointerEvent) => any) | null;
            oninput: ((this: GlobalEventHandlers, ev: Event) => any) | null;
            oninvalid: ((this: GlobalEventHandlers, ev: Event) => any) | null;
            onkeydown: ((this: GlobalEventHandlers, ev: KeyboardEvent) => any) | null;
            onkeypress: ((this: GlobalEventHandlers, ev: KeyboardEvent) => any) | null;
            onkeyup: ((this: GlobalEventHandlers, ev: KeyboardEvent) => any) | null;
            onload: ((this: GlobalEventHandlers, ev: Event) => any) | null;
            onloadeddata: ((this: GlobalEventHandlers, ev: Event) => any) | null;
            onloadedmetadata: ((this: GlobalEventHandlers, ev: Event) => any) | null;
            onloadstart: ((this: GlobalEventHandlers, ev: Event) => any) | null;
            onlostpointercapture: ((this: GlobalEventHandlers, ev: PointerEvent) => any) | null;
            onmousedown: ((this: GlobalEventHandlers, ev: MouseEvent) => any) | null;
            onmouseenter: ((this: GlobalEventHandlers, ev: MouseEvent) => any) | null;
            onmouseleave: ((this: GlobalEventHandlers, ev: MouseEvent) => any) | null;
            onmousemove: ((this: GlobalEventHandlers, ev: MouseEvent) => any) | null;
            onmouseout: ((this: GlobalEventHandlers, ev: MouseEvent) => any) | null;
            onmouseover: ((this: GlobalEventHandlers, ev: MouseEvent) => any) | null;
            onmouseup: ((this: GlobalEventHandlers, ev: MouseEvent) => any) | null;
            onpaste: ((this: GlobalEventHandlers, ev: ClipboardEvent) => any) | null;
            onpause: ((this: GlobalEventHandlers, ev: Event) => any) | null;
            onplay: ((this: GlobalEventHandlers, ev: Event) => any) | null;
            onplaying: ((this: GlobalEventHandlers, ev: Event) => any) | null;
            onpointercancel: ((this: GlobalEventHandlers, ev: PointerEvent) => any) | null;
            onpointerdown: ((this: GlobalEventHandlers, ev: PointerEvent) => any) | null;
            onpointerenter: ((this: GlobalEventHandlers, ev: PointerEvent) => any) | null;
            onpointerleave: ((this: GlobalEventHandlers, ev: PointerEvent) => any) | null;
            onpointermove: ((this: GlobalEventHandlers, ev: PointerEvent) => any) | null;
            onpointerout: ((this: GlobalEventHandlers, ev: PointerEvent) => any) | null;
            onpointerover: ((this: GlobalEventHandlers, ev: PointerEvent) => any) | null;
            onpointerup: ((this: GlobalEventHandlers, ev: PointerEvent) => any) | null;
            onprogress: ((this: GlobalEventHandlers, ev: ProgressEvent<EventTarget>) => any) | null;
            onratechange: ((this: GlobalEventHandlers, ev: Event) => any) | null;
            onreset: ((this: GlobalEventHandlers, ev: Event) => any) | null;
            onresize: ((this: GlobalEventHandlers, ev: UIEvent) => any) | null;
            onscroll: ((this: GlobalEventHandlers, ev: Event) => any) | null;
            onscrollend: ((this: GlobalEventHandlers, ev: Event) => any) | null;
            onsecuritypolicyviolation: ((this: GlobalEventHandlers, ev: SecurityPolicyViolationEvent) => any) | null;
            onseeked: ((this: GlobalEventHandlers, ev: Event) => any) | null;
            onseeking: ((this: GlobalEventHandlers, ev: Event) => any) | null;
            onselect: ((this: GlobalEventHandlers, ev: Event) => any) | null;
            onselectionchange: ((this: GlobalEventHandlers, ev: Event) => any) | null;
            onselectstart: ((this: GlobalEventHandlers, ev: Event) => any) | null;
            onslotchange: ((this: GlobalEventHandlers, ev: Event) => any) | null;
            onstalled: ((this: GlobalEventHandlers, ev: Event) => any) | null;
            onsubmit: ((this: GlobalEventHandlers, ev: SubmitEvent) => any) | null;
            onsuspend: ((this: GlobalEventHandlers, ev: Event) => any) | null;
            ontimeupdate: ((this: GlobalEventHandlers, ev: Event) => any) | null;
            ontoggle: ((this: GlobalEventHandlers, ev: Event) => any) | null;
            ontouchcancel?: ((this: GlobalEventHandlers, ev: TouchEvent) => any) | null | undefined;
            ontouchend?: ((this: GlobalEventHandlers, ev: TouchEvent) => any) | null | undefined;
            ontouchmove?: ((this: GlobalEventHandlers, ev: TouchEvent) => any) | null | undefined;
            ontouchstart?: ((this: GlobalEventHandlers, ev: TouchEvent) => any) | null | undefined;
            ontransitioncancel: ((this: GlobalEventHandlers, ev: TransitionEvent) => any) | null;
            ontransitionend: ((this: GlobalEventHandlers, ev: TransitionEvent) => any) | null;
            ontransitionrun: ((this: GlobalEventHandlers, ev: TransitionEvent) => any) | null;
            ontransitionstart: ((this: GlobalEventHandlers, ev: TransitionEvent) => any) | null;
            onvolumechange: ((this: GlobalEventHandlers, ev: Event) => any) | null;
            onwaiting: ((this: GlobalEventHandlers, ev: Event) => any) | null;
            onwebkitanimationend: ((this: GlobalEventHandlers, ev: Event) => any) | null;
            onwebkitanimationiteration: ((this: GlobalEventHandlers, ev: Event) => any) | null;
            onwebkitanimationstart: ((this: GlobalEventHandlers, ev: Event) => any) | null;
            onwebkittransitionend: ((this: GlobalEventHandlers, ev: Event) => any) | null;
            onwheel: ((this: GlobalEventHandlers, ev: WheelEvent) => any) | null;
            childElementCount: number;
            children: import("mongoose").FlattenMaps<HTMLCollection>;
            firstElementChild: import("mongoose").FlattenMaps<Element> | null;
            lastElementChild: import("mongoose").FlattenMaps<Element> | null;
            append: (...nodes: (string | Node)[]) => void;
            prepend: (...nodes: (string | Node)[]) => void;
            querySelector: {
                <K_10 extends keyof HTMLElementTagNameMap>(selectors: K_10): HTMLElementTagNameMap[K_10] | null;
                <K_11 extends keyof SVGElementTagNameMap>(selectors: K_11): SVGElementTagNameMap[K_11] | null;
                <K_12 extends keyof MathMLElementTagNameMap>(selectors: K_12): MathMLElementTagNameMap[K_12] | null;
                <K_13 extends keyof HTMLElementDeprecatedTagNameMap>(selectors: K_13): HTMLElementDeprecatedTagNameMap[K_13] | null;
                <E extends Element = Element>(selectors: string): E | null;
            };
            querySelectorAll: {
                <K_14 extends keyof HTMLElementTagNameMap>(selectors: K_14): NodeListOf<HTMLElementTagNameMap[K_14]>;
                <K_15 extends keyof SVGElementTagNameMap>(selectors: K_15): NodeListOf<SVGElementTagNameMap[K_15]>;
                <K_16 extends keyof MathMLElementTagNameMap>(selectors: K_16): NodeListOf<MathMLElementTagNameMap[K_16]>;
                <K_17 extends keyof HTMLElementDeprecatedTagNameMap>(selectors: K_17): NodeListOf<HTMLElementDeprecatedTagNameMap[K_17]>;
                <E_1 extends Element = Element>(selectors: string): NodeListOf<E_1>;
            };
            replaceChildren: (...nodes: (string | Node)[]) => void;
            createExpression: (expression: string, resolver?: XPathNSResolver | null | undefined) => XPathExpression;
            createNSResolver: (nodeResolver: Node) => Node;
            evaluate: (expression: string, contextNode: Node, resolver?: XPathNSResolver | null | undefined, type?: number | undefined, result?: XPathResult | null | undefined) => XPathResult;
            _id: Types.ObjectId;
            installment_id: Types.ObjectId;
        }[];
    }>;
}
