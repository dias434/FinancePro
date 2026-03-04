import { Suspense } from "react"
import { AuthCard } from "@/components/auth/auth-card"
import { LoginForm } from "@/components/auth/login-form"

export default function LoginPage() {
  return (
    <AuthCard title="Entrar" description="Use seu e-mail e senha para acessar">
      <Suspense fallback={null}>
        <LoginForm />
      </Suspense>
    </AuthCard>
  )
}
