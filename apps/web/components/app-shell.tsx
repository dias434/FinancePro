"use client"

import * as React from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  BanknoteIcon,
  CircleDollarSignIcon,
  CreditCardIcon,
  LayoutDashboardIcon,
  SettingsIcon,
  TagsIcon,
  TargetIcon,
} from "lucide-react"

import { ThemeToggle } from "@/components/theme-toggle"
import { LogoutButton } from "@/components/auth/logout-button"
import { Separator } from "@/components/ui/separator"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar"
import { cn } from "@/lib/utils"

type NavItem = {
  title: string
  href: string
  icon: React.ComponentType<{ className?: string }>
}

const NAV: NavItem[] = [
  { title: "Dashboard", href: "/dashboard", icon: LayoutDashboardIcon },
  { title: "Contas", href: "/accounts", icon: CreditCardIcon },
  { title: "Transações", href: "/transactions", icon: CircleDollarSignIcon },
  { title: "Categorias", href: "/categories", icon: TagsIcon },
  { title: "Orçamentos", href: "/budgets", icon: BanknoteIcon },
  { title: "Metas", href: "/goals", icon: TargetIcon },
  { title: "Configurações", href: "/settings", icon: SettingsIcon },
]

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()

  return (
    <SidebarProvider>
      <Sidebar collapsible="icon" variant="inset">
        <SidebarHeader>
          <div className="flex items-center justify-between gap-2">
            <Link href="/dashboard" className="min-w-0">
              <div className="truncate text-sm font-semibold tracking-tight">
                FinancePro
              </div>
              <div className="text-muted-foreground truncate text-xs">
                Offline-first
              </div>
            </Link>
            <ThemeToggle />
          </div>
        </SidebarHeader>

        <SidebarContent>
          <SidebarMenu>
            {NAV.map((item) => {
              const isActive =
                pathname === item.href ||
                (item.href !== "/" && pathname?.startsWith(item.href + "/"))

              return (
                <SidebarMenuItem key={item.href}>
                  <SidebarMenuButton
                    asChild
                    isActive={isActive}
                    tooltip={item.title}
                  >
                    <Link href={item.href} className="gap-2">
                      <item.icon className="size-4" />
                      <span className="truncate">{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              )
            })}
          </SidebarMenu>
        </SidebarContent>

        <SidebarFooter>
          <LogoutButton />
        </SidebarFooter>
      </Sidebar>

      <SidebarInset>
        <header
          className={cn(
            "bg-background/80 supports-[backdrop-filter]:bg-background/60 sticky top-0 z-10 flex items-center gap-2 px-3 py-2 backdrop-blur",
          )}
        >
          <SidebarTrigger />
          <Separator orientation="vertical" className="h-6" />
          <div className="text-sm font-medium">FinancePro</div>
        </header>
        {children}
      </SidebarInset>
    </SidebarProvider>
  )
}