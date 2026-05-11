import { Body, Controller, Delete, Get, Headers, Param, Post, UploadedFile, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { DocumentsService } from './documents.service';
import { AuthContextService } from '../../shared/auth-context.service';

@Controller('documents')
export class DocumentsController {
  constructor(
    private readonly documents: DocumentsService,
    private readonly authContext: AuthContextService,
  ) {}

  private user(authorization?: string) {
    return this.authContext.getUserFromAuthorization(authorization);
  }

  @Get()
  list(@Headers('authorization') authorization?: string) {
    return this.documents.list(this.user(authorization));
  }

  @Get('stats')
  stats(@Headers('authorization') authorization?: string) {
    return this.documents.stats(this.user(authorization));
  }

  @Post('upload')
  @UseInterceptors(FileInterceptor('file'))
  upload(@UploadedFile() file: Express.Multer.File, @Body() body: any, @Headers('authorization') authorization?: string) {
    return this.documents.upload(file, body, this.user(authorization));
  }

  @Post('bulk')
  bulk(@Body() body: any, @Headers('authorization') authorization?: string) {
    return this.documents.bulk(body, this.user(authorization));
  }

  @Get(':id/chunks')
  chunks(@Param('id') id: string, @Headers('authorization') authorization?: string) {
    return this.documents.chunks(id, this.user(authorization));
  }

  @Post(':id/reprocess')
  reprocess(@Param('id') id: string, @Headers('authorization') authorization?: string) {
    return this.documents.reprocess(id, this.user(authorization));
  }

  @Delete(':id')
  remove(@Param('id') id: string, @Headers('authorization') authorization?: string) {
    return this.documents.remove(id, this.user(authorization));
  }
}
