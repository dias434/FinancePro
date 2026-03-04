"use client"

import { useRouter } from "next/navigation"

import { logout } from "@/lib/auth/client"
import { Button } from "@/components/ui/button"

export function LogoutButton() {
  const router = useRouter()

  return (
    <Button
      variant="secondary"
      className="w-full justify-start"
      onClick={async () => {
        await logout()
        router.replace("/login")
      }}
    >
      Sair
    </Button>
  )
}

