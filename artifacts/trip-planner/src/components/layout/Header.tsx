import { Link } from "wouter";
import { Truck, List, Home } from "lucide-react";

export function Header() {
  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/60 bg-background/70 backdrop-blur-xl supports-[backdrop-filter]:bg-background/50">
      <div className="h-0.5 w-full bg-gradient-amber" />
      <div className="container mx-auto flex h-16 items-center justify-between px-4 sm:px-6 lg:px-8">
        <Link href="/" className="flex items-center space-x-3 no-underline group">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-amber shadow-[0_0_20px_-2px_hsl(36_100%_50%/0.6)] transition-transform group-hover:scale-105">
            <Truck className="h-5 w-5 text-black" strokeWidth={2.5} />
          </div>
          <span className="font-bold tracking-tight text-foreground text-lg">
            ELD <span className="text-gradient-amber">Trip Planner</span>
          </span>
        </Link>
        <nav className="flex items-center gap-1 text-sm font-medium">
          <Link href="/" className="flex items-center gap-2 px-3 py-2 rounded-md text-foreground/70 hover:text-foreground hover:bg-white/5 transition-colors">
            <Home className="h-4 w-4" />
            <span className="hidden sm:inline-block">Plan Trip</span>
          </Link>
          <Link href="/trips" className="flex items-center gap-2 px-3 py-2 rounded-md text-foreground/70 hover:text-foreground hover:bg-white/5 transition-colors">
            <List className="h-4 w-4" />
            <span className="hidden sm:inline-block">All Trips</span>
          </Link>
        </nav>
      </div>
    </header>
  );
}
