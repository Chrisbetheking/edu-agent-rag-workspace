import { Body, Controller, Delete, Get, Param, Post, UploadedFile, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { DocumentsService } from './documents.service';

@Controller('documents')
export class DocumentsController {
  constructor(private readonly documents: DocumentsService) {}

  @Get()
  list() {
    return this.documents.list();
  }

  @Post('upload')
  @UseInterceptors(FileInterceptor('file'))
  upload(@UploadedFile() file: Express.Multer.File, @Body() body: any) {
    return this.documents.upload(file, body);
  }

  @Get(':id/chunks')
  chunks(@Param('id') id: string) {
    return this.documents.chunks(id);
  }

  @Post(':id/reprocess')
  reprocess(@Param('id') id: string) {
    return this.documents.reprocess(id);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.documents.remove(id);
  }
}
