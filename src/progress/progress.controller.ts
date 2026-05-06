import { Controller, Post, Get, Body, Query, UseGuards } from '@nestjs/common';
import { ProgressService } from './progress.service';
import { RecordProgressDto } from './progress.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@UseGuards(JwtAuthGuard)
@Controller('progress')
export class ProgressController {
  constructor(private readonly progressService: ProgressService) {}

  @Post()
  record(@CurrentUser() user: { id: string }, @Body() dto: RecordProgressDto) {
    return this.progressService.record(user.id, dto);
  }

  @Get()
  getMyProgress(@CurrentUser() user: { id: string }) {
    return this.progressService.getUserProgress(user.id);
  }

  @Get('activity-log')
  getActivityLog(
    @CurrentUser() user: { id: string },
    @Query('limit') limit?: number,
  ) {
    return this.progressService.getActivityLog(user.id, limit);
  }
}
