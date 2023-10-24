import { Body, Controller, Get, Post, Req, Res } from '@nestjs/common';
import { HdfcService } from './hdfc.service';
import { DatabaseService } from 'src/database/database.service';

@Controller('hdfc')
export class HdfcController {
    constructor(private readonly hdfcService: HdfcService, private readonly databaseService: DatabaseService) {}
    @Get("/redirect")
    async handleRedirect(@Req() req: any, @Res() res: any) {
        res.send(
            `<form method="post" name="redirect"
                action="https://test.ccavenue.com/transaction/transaction.do?command=initiateTransaction"/>
                <input type="hidden" id="encRequest" name="encRequest" value="${req.query.encRequest}">
                <input type="hidden" name="access_code" id="access_code" value="${req.query.access_code}">
            </form>
            
            <script type="text/javascript">
                window.onload = function(){
                    document.forms['redirect'].submit();
                }
            </script>`
        )
    }

    @Post("/callback")
    async handleCallback(@Body() body: any, @Res() res: any) {
        const { encResp } = body;
        const collectRequestId = await this.hdfcService.ccavResponseToCollectRequestId(encResp);
        const collectRequest = await this.databaseService.CollectRequestModel.findById(collectRequestId);
        res.redirect(collectRequest?.callbackUrl);
    }
}
