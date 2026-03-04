"use client"

import * as React from "react"
import { MoreHorizontalIcon, PlusIcon, RefreshCcwIcon, Trash2Icon } from "lucide-react"
import { z } from "zod"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"

import { listAccounts, type AccountListItem } from "@/lib/accounts/client"
import { listCategories, type CategoryListItem } from "@/lib/categories/client"
import {
  createTransaction,
  deleteTransaction,
  listTransactions,
  updateTransaction,
  type TransactionListItem,
  type TransactionType,
} from "@/lib/transactions/client"
import { notify } from "@/lib/notify"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Spinner } from "@/components/ui/spinner"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"

function formatCentsBRL(cents: number) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(cents / 100)
}

function formatDate(value: string) {
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return value
  return new Intl.DateTimeFormat("pt-BR").format(d)
}

function toDateInput(value: string) {
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return ""
  const yyyy = d.getUTCFullYear()
  const mm = String(d.getUTCMonth() + 1).padStart(2, "0")
  const dd = String(d.getUTCDate()).padStart(2, "0")
  return `${yyyy}-${mm}-${dd}`
}

function txTypeLabel(type: TransactionType) {
  switch (type) {
    case "INCOME":
      return "Entrada"
    case "EXPENSE":
      return "Saída"
    case "TRANSFER":
      return "Transferência"
    default:
      return type
  }
}

const TransactionSchema = z
  .object({
    type: z.enum(["INCOME", "EXPENSE", "TRANSFER"] as const),
    occurredAt: z.string().min(1, "Informe a data"),
    amount: z.coerce.number().min(0.01, "Informe um valor maior que zero"),
    accountId: z.string().min(1, "Selecione a conta"),
    categoryId: z.string().nullable().optional(),
    transferAccountId: z.string().nullable().optional(),
    description: z.string().max(200, "Máximo de 200 caracteres").optional(),
  })
  .superRefine((v, ctx) => {
    if (v.type === "TRANSFER") {
      if (!v.transferAccountId) {
        ctx.addIssue({ code: "custom", message: "Selecione a conta de destino", path: ["transferAccountId"] })
      } else if (v.transferAccountId === v.accountId) {
        ctx.addIssue({ code: "custom", message: "Origem e destino devem ser diferentes", path: ["transferAccountId"] })
      }
      if (v.categoryId) {
        ctx.addIssue({ code: "custom", message: "Transferências não usam categoria", path: ["categoryId"] })
      }
    } else {
      if (v.transferAccountId) {
        ctx.addIssue({ code: "custom", message: "Conta destino só para transferência", path: ["transferAccountId"] })
      }
    }
  })

type TransactionValues = z.infer<typeof TransactionSchema>

function TransactionDialog({
  open,
  onOpenChange,
  initial,
  accounts,
  categories,
  onSaved,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  initial: TransactionListItem | null
  accounts: AccountListItem[]
  categories: CategoryListItem[]
  onSaved: () => void
}) {
  const form = useForm<TransactionValues>({
    resolver: zodResolver(TransactionSchema),
    defaultValues: {
      type: initial?.type ?? "EXPENSE",
      occurredAt: initial ? toDateInput(initial.occurredAt) : toDateInput(new Date().toISOString()),
      amount: initial ? initial.amountCents / 100 : 0,
      accountId: initial?.accountId ?? "",
      categoryId: initial?.categoryId ?? null,
      transferAccountId: initial?.transferAccountId ?? null,
      description: initial?.description ?? "",
    },
  })

  React.useEffect(() => {
    if (!open) return
    form.reset({
      type: initial?.type ?? "EXPENSE",
      occurredAt: initial ? toDateInput(initial.occurredAt) : toDateInput(new Date().toISOString()),
      amount: initial ? initial.amountCents / 100 : 0,
      accountId: initial?.accountId ?? "",
      categoryId: initial?.categoryId ?? null,
      transferAccountId: initial?.transferAccountId ?? null,
      description: initial?.description ?? "",
    })
  }, [form, initial, open])

  const onSubmit = form.handleSubmit(async (values) => {
    const occurredAtIso = new Date(values.occurredAt).toISOString()
    const amountCents = Math.round(values.amount * 100)
    try {
      if (initial) {
        await updateTransaction(initial.id, {
          type: values.type,
          occurredAt: occurredAtIso,
          amountCents,
          accountId: values.accountId,
          categoryId: values.type === "TRANSFER" ? null : values.categoryId ?? null,
          transferAccountId: values.type === "TRANSFER" ? values.transferAccountId ?? null : null,
          description: values.description?.trim() ? values.description.trim() : null,
        })
        notify.success("Transação atualizada")
      } else {
        await createTransaction({
          type: values.type,
          occurredAt: occurredAtIso,
          amountCents,
          accountId: values.accountId,
          categoryId: values.type === "TRANSFER" ? null : values.categoryId ?? null,
          transferAccountId: values.type === "TRANSFER" ? values.transferAccountId ?? null : null,
          description: values.description?.trim() ? values.description.trim() : undefined,
        })
        notify.success("Transação criada")
      }
      onOpenChange(false)
      onSaved()
    } catch (err) {
      notify.error(err instanceof Error ? err.message : "Falha ao salvar transação")
    }
  })

  const type = form.watch("type")

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>{initial ? "Editar transação" : "Nova transação"}</DialogTitle>
          <DialogDescription>Entradas, saídas e transferências. (Anexos ficam para a fase 4.)</DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={onSubmit} className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <FormField
                control={form.control}
                name="type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tipo</FormLabel>
                    <FormControl>
                      <Select
                        value={field.value}
                        onValueChange={(v) => {
                          field.onChange(v)
                          if (v === "TRANSFER") {
                            form.setValue("categoryId", null)
                          } else {
                            form.setValue("transferAccountId", null)
                          }
                        }}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Tipo" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="EXPENSE">Saída</SelectItem>
                          <SelectItem value="INCOME">Entrada</SelectItem>
                          <SelectItem value="TRANSFER">Transferência</SelectItem>
                        </SelectContent>
                      </Select>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="occurredAt"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Data</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="amount"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Valor (R$)</FormLabel>
                    <FormControl>
                      <Input type="number" inputMode="decimal" step="0.01" min="0" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="accountId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{type === "TRANSFER" ? "Conta origem" : "Conta"}</FormLabel>
                    <FormControl>
                      <Select value={field.value} onValueChange={field.onChange}>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione" />
                        </SelectTrigger>
                        <SelectContent>
                          {accounts.map((a) => (
                            <SelectItem key={a.id} value={a.id}>
                              {a.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {type === "TRANSFER" ? (
                <FormField
                  control={form.control}
                  name="transferAccountId"
                  render={({ field }) => (
                    <FormItem className="md:col-span-2">
                      <FormLabel>Conta destino</FormLabel>
                      <FormControl>
                        <Select value={field.value ?? ""} onValueChange={(v) => field.onChange(v || null)}>
                          <SelectTrigger>
                            <SelectValue placeholder="Selecione" />
                          </SelectTrigger>
                          <SelectContent>
                            {accounts.map((a) => (
                              <SelectItem key={a.id} value={a.id}>
                                {a.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              ) : (
                <FormField
                  control={form.control}
                  name="categoryId"
                  render={({ field }) => (
                    <FormItem className="md:col-span-2">
                      <FormLabel>Categoria</FormLabel>
                      <FormControl>
                        <Select value={field.value ?? ""} onValueChange={(v) => field.onChange(v || null)}>
                          <SelectTrigger>
                            <SelectValue placeholder="(Opcional)" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="">Sem categoria</SelectItem>
                            {categories
                              .filter((c) => (type === "INCOME" ? c.type === "INCOME" : c.type === "EXPENSE"))
                              .map((c) => (
                                <SelectItem key={c.id} value={c.id}>
                                  {c.name}
                                </SelectItem>
                              ))}
                          </SelectContent>
                        </Select>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}

              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem className="md:col-span-2">
                    <FormLabel>Descrição</FormLabel>
                    <FormControl>
                      <Input placeholder="Ex.: Uber, Salário, Mercado…" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={form.formState.isSubmitting}>
                {initial ? "Salvar" : "Criar"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}

export function TransactionsScreen() {
  const [q, setQ] = React.useState("")
  const [type, setType] = React.useState<TransactionType | "all">("all")
  const [accountId, setAccountId] = React.useState<string>("all")
  const [categoryId, setCategoryId] = React.useState<string>("all")
  const [from, setFrom] = React.useState("")
  const [to, setTo] = React.useState("")

  const [loading, setLoading] = React.useState(true)
  const [items, setItems] = React.useState<TransactionListItem[]>([])
  const [accounts, setAccounts] = React.useState<AccountListItem[]>([])
  const [categories, setCategories] = React.useState<CategoryListItem[]>([])

  const [dialogOpen, setDialogOpen] = React.useState(false)
  const [editing, setEditing] = React.useState<TransactionListItem | null>(null)

  const [selected, setSelected] = React.useState<Set<string>>(() => new Set())
  const [bulkOpen, setBulkOpen] = React.useState(false)

  const loadLookups = React.useCallback(async () => {
    const [a, c] = await Promise.all([
      listAccounts({ page: 1, pageSize: 200, sortBy: "name", sortDir: "asc" }),
      listCategories({ page: 1, pageSize: 200, sortBy: "name", sortDir: "asc" }),
    ])
    setAccounts(a.items)
    setCategories(c.items)
  }, [])

  const load = React.useCallback(async () => {
    setLoading(true)
    try {
      const data = await listTransactions({
        q: q.trim() || undefined,
        type: type === "all" ? undefined : type,
        accountId: accountId === "all" ? undefined : accountId,
        categoryId: categoryId === "all" ? undefined : categoryId,
        from: from || undefined,
        to: to || undefined,
        sortBy: "occurredAt",
        sortDir: "desc",
        limit: 200,
      })
      setItems(data.items)
      setSelected(new Set())
    } catch (err) {
      setItems([])
      notify.error(err instanceof Error ? err.message : "Falha ao carregar transações")
    } finally {
      setLoading(false)
    }
  }, [accountId, categoryId, from, q, to, type])

  React.useEffect(() => {
    void loadLookups().catch((err) => {
      notify.error(err instanceof Error ? err.message : "Falha ao carregar dados auxiliares")
    })
  }, [loadLookups])

  React.useEffect(() => {
    let alive = true
    const t = setTimeout(() => {
      if (!alive) return
      void load()
    }, 250)
    return () => {
      alive = false
      clearTimeout(t)
    }
  }, [load])

  const openCreate = () => {
    setEditing(null)
    setDialogOpen(true)
  }

  const openEdit = (t: TransactionListItem) => {
    setEditing(t)
    setDialogOpen(true)
  }

  const toggleSelected = (id: string, checked: boolean) => {
    setSelected((prev) => {
      const next = new Set(prev)
      if (checked) next.add(id)
      else next.delete(id)
      return next
    })
  }

  const allSelected = items.length > 0 && selected.size === items.length
  const someSelected = selected.size > 0 && selected.size < items.length

  const toggleAll = (checked: boolean) => {
    if (!checked) {
      setSelected(new Set())
      return
    }
    setSelected(new Set(items.map((i) => i.id)))
  }

  const removeOne = async (t: TransactionListItem) => {
    try {
      await deleteTransaction(t.id)
      notify.success("Transação removida")
      await load()
    } catch (err) {
      notify.error(err instanceof Error ? err.message : "Falha ao remover transação")
    }
  }

  const bulkDelete = async () => {
    const ids = Array.from(selected)
    if (ids.length === 0) return
    try {
      await Promise.all(ids.map((id) => deleteTransaction(id)))
      notify.success(ids.length === 1 ? "Transação removida" : `${ids.length} transações removidas`)
      setBulkOpen(false)
      await load()
    } catch (err) {
      notify.error(err instanceof Error ? err.message : "Falha ao remover transações")
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-col gap-2">
        <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
          <div className="flex flex-col gap-2 md:flex-row md:items-center">
            <Input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Buscar (descrição)…"
              className="md:w-[280px]"
            />
            <Button type="button" variant="outline" onClick={() => void load()} className="gap-2">
              <RefreshCcwIcon className="size-4" />
              Atualizar
            </Button>
          </div>

          <div className="flex flex-col gap-2 md:flex-row md:items-center">
            {selected.size > 0 ? (
              <Button type="button" variant="destructive" onClick={() => setBulkOpen(true)} className="gap-2">
                <Trash2Icon className="size-4" />
                Excluir selecionadas ({selected.size})
              </Button>
            ) : null}
            <Button type="button" onClick={openCreate} className="gap-2">
              <PlusIcon className="size-4" />
              Nova transação
            </Button>
          </div>
        </div>

        <div className="grid gap-2 md:grid-cols-5">
          <Select value={type} onValueChange={(v) => setType(v as any)}>
            <SelectTrigger>
              <SelectValue placeholder="Tipo" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="EXPENSE">Saídas</SelectItem>
              <SelectItem value="INCOME">Entradas</SelectItem>
              <SelectItem value="TRANSFER">Transferências</SelectItem>
            </SelectContent>
          </Select>

          <Select value={accountId} onValueChange={setAccountId}>
            <SelectTrigger>
              <SelectValue placeholder="Conta" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas as contas</SelectItem>
              {accounts.map((a) => (
                <SelectItem key={a.id} value={a.id}>
                  {a.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={categoryId} onValueChange={setCategoryId}>
            <SelectTrigger>
              <SelectValue placeholder="Categoria" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas as categorias</SelectItem>
              {categories.map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {c.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
          <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} />
        </div>
      </div>

      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[40px]">
                <Checkbox
                  checked={allSelected ? true : someSelected ? "indeterminate" : false}
                  onCheckedChange={(v) => toggleAll(Boolean(v))}
                  aria-label="Selecionar todas"
                />
              </TableHead>
              <TableHead>Data</TableHead>
              <TableHead>Descrição</TableHead>
              <TableHead>Conta</TableHead>
              <TableHead>Categoria</TableHead>
              <TableHead>Tipo</TableHead>
              <TableHead className="text-right">Valor</TableHead>
              <TableHead className="w-[60px] text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={8} className="text-muted-foreground py-8 text-center">
                  <span className="inline-flex items-center gap-2">
                    <Spinner />
                    Carregando…
                  </span>
                </TableCell>
              </TableRow>
            ) : items.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="text-muted-foreground py-10 text-center">
                  Nenhuma transação encontrada.
                </TableCell>
              </TableRow>
            ) : (
              items.map((t) => (
                <TableRow key={t.id} data-state={selected.has(t.id) ? "selected" : undefined}>
                  <TableCell>
                    <Checkbox
                      checked={selected.has(t.id)}
                      onCheckedChange={(v) => toggleSelected(t.id, Boolean(v))}
                      aria-label="Selecionar"
                    />
                  </TableCell>
                  <TableCell className="tabular-nums">{formatDate(t.occurredAt)}</TableCell>
                  <TableCell className="max-w-[280px] truncate">
                    <button type="button" className="hover:underline underline-offset-4" onClick={() => openEdit(t)}>
                      {t.description?.trim() || "—"}
                    </button>
                  </TableCell>
                  <TableCell className="max-w-[220px] truncate">
                    {t.type === "TRANSFER"
                      ? `${t.account?.name ?? "Origem"} → ${t.transferAccount?.name ?? "Destino"}`
                      : t.account?.name ?? t.accountId}
                  </TableCell>
                  <TableCell className="max-w-[200px] truncate text-muted-foreground">
                    {t.type === "TRANSFER" ? "—" : t.category?.name ?? "—"}
                  </TableCell>
                  <TableCell className="text-muted-foreground">{txTypeLabel(t.type)}</TableCell>
                  <TableCell className="text-right tabular-nums">
                    {t.type === "INCOME" ? "+" : t.type === "EXPENSE" ? "−" : ""}
                    {formatCentsBRL(t.amountCents)}
                  </TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button type="button" variant="ghost" size="icon">
                          <MoreHorizontalIcon className="size-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => openEdit(t)}>Editar</DropdownMenuItem>
                        <DropdownMenuItem onClick={() => void removeOne(t)} className="text-destructive">
                          Remover
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <TransactionDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        initial={editing}
        accounts={accounts}
        categories={categories}
        onSaved={() => void load()}
      />

      <AlertDialog open={bulkOpen} onOpenChange={setBulkOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir selecionadas?</AlertDialogTitle>
            <AlertDialogDescription>
              Isso irá excluir {selected.size} transaçõ{selected.size === 1 ? "o" : "es"}. Essa ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={() => void bulkDelete()}>Excluir</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

