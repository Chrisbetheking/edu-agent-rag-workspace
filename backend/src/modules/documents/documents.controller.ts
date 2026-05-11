import { Controller, Delete, Get, Param, Post } from '@nestjs/common';

@Controller('documents')
export class DocumentsController {
  @Get()
  list() {
    return [
      { id: 'doc_1', title: '英国计算机硕士申请要求.pdf', status: 'ready', chunks: 42 },
      { id: 'doc_2', title: '澳洲八大申请 FAQ.md', status: 'pending', chunks: 0 },
    ];
  }

  @Post('upload')
  uploadPlaceholder() {
    return { message: 'Phase 3 will implement real file upload and parsing.' };
  }

  @Get(':id/chunks')
  chunks(@Param('id') id: string) {
    return { documentId: id, chunks: [] };
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return { deleted: true, id };
  }
}
