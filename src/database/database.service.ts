import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import {
  CollectRequest,
  CollectRequestDocument,
} from './schemas/collect_request.schema';
import { Model } from 'mongoose';
import { Webhooks, WebhooksDocument } from './schemas/webhooks.schema';
import {
  CollectRequestStatus,
  CollectRequestStatusDocument,
} from './schemas/collect_req_status.schema';
import {
  VendorTransaction,
  VendorTransactionDocument,
} from './schemas/vendor.Transaction.schema';
import { ErpWebhooksLogs } from './schemas/erp.webhooks.logs.schema';
import {
  BatchTransactions,
  BatchTransactionsDocument,
} from './schemas/batch.transactions.schema';
import { ErrorLogs, ErrorLogsDocument } from './schemas/error.logs.schema';
import {
  PlatformCharge,
  SchoolMdr,
  SchoolMdrDocument,
} from './schemas/platform.charges.schema';
import { Installments, InstallmentsDocument } from './schemas/installments.schema';
import { StudentDetail, StudentDetails } from './schemas/student_detail.schema';
import { CronManagement } from './schemas/cron.management.schema';

@Injectable()
export class DatabaseService {
  constructor(
    @InjectModel(CollectRequest.name)
    public CollectRequestModel: Model<CollectRequestDocument>,
    @InjectModel(Webhooks.name)
    public WebhooksModel: Model<WebhooksDocument>,
    @InjectModel(CollectRequestStatus.name)
    public CollectRequestStatusModel: Model<CollectRequestStatusDocument>,
    @InjectModel(VendorTransaction.name)
    public VendorTransactionModel: Model<VendorTransactionDocument>,
    @InjectModel(ErpWebhooksLogs.name)
    public ErpWebhooksLogsModel: Model<ErpWebhooksLogs>,
    @InjectModel(BatchTransactions.name)
    public BatchTransactionModel: Model<BatchTransactionsDocument>,
    @InjectModel(ErrorLogs.name)
    public ErrorLogsModel: Model<ErrorLogsDocument>,
    @InjectModel(SchoolMdr.name)
    public PlatformChargeModel: Model<SchoolMdrDocument>,
    @InjectModel(Installments.name)
    public InstallmentsModel: Model<InstallmentsDocument>,
    @InjectModel(StudentDetail.name)
    public StudentDetailModel: Model<StudentDetails>,
    @InjectModel(CronManagement.name)
    public cronManagement: Model<CronManagement>,
  ) { }
}
