import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { UtilsController } from './utils.controller';
import { UtilsService } from './utils.service';

@Module({
  imports: [HttpModule],
  controllers: [UtilsController],
  providers: [UtilsService],
})
export class UtilsModule {}