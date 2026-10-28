"use client"

import * as React from "react"
import { Braces, Check, ChevronDown, Copy, Ellipsis, Loader2, SquareArrowOutUpRight } from "lucide-react"
import { useTranslations } from "next-intl"
import { toast } from "sonner"

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
import { dashboardApi } from "@/features/dashboard/api"
import type { SessionShareScope, TimelineItem } from "@/features/dashboard/types"
import { useCoarsePointer } from "@/hooks/use-coarse-pointer"
import { cn } from "@/lib/utils"
import { copyText } from "@/lib/clipboard"
import { formatCostCny, formatTokenCount, type TurnCost } from "@/lib/turn-cost"

/** Cost of one turn, reported by the runtime through the item's `source.cost`. */
export type { TurnCost }

export type TurnAction = {
  copyText: string
  itemIds: string[]
  /** Assistant replies of the turn, kept for the debug copy actions. */
  items: TimelineItem[]
  /** Per-turn cost when the runtime reports it; absent otherwise. */
  cost?: TurnCost
}

export function TurnActions({
  token,
  sessionId,
  action,
}: {
  token: string
  sessionId: string
  action: TurnAction
}) {
  const t = useTranslations("dashboard.session")
  const tCommon = useTranslations("common")
  const coarsePointer = useCoarsePointer()
  const [copied, setCopied] = React.useState(false)
  const [dialogOpen, setDialogOpen] = React.useState(false)
  const [scope, setScope] = React.useState<SessionShareScope>("message")
  const [sharing, setSharing] = React.useState(false)
  const [costExpanded, setCostExpanded] = React.useState(false)

  // Debug copies. On touch devices the timeline no longer takes the long press
  // for a context menu, so these actions live behind this "more" menu instead.
  const debugItemIds = action.items.map((item) => item.id).join("\n")
  const debugItemJson = action.items.length === 0
    ? ""
    : JSON.stringify(action.items.length === 1 ? action.items[0] : action.items, null, 2)
  const copyDebug = React.useCallback(async (value: string) => {
    try {
      await copyText(value)
      toast.success(tCommon("copied"))
    } catch {
      toast.error(tCommon("copyFailed"))
    }
  }, [tCommon])

  const copyReply = React.useCallback(async () => {
    if (!action.copyText) return
    setCopied(false)
    try {
      await copyText(action.copyText)
      setCopied(true)
      toast.success(t("replyCopied"))
      window.setTimeout(() => setCopied(false), 1200)
    } catch {
      toast.error(t("copyReplyFailed"))
    }
  }, [action.copyText, t])

  const createShare = React.useCallback(async () => {
    if (sharing) return
    setSharing(true)
    try {
      const result = await dashboardApi.createSessionShare(token, sessionId, {
        scope,
        itemIds: scope === "message" ? action.itemIds : [],
      })
      if (typeof navigator.share === "function") {
        try {
          await navigator.share({ url: result.shareUrl })
          setDialogOpen(false)
          return
        } catch (error) {
          if (error instanceof DOMException && error.name === "AbortError") return
        }
      }
      await copyText(result.shareUrl)
      toast.success(t("shareLinkCopied"))
      setDialogOpen(false)
    } catch {
      toast.error(t("shareFailed"))
    } finally {
      setSharing(false)
    }
  }, [action.itemIds, scope, sessionId, sharing, t, token])

  return (
    <>
      <div className="mt-1">
        <div className="flex items-center gap-0.5">
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            aria-label={t("copyReply")}
            title={t("copyReply")}
            disabled={!action.copyText}
            onClick={copyReply}
            className="text-muted-foreground hover:text-foreground"
          >
            {copied ? <Check /> : <Copy />}
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            aria-label={t("share")}
            title={t("share")}
            onClick={() => setDialogOpen(true)}
            className="text-muted-foreground hover:text-foreground"
          >
            <SquareArrowOutUpRight />
          </Button>
          {/* Touch devices have no right-click, so the debug copies get an
              explicit entry here. Mouse users keep the timeline context menu. */}
          {coarsePointer ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  aria-label={t("moreActions")}
                  title={t("moreActions")}
                  disabled={action.items.length === 0}
                  className="text-muted-foreground hover:text-foreground"
                >
                  <Ellipsis />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-48">
                <DropdownMenuItem disabled={!debugItemIds} onSelect={() => copyDebug(debugItemIds)}>
                  <Copy data-icon="inline-start" />
                  {t("copyItemId")}
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem disabled={!debugItemJson} onSelect={() => copyDebug(debugItemJson)}>
                  <Braces data-icon="inline-start" />
                  {t("copyItemJson")}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : null}
        </div>
        {action.cost ? (
          <div className="mt-0.5 flex flex-wrap items-center gap-1 text-[11px] leading-4 text-muted-foreground">
            <span className="tabular-nums">{formatCostCny(action.cost.cny)}</span>
            <span aria-hidden>·</span>
            <span className="tabular-nums">
              {t("turnCostTokens", {
                count: formatTokenCount(action.cost.input + action.cost.output),
              })}
            </span>
            <button
              type="button"
              onClick={() => setCostExpanded((expanded) => !expanded)}
              aria-expanded={costExpanded}
              aria-label={t("turnCostDetails")}
              title={t("turnCostDetails")}
              className="inline-flex size-4 items-center justify-center rounded text-muted-foreground/70 hover:text-foreground"
            >
              <ChevronDown className={cn("size-3 transition-transform", costExpanded && "rotate-180")} />
            </button>
            {costExpanded ? (
              <span className="basis-full tabular-nums text-muted-foreground/80">
                {t("turnCostBreakdown", {
                  input: formatTokenCount(action.cost.input),
                  output: formatTokenCount(action.cost.output),
                  cache: formatTokenCount(action.cost.cacheRead),
                })}
              </span>
            ) : null}
          </div>
        ) : null}
      </div>

      <Dialog open={dialogOpen} onOpenChange={(open) => { if (!sharing) setDialogOpen(open) }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("shareDialogTitle")}</DialogTitle>
            <DialogDescription>{t("shareDialogDescription")}</DialogDescription>
          </DialogHeader>
          <div className="grid gap-2">
            <ShareScopeOption
              selected={scope === "message"}
              title={t("shareCurrentReply")}
              description={t("shareCurrentReplyDescription")}
              onClick={() => setScope("message")}
            />
            <ShareScopeOption
              selected={scope === "session"}
              title={t("shareEntireSession")}
              description={t("shareEntireSessionDescription")}
              onClick={() => setScope("session")}
            />
          </div>
          <DialogFooter>
            <Button type="button" onClick={createShare} disabled={sharing}>
              {sharing ? <Loader2 className="animate-spin" data-icon="inline-start" /> : <SquareArrowOutUpRight data-icon="inline-start" />}
              {t("createShareLink")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}

function ShareScopeOption({
  selected,
  title,
  description,
  onClick,
}: {
  selected: boolean
  title: string
  description: string
  onClick: () => void
}) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      onClick={onClick}
      className={cn(
        "rounded-lg border px-3 py-3 text-left transition-colors",
        selected ? "border-foreground/35 bg-accent" : "border-border hover:bg-accent/50",
      )}
    >
      <span className="block text-sm font-medium">{title}</span>
      <span className="mt-1 block text-xs leading-relaxed text-muted-foreground">{description}</span>
    </button>
  )
}
