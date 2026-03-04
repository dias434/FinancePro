import { Body, Controller, Delete, Get, Inject, Param, Patch, Post, Query, Req, UseGuards } from "@nestjs/common"

import { AccessGuard } from "../auth/guards/access.guard"
import { CreateTransactionDto } from "./dto/create-transaction.dto"
import { TransactionListQueryDto } from "./dto/transaction-list.query"
import { UpdateTransactionDto } from "./dto/update-transaction.dto"
import { TransactionsService } from "./transactions.service"

@Controller("transactions")
@UseGuards(AccessGuard)
export class TransactionsController {
  constructor(@Inject(TransactionsService) private readonly transactions: TransactionsService) {}

  @Get()
  list(@Req() req: any, @Query() query: TransactionListQueryDto) {
    return this.transactions.list(req.user.sub, {
      page: query.page,
      pageSize: query.pageSize,
      q: query.q,
      type: query.type,
      accountId: query.accountId,
      categoryId: query.categoryId,
      from: query.from,
      to: query.to,
      sortBy: query.sortBy,
      sortDir: query.sortDir,
      limit: query.limit,
    })
  }

  @Post()
  create(@Req() req: any, @Body() dto: CreateTransactionDto) {
    return this.transactions.create(req.user.sub, dto)
  }

  @Patch(":id")
  update(@Req() req: any, @Param("id") id: string, @Body() dto: UpdateTransactionDto) {
    return this.transactions.update(req.user.sub, id, dto)
  }

  @Delete(":id")
  remove(@Req() req: any, @Param("id") id: string) {
    return this.transactions.remove(req.user.sub, id)
  }
}

