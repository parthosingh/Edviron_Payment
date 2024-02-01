import { Body, Controller, Get, Post, Req, Res } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import { EdvironPgService } from './edviron-pg.service';

@Controller('edviron-pg')
export class EdvironPgController {
    constructor(private readonly edvironPgService: EdvironPgService, private readonly databaseService: DatabaseService) {}
    @Get("/redirect")
    async handleRedirect(@Req() req: any, @Res() res: any) {
        res.send(
            `<script type="text/javascript">
                window.onload = function(){
                    location.href = "https://pg.edviron.com/${req.query.session_id}";
                }
            </script>`
        )
    }

    @Post("/callback")
    async handleCallback(@Req() req: any, @Res() res: any) {
        const { collect_request_id } = req.query;
        const collectRequest = await this.databaseService.CollectRequestModel.findById(collect_request_id);
        res.redirect(collectRequest?.callbackUrl);
    }
}
