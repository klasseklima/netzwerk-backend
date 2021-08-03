import {Bind, CacheInterceptor, Controller, Dependencies, Get, Param, UseInterceptors} from '@nestjs/common';
import { AppService } from './app.service';

@Controller()
@UseInterceptors(CacheInterceptor)
@Dependencies(AppService)
export class AppController {
  constructor(appService) {
    this.appService = appService;
  }

  @Get('/projects')
  getProjects() {
    return this.appService.getProjects();
  }

  @Get('/projects/:id')
  @Bind(Param())
  getProject(params) {
    return this.appService.getProject(params.id)
  }
}
