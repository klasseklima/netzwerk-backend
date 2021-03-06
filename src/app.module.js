import {CacheModule, Module} from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';

@Module({
  imports: [ConfigModule.forRoot(), CacheModule.register({ttl: 60})],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
