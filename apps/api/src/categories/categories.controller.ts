import { Body, Controller, Delete, Get, Inject, Param, Patch, Post, Query, Req, UseGuards } from "@nestjs/common"

import { AccessGuard } from "../auth/guards/access.guard"
import { CategoriesService } from "./categories.service"
import { CategoryListQueryDto } from "./dto/category-list.query"
import { CreateCategoryDto } from "./dto/create-category.dto"
import { UpdateCategoryDto } from "./dto/update-category.dto"

@Controller("categories")
@UseGuards(AccessGuard)
export class CategoriesController {
  constructor(@Inject(CategoriesService) private readonly categories: CategoriesService) {}

  @Get()
  list(@Req() req: any, @Query() query: CategoryListQueryDto) {
    return this.categories.list(req.user.sub, {
      page: query.page,
      pageSize: query.pageSize,
      q: query.q,
      type: query.type,
      sortBy: query.sortBy,
      sortDir: query.sortDir,
    })
  }

  @Post()
  create(@Req() req: any, @Body() dto: CreateCategoryDto) {
    return this.categories.create(req.user.sub, dto)
  }

  @Patch(":id")
  update(@Req() req: any, @Param("id") id: string, @Body() dto: UpdateCategoryDto) {
    return this.categories.update(req.user.sub, id, dto)
  }

  @Delete(":id")
  remove(@Req() req: any, @Param("id") id: string) {
    return this.categories.remove(req.user.sub, id)
  }
}

