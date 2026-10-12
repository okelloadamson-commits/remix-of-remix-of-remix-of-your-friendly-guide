import { Link, useNavigate } from "react-router-dom";
import { Search, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useState, useEffect, FormEvent } from "react";
import { searchContent } from "@/lib/firebase-db";
import { SubscriptionModal } from "@/components/subscription/SubscriptionModal";
import { AuthModal } from "@/components/auth/AuthModal";
import { ProfileDropdown } from "@/components/auth/ProfileDropdown";
import { useAuth } from "@/contexts/AuthContext";
import { ThemeToggle } from "@/components/ThemeToggle";
import luoAncientLogo from "@/assets/luo-ancient-logo.png";

export function Header() {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("");
  const [subscriptionOpen, setSubscriptionOpen] = useState(false);
  const [authOpen, setAuthOpen] = useState(false);
  const [authMode, setAuthMode] = useState<"login" | "signup">("login");
  
  const { user } = useAuth();
  const [showSuggest, setShowSuggest] = useState(false);
  const [searching, setSearching] = useState(false);
  const [suggestions, setSuggestions] = useState<{ id: string; title: string; poster: string; year?: number; kind: "movie" | "series" }[]>([]);

  useEffect(() => {
    const q = searchQuery.trim();
    if (q.length < 2) { setSuggestions([]); return; }
    let cancelled = false;
    setSearching(true);
    const t = setTimeout(async () => {
      const r = await searchContent(q);
      if (cancelled) return;
      setSuggestions([
        ...r.movies.map((m) => ({ id: m.id || "", title: m.title, poster: m.posterUrl, year: m.releaseYear, kind: "movie" as const })),
        ...r.series.map((s) => ({ id: s.id || "", title: s.title, poster: s.posterUrl, year: s.releaseYear, kind: "series" as const })),
      ].filter((x) => x.id).slice(0, 8));
      setSearching(false);
    }, 250);
    return () => { cancelled = true; clearTimeout(t); };
  }, [searchQuery]);

  const openAuth = (mode: "login" | "signup") => {
    setAuthMode(mode);
    setAuthOpen(true);
  };

  const handleSearch = (e: FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/search?q=${encodeURIComponent(searchQuery.trim())}`);
    }
  };

  return (
    <>
      <header className="sticky top-0 z-50 bg-background border-b border-border backdrop-blur-custom">
        <div className="flex items-center justify-between gap-2 lg:gap-4 px-3 lg:px-6 py-3">
          {/* Mobile Logo */}
          <Link to="/" className="flex items-center gap-2 lg:hidden flex-shrink-0">
            <img 
              src={luoAncientLogo} 
              alt="Luo Ancient Movies" 
              className="w-8 h-8 rounded-full object-cover flex-shrink-0"
            />
            <h1 className="text-sm font-bold leading-tight">Luo Ancient</h1>
          </Link>

          {/* Desktop Logo */}
          <Link to="/" className="hidden lg:flex items-center gap-2">
            <img 
              src={luoAncientLogo} 
              alt="Luo Ancient Movies" 
              className="w-10 h-10 rounded-full object-cover flex-shrink-0"
            />
            <h1 className="text-xl font-bold">Luo Ancient</h1>
          </Link>

          {/* Search */}
          <form onSubmit={handleSearch} className="flex-1 max-w-xl relative">
            <div className="search-gradient-border">
              <div className="search-gradient-inner relative">
                <Search className="absolute left-2 lg:left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground z-10" />
                <Input
                  type="text"
                  placeholder="Search movies, TV shows, adverts..."
                  value={searchQuery}
                  onChange={(e) => { setSearchQuery(e.target.value); setShowSuggest(true); }}
                  onFocus={() => setShowSuggest(true)}
                  onBlur={() => setTimeout(() => setShowSuggest(false), 200)}
                  className="pl-8 lg:pl-10 pr-8 lg:pr-10 bg-transparent border-transparent rounded-full text-foreground placeholder:text-muted-foreground h-9 lg:h-10 text-sm focus-visible:ring-0 focus-visible:ring-offset-0"
                />
              </div>
            </div>
            {showSuggest && searchQuery.trim().length >= 2 && (
              <div className="absolute left-0 right-0 top-full mt-2 z-50 bg-popover text-popover-foreground border border-border rounded-xl shadow-lg max-h-96 overflow-y-auto">
                {suggestions.length === 0 ? (
                  <p className="p-3 text-sm text-muted-foreground">{searching ? "Searching..." : "No matches"}</p>
                ) : (
                  suggestions.map((s) => (
                    <button
                      key={s.kind + s.id}
                      type="button"
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => { setShowSuggest(false); setSearchQuery(""); navigate(s.kind === "movie" ? `/watch/${s.id}` : `/watch/series/${s.id}`); }}
                      className="w-full flex items-center gap-3 p-2 hover:bg-accent text-left"
                    >
                      <img src={s.poster} alt={s.title} className="w-10 h-14 object-cover rounded" />
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate">{s.title}</p>
                        <p className="text-xs text-muted-foreground">{s.kind === "movie" ? "Movie" : "TV Series"}{s.year ? ` • ${s.year}` : ""}</p>
                      </div>
                    </button>
                  ))
                )}
              </div>
            )}
          </form>


          {/* Actions */}
          <div className="flex items-center gap-1 lg:gap-2 flex-shrink-0">
            <div className="flex items-center gap-2">
              {/* Mobile Download Button */}
              <Link to="/apps" className="lg:hidden">
                <Button variant="ghost" size="sm" className="p-2">
                  <Download className="w-5 h-5 text-green-600" />
                </Button>
              </Link>

              <ThemeToggle />

              {/* Subscribe Button - Always visible */}
              <span className="subscribe-gradient-border hidden lg:inline-flex">
                <Button
                  size="sm"
                  className="rounded-full bg-gradient-to-r from-purple-600 to-pink-500 hover:from-purple-700 hover:to-pink-600 text-white text-sm font-medium"
                  onClick={() => {
                    if (!user) {
                      openAuth("login");
                    } else {
                      setSubscriptionOpen(true);
                    }
                  }}
                >
                  Subscribe
                </Button>
              </span>

              {user ? (
                <ProfileDropdown />
              ) : (
                <Button 
                  size="sm" 
                  className="bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600 text-white text-sm font-medium"
                  onClick={() => openAuth("login")}
                >
                  Login
                </Button>
              )}
            </div>
          </div>
        </div>
      </header>

      <SubscriptionModal open={subscriptionOpen} onOpenChange={setSubscriptionOpen} />
      <AuthModal open={authOpen} onOpenChange={setAuthOpen} defaultMode={authMode} />
    </>
  );
}
