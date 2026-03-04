import { Body, Controller, Delete, Get, Inject, Param, Patch, Post, Query, Req, UseGuards } from "@nestjs/common"

import { AccessGuard } from "../auth/guards/access.guard"
import { AccountListQueryDto } from "./dto/account-list.query"
import { CreateAccountDto } from "./dto/create-account.dto"
import { ReconcileDto } from "./dto/reconcile.dto"
import { UpdateAccountDto } from "./dto/update-account.dto"
import { AccountsService } from "./accounts.service"

@Controller("accounts")
@UseGuards(AccessGuard)
export class AccountsController {
  constructor(@Inject(AccountsService) private readonly accounts: AccountsService) {}

  @Get()
  list(@Req() req: any, @Query() query: AccountListQueryDto) {
    return this.accounts.list(req.user.sub, {
      page: query.page,
      pageSize: query.pageSize,
      q: query.q,
      sortBy: query.sortBy,
      sortDir: query.sortDir,
    })
  }

  @Post()
  create(@Req() req: any, @Body() dto: CreateAccountDto) {
    return this.accounts.create(req.user.sub, dto)
  }

  @Get(":id/bills")
  listBills(
    @Req() req: any,
    @Param("id") id: string,
    @Query("limit") limit?: string,
  ) {
    return this.accounts.listBills(req.user.sub, id, {
      limit: limit ? parseInt(limit, 10) : undefined,
    })
  }

  @Get(":id/reconciliations")
  listReconciliations(
    @Req() req: any,
    @Param("id") id: string,
    @Query("page") page?: string,
    @Query("pageSize") pageSize?: string,
  ) {
    return this.accounts.listReconciliations(req.user.sub, id, {
      page: page ? parseInt(page, 10) : undefined,
      pageSize: pageSize ? parseInt(pageSize, 10) : undefined,
    })
  }

  @Get(":id")
  get(@Req() req: any, @Param("id") id: string) {
    return this.accounts.get(req.user.sub, id)
  }

  @Patch(":id")
  update(@Req() req: any, @Param("id") id: string, @Body() dto: UpdateAccountDto) {
    return this.accounts.update(req.user.sub, id, dto)
  }

  @Post(":id/reconcile")
  reconcile(@Req() req: any, @Param("id") id: string, @Body() dto: ReconcileDto) {
    return this.accounts.reconcile(req.user.sub, id, dto)
  }

  @Delete(":id")
  remove(@Req() req: any, @Param("id") id: string) {
    return this.accounts.remove(req.user.sub, id)
  }
}

