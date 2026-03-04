import { AuthCard } from "@/components/auth/auth-card"
import { RegisterForm } from "@/components/auth/register-form"

export default function RegisterPage() {
  return (
    <AuthCard title="Criar conta" description="Comece a usar o FinancePro">
      <RegisterForm />
    </AuthCard>
  )
}

