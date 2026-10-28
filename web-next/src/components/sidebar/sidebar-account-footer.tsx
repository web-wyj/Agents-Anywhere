"use client"

import * as React from "react"
import { LayoutDashboard, LogOut, Settings } from "lucide-react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
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
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { SidebarFooter, useSidebar } from "@/components/ui/sidebar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { useUsageSummary } from "@/features/dashboard/usage-summary"
import { formatCostCny, formatTokenCount } from "@/lib/turn-cost"
import type { WorkspaceState } from "@/components/workspace-context"
import { accountDisplayName } from "@/features/auth/account-profile"
import type { AuthMe } from "@/features/auth/types"
import { useTranslations } from "next-intl"

type SidebarAccountFooterProps = {
  me: AuthMe | null
  navigate: WorkspaceState["navigate"]
  signOut: () => void
}

export function SidebarAccountFooter({
  me,
  navigate,
  signOut,
}: SidebarAccountFooterProps) {
  const t = useTranslations("dashboard")
  const tCommon = useTranslations("common")
  const tAdmin = useTranslations("admin")
  const { setOpenMobile } = useSidebar()
  const [signOutOpen, setSignOutOpen] = React.useState(false)
  const go = (page: "settings" | "admin", sub?: string) => {
    navigate(page, sub)
    setOpenMobile(false)
  }
  const userId = me ? accountDisplayName(me) : "Unknown"
  const userRole = me?.role ? me.role.replace(/^\w/, (char) => char.toUpperCase()) : ""
  const summary = useUsageSummary()
  const userInitials = userId.slice(0, 2).toUpperCase()
  const isAdmin = me?.role === "admin"

  return (
    <>
      <SidebarFooter className="min-w-0 px-3 py-3">
        <div className="flex w-full min-w-0 items-center gap-2">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              className="flex min-w-0 flex-1 items-center gap-3 rounded-lg px-1 py-1.5 transition-colors hover:bg-sidebar-accent"
            >
              <Avatar className="size-9 rounded-full">
                {me?.avatar && <AvatarImage src={me.avatar} alt={userId} />}
                <AvatarFallback className="rounded-full bg-primary text-primary-foreground">{userInitials}</AvatarFallback>
              </Avatar>
              <div className="flex min-w-0 flex-1 flex-col text-left leading-tight">
                <span className="truncate text-sm font-medium" title={userId}>{userId}</span>
                <span className="truncate text-xs text-muted-foreground">{userRole}</span>
              </div>
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent side="top" align="start" className="w-64 p-1">
            <div className="flex items-center gap-3 px-2 py-3">
              <Avatar className="size-12 rounded-full">
                {me?.avatar && <AvatarImage src={me.avatar} alt={userId} />}
                <AvatarFallback className="rounded-full bg-primary text-primary-foreground">{userInitials}</AvatarFallback>
              </Avatar>
              <div className="flex min-w-0 flex-1 flex-col leading-tight">
                <span className="truncate text-sm font-semibold" title={userId}>{userId}</span>
                <span className="truncate text-xs text-muted-foreground">{userRole}</span>
              </div>
            </div>
            <DropdownMenuSeparator />
            <DropdownMenuItem className="gap-3 py-2.5" onClick={() => go("settings", "account")}>
              <Settings className="size-4 text-muted-foreground" />
              {t("nav.settings")}
            </DropdownMenuItem>
            {isAdmin ? (
              <DropdownMenuItem className="gap-3 py-2.5" onClick={() => go("admin")}>
                <LayoutDashboard className="size-4 text-muted-foreground" />
                {tAdmin("title")}
              </DropdownMenuItem>
            ) : null}
            <DropdownMenuSeparator />
            <DropdownMenuItem className="gap-3 py-2.5" onClick={() => setSignOutOpen(true)}>
              <LogOut className="size-4 text-muted-foreground" />
              {t("actions.signOut")}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
        {summary ? (
          <Popover>
            <PopoverTrigger asChild>
              <button
                type="button"
                className="shrink-0 rounded-md px-1.5 py-1 text-right text-[11px] leading-tight text-muted-foreground transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
              >
                <span className="block tabular-nums">{t("usage.today", { cost: formatCostCny(summary.todayCny) })}</span>
                <span className="block tabular-nums">
                  {summary.balanceCny === null ? "—" : t("usage.balance", { cost: formatCostCny(summary.balanceCny) })}
                </span>
              </button>
            </PopoverTrigger>
            <PopoverContent side="top" align="end" className="w-56 text-xs">
              <div className="grid gap-1">
                <div className="flex justify-between"><span className="text-muted-foreground">{t("usage.todayLabel")}</span><span className="tabular-nums">{formatCostCny(summary.todayCny)}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">{t("usage.tokens")}</span><span className="tabular-nums">{formatTokenCount(summary.todayTokens)}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">{t("usage.input")}</span><span className="tabular-nums">{formatTokenCount(summary.todayInput)}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">{t("usage.output")}</span><span className="tabular-nums">{formatTokenCount(summary.todayOutput)}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">{t("usage.cache")}</span><span className="tabular-nums">{formatTokenCount(summary.todayCacheRead)}</span></div>
                <div className="mt-1 flex justify-between border-t pt-1"><span className="text-muted-foreground">{t("usage.balanceLabel")}</span><span className="tabular-nums">{summary.balanceCny === null ? "—" : formatCostCny(summary.balanceCny)}</span></div>
              </div>
            </PopoverContent>
          </Popover>
        ) : null}
        </div>
      </SidebarFooter>

      <Dialog open={signOutOpen} onOpenChange={setSignOutOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>{t("signOut.title")}</DialogTitle>
            <DialogDescription>
              {t("signOut.description")}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSignOutOpen(false)}>
              {tCommon("cancel")}
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                setSignOutOpen(false)
                signOut()
              }}
            >
              {t("actions.signOut")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
