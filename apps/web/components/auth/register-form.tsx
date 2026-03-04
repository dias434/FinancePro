"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { z } from "zod"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"

import { register as registerUser } from "@/lib/auth/client"
import { notify } from "@/lib/notify"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormDescription,
  FormMessage,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"

const Schema = z.object({
  name: z.string().min(2, "Informe seu nome").optional(),
  email: z.string().email("Informe um e-mail válido"),
  password: z.string().min(8, "Mínimo de 8 caracteres"),
  acceptTerms: z
    .boolean()
    .refine((v) => v, "Aceite os Termos e a Política para continuar"),
})

type Values = z.infer<typeof Schema>

export function RegisterForm() {
  const router = useRouter()

  const form = useForm<Values>({
    resolver: zodResolver(Schema),
    defaultValues: { name: "", email: "", password: "", acceptTerms: false },
  })

  const onSubmit = form.handleSubmit(async (values) => {
    try {
      const { acceptTerms: _acceptTerms, ...payload } = values
      await registerUser(payload)
      notify.success("Conta criada!")
      router.replace("/dashboard")
    } catch (err) {
      notify.error(err instanceof Error ? err.message : "Falha ao cadastrar")
    }
  })

  return (
    <Form {...form}>
      <form onSubmit={onSubmit} className="space-y-4">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Nome (opcional)</FormLabel>
              <FormControl>
                <Input
                  type="text"
                  autoComplete="name"
                  placeholder="Seu nome"
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="email"
          render={({ field }) => (
            <FormItem>
              <FormLabel>E-mail</FormLabel>
              <FormControl>
                <Input
                  type="email"
                  autoComplete="email"
                  placeholder="voce@exemplo.com"
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="password"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Senha</FormLabel>
              <FormControl>
                <Input
                  type="password"
                  autoComplete="new-password"
                  placeholder="********"
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="acceptTerms"
          render={({ field }) => (
            <FormItem className="flex flex-row items-start gap-3 rounded-lg border p-3">
              <FormControl>
                <Checkbox
                  checked={field.value}
                  onCheckedChange={(v) => field.onChange(v === true)}
                />
              </FormControl>
              <div className="grid gap-1 leading-none">
                <FormLabel className="text-sm">
                  Li e aceito os{" "}
                  <Link
                    href="/terms"
                    className="text-foreground underline underline-offset-4"
                    target="_blank"
                  >
                    Termos de Uso
                  </Link>{" "}
                  e a{" "}
                  <Link
                    href="/privacy"
                    className="text-foreground underline underline-offset-4"
                    target="_blank"
                  >
                    Política de Privacidade
                  </Link>
                  .
                </FormLabel>
                <FormDescription className="text-xs">
                  Abriremos em uma nova aba para você ler com calma.
                </FormDescription>
                <FormMessage />
              </div>
            </FormItem>
          )}
        />

        <Button
          type="submit"
          className="w-full"
          disabled={form.formState.isSubmitting}
        >
          Criar conta
        </Button>

        <p className="text-muted-foreground text-center text-sm">
          Já tem conta?{" "}
          <Link
            href="/login"
            className="text-foreground underline underline-offset-4"
          >
            Entrar
          </Link>
        </p>
      </form>
    </Form>
  )
}
