"use client"

import * as React from "react"
import { MoreHorizontalIcon, PlusIcon, RefreshCcwIcon } from "lucide-react"
import { z } from "zod"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"

import {
  createAccount,
  deleteAccount,
  listAccounts,
  updateAccount,
  type AccountListItem,
  type AccountType,
} from "@/lib/accounts/client"
import { notify } from "@/lib/notify"
import { Button } from "@/components/ui/button"
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

function accountTypeLabel(type: AccountType) {
  switch (type) {
    case "CASH":
      return "Dinheiro"
    case "CHECKING":
      return "Conta corrente"
    case "SAVINGS":
      return "Poupança"
    case "CREDIT_CARD":
      return "Cartão"
    default:
      return type
  }
}

const AccountSchema = z.object({
  name: z.string().min(1, "Informe um nome").max(60, "Máximo de 60 caracteres"),
  type: z.enum(["CASH", "CHECKING", "SAVINGS", "CREDIT_CARD"] as const).default("CHECKING"),
})

type AccountValues = z.infer<typeof AccountSchema>

function AccountDialog({
  open,
  onOpenChange,
  initial,
  onSaved,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  initial: AccountListItem | null
  onSaved: () => void
}) {
  const form = useForm<AccountValues>({
    resolver: zodResolver(AccountSchema),
    defaultValues: {
      name: initial?.name ?? "",
      type: initial?.type ?? "CHECKING",
    },
  })

  React.useEffect(() => {
    if (!open) return
    form.reset({ name: initial?.name ?? "", type: initial?.type ?? "CHECKING" })
  }, [form, initial, open])

  const onSubmit = form.handleSubmit(async (values) => {
    try {
      if (initial) {
        await updateAccount(initial.id, values)
        notify.success("Conta atualizada")
      } else {
        await createAccount(values)
        notify.success("Conta criada")
      }
      onOpenChange(false)
      onSaved()
    } catch (err) {
      notify.error(err instanceof Error ? err.message : "Falha ao salvar conta")
    }
  })

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{initial ? "Editar conta" : "Nova conta"}</DialogTitle>
          <DialogDescription>Defina nome e tipo. A moeda padrão é BRL.</DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={onSubmit} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nome</FormLabel>
                  <FormControl>
                    <Input placeholder="Ex.: Nubank, Carteira, Inter" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="type"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Tipo</FormLabel>
                  <FormControl>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger>
                        <SelectValue placeholder="Tipo" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="CHECKING">Conta corrente</SelectItem>
                        <SelectItem value="SAVINGS">Poupança</SelectItem>
                        <SelectItem value="CASH">Dinheiro</SelectItem>
                        <SelectItem value="CREDIT_CARD">Cartão</SelectItem>
                      </SelectContent>
                    </Select>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

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

export function AccountsScreen() {
  const [q, setQ] = React.useState("")
  const [loading, setLoading] = React.useState(true)
  const [items, setItems] = React.useState<AccountListItem[]>([])
  const [dialogOpen, setDialogOpen] = React.useState(false)
  const [editing, setEditing] = React.useState<AccountListItem | null>(null)

  const [confirmOpen, setConfirmOpen] = React.useState(false)
  const [deleting, setDeleting] = React.useState<AccountListItem | null>(null)

  const load = React.useCallback(async () => {
    setLoading(true)
    try {
      const data = await listAccounts({
        q: q.trim() || undefined,
        page: 1,
        pageSize: 100,
        sortBy: "createdAt",
        sortDir: "desc",
      })
      setItems(data.items)
    } catch (err) {
      setItems([])
      notify.error(err instanceof Error ? err.message : "Falha ao carregar contas")
    } finally {
      setLoading(false)
    }
  }, [q])

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

  const openEdit = (a: AccountListItem) => {
    setEditing(a)
    setDialogOpen(true)
  }

  const askDelete = (a: AccountListItem) => {
    setDeleting(a)
    setConfirmOpen(true)
  }

  const confirmDelete = async () => {
    if (!deleting) return
    try {
      await deleteAccount(deleting.id)
      notify.success("Conta removida")
      setConfirmOpen(false)
      setDeleting(null)
      await load()
    } catch (err) {
      notify.error(err instanceof Error ? err.message : "Falha ao remover conta")
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <div className="flex flex-col gap-2 md:flex-row md:items-center">
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Buscar por nome…"
            className="md:w-[280px]"
          />
          <Button type="button" variant="outline" onClick={() => void load()} className="gap-2">
            <RefreshCcwIcon className="size-4" />
            Atualizar
          </Button>
        </div>

        <Button type="button" onClick={openCreate} className="gap-2">
          <PlusIcon className="size-4" />
          Nova conta
        </Button>
      </div>

      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Conta</TableHead>
              <TableHead>Tipo</TableHead>
              <TableHead className="text-right">Saldo</TableHead>
              <TableHead className="w-[60px] text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={4} className="text-muted-foreground py-8 text-center">
                  <span className="inline-flex items-center gap-2">
                    <Spinner />
                    Carregando…
                  </span>
                </TableCell>
              </TableRow>
            ) : items.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="text-muted-foreground py-10 text-center">
                  Nenhuma conta encontrada.
                </TableCell>
              </TableRow>
            ) : (
              items.map((a) => (
                <TableRow key={a.id}>
                  <TableCell className="font-medium">{a.name}</TableCell>
                  <TableCell className="text-muted-foreground">{accountTypeLabel(a.type)}</TableCell>
                  <TableCell className="text-right tabular-nums">{formatCentsBRL(a.balanceCents)}</TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button type="button" variant="ghost" size="icon">
                          <MoreHorizontalIcon className="size-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => openEdit(a)}>Editar</DropdownMenuItem>
                        <DropdownMenuItem onClick={() => askDelete(a)} className="text-destructive">
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

      <AccountDialog open={dialogOpen} onOpenChange={setDialogOpen} initial={editing} onSaved={() => void load()} />

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remover conta?</AlertDialogTitle>
            <AlertDialogDescription>
              {deleting ? `Isso irá remover "${deleting.name}".` : "Isso irá remover a conta."} Se houver transações vinculadas, a API pode bloquear a remoção.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={() => void confirmDelete()}>Remover</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

