// components/layout/AppShell.tsx
"use client"

import { useAuth, FullPageLoader } from "@/lib/auth"
import { usePathname, useRouter } from "next/navigation"
import { useEffect, useState } from "react"
import Link from "next/link"
import {
  Factory,
  ClipboardList,
  FileCheck,
  FlaskConical,
  Beaker,
  CheckSquare,
  Boxes,
  Truck,
  Settings,
  LogOut,
  LayoutDashboard,
  DollarSign,
  Menu,
  X,
  PackagePlus,
  CircleCheckBig,
  Hammer,
  ChevronDown,
  Layers,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

// --- Navigation structure ---
const topNavItems = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/orders", label: "Orders", icon: Truck },
  { href: "/full-kitting", label: "Composition", icon: Boxes },
  { href: "/lab-test", label: "Lab Check Composition", icon: Settings },
  { href: "/job-cards", label: "Job Cards", icon: ClipboardList },
  { href: "/production", label: "Production", icon: Factory },
  { href: "/lab-testing1", label: "Lab Test 1", icon: FlaskConical },
  { href: "/lab-testing2", label: "Lab Test 2", icon: Beaker },
  { href: "/chemical-test", label: "Chemical Test", icon: CheckSquare },
  { href: "/check", label: "Check", icon: FileCheck },
  { href: "/management", label: "Management Approval", icon: Settings },
  { href: "/costing", label: "Costing", icon: DollarSign },
  { href: "/tally", label: "Tally", icon: Boxes },
]

const sfNavItems = [
  { href: "/sf-production", label: "SF Production", icon: PackagePlus },
  { href: "/sfjob-card", label: "Job Card Planning", icon: ClipboardList },
  { href: "/sfproduction-entry", label: "Production Entry", icon: FileCheck },
  { href: "/mark-done", label: "Mark Done", icon: CircleCheckBig },
  { href: "/crushing", label: "Crushing", icon: Hammer },
]

const sfHrefs = sfNavItems.map((i) => i.href)

// --- Sidebar Component ---
function Sidebar({ isMinimized, toggleMinimize }: { isMinimized: boolean; toggleMinimize: () => void }) {
  const pathname = usePathname()
  const { logout, user } = useAuth()

  // Auto-expand if current page is inside the SF group
  const isSfActive = sfHrefs.includes(pathname)
  const [sfOpen, setSfOpen] = useState(isSfActive)

  // Keep open if navigating within SF group
  useEffect(() => {
    if (isSfActive) setSfOpen(true)
  }, [isSfActive])

  const navLinkClass = (href: string) =>
    cn(
      "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-all duration-150",
      "text-gray-600 hover:bg-purple-50 hover:text-purple-700",
      {
        "bg-purple-600 text-white hover:bg-purple-700 hover:text-white shadow-sm": pathname === href,
        "justify-center": isMinimized,
      }
    )

  return (
    <aside
      className={cn(
        "flex flex-col border-r border-gray-100 bg-white transition-all duration-300 ease-in-out",
        isMinimized ? "w-16" : "w-64",
        "h-screen fixed top-0 left-0 z-20 shadow-sm"
      )}
    >
      {/* Header */}
      <div className={cn("flex items-center justify-between px-4 py-4 border-b border-gray-100", { "justify-center": isMinimized })}>
        {!isMinimized && (
          <h1 className="text-lg font-bold text-purple-700 tracking-tight">
            Production Planning
          </h1>
        )}
        <Button
          variant="ghost"
          size={isMinimized ? "icon" : "sm"}
          onClick={toggleMinimize}
          className="hover:bg-purple-100 text-purple-600"
        >
          {isMinimized ? <Menu className="h-5 w-5" /> : <X className="h-5 w-5" />}
        </Button>
      </div>

      {/* Nav */}
      <nav className="flex-1 flex flex-col gap-0.5 px-2 py-3 overflow-y-auto">

        {/* Regular nav items */}
        {topNavItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            prefetch={false}
            title={isMinimized ? item.label : ""}
            className={navLinkClass(item.href)}
          >
            <item.icon className="h-4 w-4 shrink-0" />
            {!isMinimized && <span className="truncate">{item.label}</span>}
          </Link>
        ))}

        {/* ── Semi Finished Accordion ── */}
        <div className="mt-1">
          {/* Accordion trigger */}
          <button
            onClick={() => !isMinimized && setSfOpen((o) => !o)}
            title={isMinimized ? "Semi Finished" : ""}
            className={cn(
              "w-full flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-semibold transition-all duration-150",
              isSfActive
                ? "text-purple-700 bg-purple-50"
                : "text-gray-500 hover:bg-purple-50 hover:text-purple-700",
              { "justify-center": isMinimized }
            )}
          >
            <Layers className="h-4 w-4 shrink-0" />
            {!isMinimized && (
              <>
                <span className="flex-1 text-left truncate">Semi Finished</span>
                <ChevronDown
                  className={cn(
                    "h-4 w-4 shrink-0 transition-transform duration-300",
                    sfOpen ? "rotate-180" : "rotate-0"
                  )}
                />
              </>
            )}
          </button>

          {/* Accordion body — smooth height animation */}
          <div
            className={cn(
              "overflow-hidden transition-all duration-300 ease-in-out",
              sfOpen && !isMinimized ? "max-h-96 opacity-100" : "max-h-0 opacity-0"
            )}
          >
            <div className="ml-3 pl-3 border-l-2 border-purple-100 mt-1 flex flex-col gap-0.5">
              {sfNavItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  prefetch={false}
                  className={cn(
                    "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-all duration-150",
                    pathname === item.href
                      ? "bg-purple-600 text-white shadow-sm"
                      : "text-gray-600 hover:bg-purple-50 hover:text-purple-700"
                  )}
                >
                  <item.icon className="h-4 w-4 shrink-0" />
                  <span className="truncate">{item.label}</span>
                </Link>
              ))}
            </div>
          </div>
        </div>

        {/* Settings — pinned at bottom of nav */}
        <div className="mt-auto pt-2 border-t border-gray-100">
          <Link
            href="/settings"
            prefetch={false}
            title={isMinimized ? "Settings" : ""}
            className={navLinkClass("/settings")}
          >
            <Settings className="h-4 w-4 shrink-0" />
            {!isMinimized && <span className="truncate">Settings</span>}
          </Link>
        </div>
      </nav>

      {/* Footer — logout + user */}
      <div className="p-3 border-t border-gray-100">
        <Button
          variant="ghost"
          className={cn(
            "w-full justify-start gap-3 hover:bg-red-50 text-gray-500 hover:text-red-600 rounded-lg",
            { "justify-center": isMinimized }
          )}
          onClick={logout}
        >
          <LogOut className="h-4 w-4" />
          {!isMinimized && "Logout"}
        </Button>
        {user && !isMinimized && (
          <p className="mt-2 text-xs text-center text-gray-400">
            Logged in as <span className="font-semibold text-purple-600">{user.username}</span>
          </p>
        )}
      </div>

      {/* Branding footer */}
      {!isMinimized && (
        <div className="w-full px-4 py-3 text-center text-xs text-white bg-gradient-to-r from-purple-600 to-indigo-600">
          Powered by{" "}
          <Link href="https://www.botivate.in/" target="_blank" rel="noopener noreferrer" className="text-white hover:underline font-semibold">
            Botivate
          </Link>
        </div>
      )}
    </aside>
  )
}

// --- AppShell ---
export function AppShell({ children }: { children: React.ReactNode }) {
  const { user, isAuthLoading } = useAuth()
  const pathname = usePathname()
  const router = useRouter()
  const [isSidebarMinimized, setIsSidebarMinimized] = useState(false)

  const toggleSidebar = () => setIsSidebarMinimized((v) => !v)

  useEffect(() => {
    if (isAuthLoading) return
    const isAuthPage = pathname === "/login"
    if (!user && !isAuthPage) router.push("/login")
    if (user && isAuthPage) router.push("/")
  }, [user, isAuthLoading, pathname, router])

  if (isAuthLoading || (!user && pathname !== "/login")) {
    return <FullPageLoader />
  }

  if (pathname === "/login") {
    return <>{children}</>
  }

  return (
    <div className="flex">
      <Sidebar isMinimized={isSidebarMinimized} toggleMinimize={toggleSidebar} />
      <main
        className={cn(
          "flex-1 bg-gray-50 p-4 sm:p-6 lg:p-8 transition-all duration-300 ease-in-out min-h-screen",
          isSidebarMinimized ? "ml-16" : "ml-64"
        )}
      >
        {children}
      </main>
    </div>
  )
}