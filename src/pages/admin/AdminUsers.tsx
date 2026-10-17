import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from "@/components/ui/dropdown-menu";
import { Search, Trash2, CreditCard, UserX, ChevronLeft, Users, UserCheck, UserMinus, Gift, ChevronDown } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { getAllUsers, subscribeUsers, updateUserSubscription, removeUserSubscription, deleteUser, getGiftDayState, giftOneDayToAllUsers, revokeGiftDayFromAllUsers, type UserData } from "@/lib/admin-db";
import { isSubscriptionCurrent, preserveSubscriberAccounts } from "@/lib/subscription-time";
import { useSubscriptionClock } from "@/hooks/useSubscriptionClock";
import { format, differenceInDays } from "date-fns";
import { Label } from "@/components/ui/label";
import { Link } from "react-router-dom";
import { subscribePlans, subscribeAgentPlans } from "@/lib/plans-db";
import { useAdmin } from "@/contexts/AdminContext";


type FilterTab = "all" | "active" | "free";

export default function AdminUsers() {
  const [users, setUsers] = useState<UserData[]>([]);
  const now = useSubscriptionClock(users.map((user) => user.subscription?.expiresAt));
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState<FilterTab>("all");
  const [subscriptionDialogOpen, setSubscriptionDialogOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<UserData | null>(null);
  const [selectedPlan, setSelectedPlan] = useState("");
  const [customDays, setCustomDays] = useState("");
  const [customMinutes, setCustomMinutes] = useState("");
  const [customHours, setCustomHours] = useState("");
  const [normalPlans, setNormalPlans] = useState<{ name: string; days: number }[]>([]);
  const [agentPlanList, setAgentPlanList] = useState<{ name: string; days: number }[]>([]);
  const PLANS = [...normalPlans, ...agentPlanList];
  useEffect(() => {
    const u1 = subscribePlans((p) => setNormalPlans(p.map(({ name, days }) => ({ name, days }))));
    const u2 = subscribeAgentPlans((p) => setAgentPlanList(p.map(({ name, days }) => ({ name, days }))));
    return () => { u1(); u2(); };
  }, []);
  const [giftActive, setGiftActive] = useState(false);
  const [giftLoading, setGiftLoading] = useState(false);
  const [giftMenuOpen, setGiftMenuOpen] = useState(false);
  const [giftPasswordOpen, setGiftPasswordOpen] = useState(false);
  const [giftPassword, setGiftPassword] = useState("");
  const [giftPasswordError, setGiftPasswordError] = useState("");
  const [giftPasswordVerifying, setGiftPasswordVerifying] = useState(false);
  const [giftUnlocked, setGiftUnlocked] = useState(false);
  const { toast } = useToast();
  const { verifyAdminPassword } = useAdmin();

  useEffect(() => {
    const unsubscribe = subscribeUsers((data) => {
      setUsers(data);
      setIsLoading(false);
    }, () => {
      setIsLoading(false);
      toast({ title: "Unable to refresh users", variant: "destructive" });
    });
    getGiftDayState().then((s) => setGiftActive(s.active)).catch(() => {});
    return unsubscribe;
  }, []);

  const loadUsers = async () => {
    setIsLoading(true);
    const data = await getAllUsers();
    
    setUsers(preserveSubscriberAccounts(data));
    setIsLoading(false);
  };

  const handleManageSubscription = (user: UserData) => {
    setSelectedUser(user);
    setSelectedPlan(user.subscription?.plan || "");
    setCustomDays("");
    setCustomMinutes("");
    setCustomHours("");
    setSubscriptionDialogOpen(true);
  };

  const handleUpdateSubscription = async () => {
    if (!selectedUser || !selectedPlan) return;
    
    const plan = PLANS.find((p) => p.name === selectedPlan);
    if (!plan) return;

    try {
      await updateUserSubscription(selectedUser.id, plan.name, plan.days);
      toast({ title: "Subscription updated successfully!" });
      setSubscriptionDialogOpen(false);
      loadUsers();
    } catch (error) {
      toast({ title: "Error updating subscription", variant: "destructive" });
    }
  };

  const handleCustomDuration = async (value: string, unit: "minutes" | "hours" | "days") => {
    if (!selectedUser || !value) return;
    const days = parseInt(value);
    if (isNaN(days) || days <= 0) {
      toast({ title: `Please enter a valid number of ${unit}`, variant: "destructive" });
      return;
    }

    try {
      await updateUserSubscription(selectedUser.id, `Custom (${days} ${unit})`, days, unit);
      toast({ title: `Subscription activated for ${days} ${unit}!` });
      setSubscriptionDialogOpen(false);
      loadUsers();
    } catch (error) {
      toast({ title: "Error updating subscription", variant: "destructive" });
    }
  };

  const handleDeactivateSubscription = async (userId: string, userName: string) => {
    if (confirm(`Are you sure you want to deactivate ${userName}'s subscription? They will lose access immediately.`)) {
      try {
        await removeUserSubscription(userId);
        // Immediately update local state so admin UI reflects the change
        setUsers((prev) =>
          prev.map((u) =>
            u.id === userId ? { ...u, subscription: undefined } : u
          )
        );
        toast({ title: "Subscription deactivated successfully!" });
      } catch (error) {
        toast({ title: "Error deactivating subscription", variant: "destructive" });
      }
    }
  };

  const handleActivateGiftDay = async () => {
    if (!confirm("Activate the 1-day free gift for ALL users?")) return;
    setGiftLoading(true);
    toast({ title: "Processing... this may take a moment" });
    try {
      const n = await giftOneDayToAllUsers();
      setGiftActive(true);
      toast({ title: `Gift day activated for ${n} user(s)` });
      await loadUsers();
    } catch (e) {
      toast({ title: "Failed to activate gift day", variant: "destructive" });
    } finally {
      setGiftLoading(false);
    }
  };

  const handleDeactivateGiftDay = async () => {
    if (!confirm("Deactivate the 1-day free gift and revert it for all recipients?")) return;
    setGiftLoading(true);
    toast({ title: "Processing... this may take a moment" });
    try {
      const n = await revokeGiftDayFromAllUsers();
      setGiftActive(false);
      toast({ title: `Gift day deactivated for ${n} user(s)` });
      await loadUsers();
    } catch (e) {
      toast({ title: "Failed to deactivate gift day", variant: "destructive" });
    } finally {
      setGiftLoading(false);
    }
  };

  const handleDeleteUser = async (userId: string) => {
    if (confirm("Are you sure you want to delete this user? This action cannot be undone.")) {
      try {
        await deleteUser(userId);
        toast({ title: "User deleted successfully!" });
        loadUsers();
      } catch (error) {
        toast({ title: "Error deleting user", variant: "destructive" });
      }
    }
  };

  const isSubscriptionActive = (user: UserData) => {
    return isSubscriptionCurrent(user.subscription, now);
  };

  const getRemainingTime = (expiresAt: Date) => {
    const diff = new Date(expiresAt).getTime() - now;
    if (diff <= 0) return "Expired";
    
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((diff % (1000 * 60)) / 1000);
    
    if (days > 0) return `${days}d:${hours}h:${minutes}m:${seconds}s`;
    if (hours > 0) return `${hours}h:${minutes}m:${seconds}s`;
    if (minutes > 0) return `${minutes}m:${seconds}s`;
    return `${seconds}s`;
  };

  // Filter users based on active tab and search query
  const filteredUsers = users.filter((user) => {
    const matchesSearch = 
      user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.email.toLowerCase().includes(searchQuery.toLowerCase());
    
    if (!matchesSearch) return false;
    
    switch (activeTab) {
      case "active":
        return isSubscriptionActive(user);
      case "free":
        return !user.subscription || !isSubscriptionActive(user);
      default:
        return true;
    }
  });

  const stats = {
    total: users.length,
    active: users.filter(isSubscriptionActive).length,
    free: users.filter((u) => !u.subscription || !isSubscriptionActive(u)).length,
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link to="/admin/dashboard">
          <Button variant="ghost" size="icon">
            <ChevronLeft className="w-5 h-5" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold">Users</h1>
          <p className="text-muted-foreground">Manage all registered users</p>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as FilterTab)} className="flex-1 min-w-[280px]">
          <TabsList className="grid w-full max-w-md grid-cols-3 bg-[#0d1e36]">
          <TabsTrigger value="all" className="flex items-center gap-2 data-[state=active]:bg-primary">
            <Users className="w-4 h-4" />
            All ({stats.total})
          </TabsTrigger>
          <TabsTrigger value="active" className="flex items-center gap-2 data-[state=active]:bg-green-600">
            <UserCheck className="w-4 h-4" />
            Active ({stats.active})
          </TabsTrigger>
          <TabsTrigger value="free" className="flex items-center gap-2 data-[state=active]:bg-orange-600">
            <UserMinus className="w-4 h-4" />
            Free ({stats.free})
          </TabsTrigger>
          </TabsList>
        </Tabs>

        <DropdownMenu
          open={giftMenuOpen}
          onOpenChange={(open) => {
            if (open && !giftUnlocked) {
              setGiftPassword("");
              setGiftPasswordError("");
              setGiftPasswordOpen(true);
              return;
            }
            setGiftMenuOpen(open);
          }}
        >
          <DropdownMenuTrigger asChild>
            <Button
              disabled={giftLoading}
              className={`text-white ${giftActive ? "bg-green-600 hover:bg-green-700" : "bg-gradient-to-r from-pink-500 to-purple-600 hover:opacity-90"}`}
            >
              <Gift className="w-4 h-4 mr-2" />
              {giftLoading ? "Processing..." : giftActive ? "Gift Day: Active" : "Gift Day"}
              <ChevronDown className="w-4 h-4 ml-2" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuItem
              onClick={handleActivateGiftDay}
              disabled={giftLoading || giftActive}
              className="cursor-pointer"
            >
              <Gift className="w-4 h-4 mr-2 text-pink-500" />
              Activate Gift Day
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={handleDeactivateGiftDay}
              disabled={giftLoading || !giftActive}
              className="cursor-pointer text-red-500 focus:text-red-500"
            >
              <UserX className="w-4 h-4 mr-2" />
              Deactivate Gift Day
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        <Dialog
          open={giftPasswordOpen}
          onOpenChange={(open) => {
            setGiftPasswordOpen(open);
            if (!open) {
              setGiftPassword("");
              setGiftPasswordError("");
            }
          }}
        >
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Admin password required</DialogTitle>
            </DialogHeader>
            <form
              onSubmit={async (e) => {
                e.preventDefault();
                setGiftPasswordVerifying(true);
                setGiftPasswordError("");
                const ok = await verifyAdminPassword(giftPassword);
                setGiftPasswordVerifying(false);
                if (ok) {
                  setGiftUnlocked(true);
                  setGiftPasswordOpen(false);
                  setGiftPassword("");
                  setGiftMenuOpen(true);
                } else {
                  setGiftPasswordError("Incorrect admin password");
                }
              }}
              className="space-y-4"
            >
              <div className="space-y-2">
                <Label htmlFor="gift-admin-password">Enter your admin password to manage Gift Day</Label>
                <Input
                  id="gift-admin-password"
                  type="password"
                  autoFocus
                  value={giftPassword}
                  onChange={(e) => setGiftPassword(e.target.value)}
                  placeholder="Admin password"
                />
                {giftPasswordError && (
                  <p className="text-sm text-red-500">{giftPasswordError}</p>
                )}
              </div>
              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => setGiftPasswordOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={giftPasswordVerifying || !giftPassword}>
                  {giftPasswordVerifying ? "Verifying..." : "Unlock"}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>

      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Search users..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10"
        />
      </div>

      <Card className="bg-[#0d1e36] border-border/50">
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>User</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Subscription</TableHead>
                <TableHead>Expires</TableHead>
                <TableHead>Remaining</TableHead>
                <TableHead>Joined</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8">Loading...</TableCell>
                </TableRow>
              ) : filteredUsers.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8">No users found</TableCell>
                </TableRow>
              ) : (
                filteredUsers.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        {user.avatar ? (
                          <img src={user.avatar} alt={user.name} className="w-8 h-8 rounded-full" />
                        ) : (
                          <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-sm font-medium">
                            {user.name.charAt(0).toUpperCase()}
                          </div>
                        )}
                        <span className="font-medium">{user.name}</span>
                      </div>
                    </TableCell>
                    <TableCell>{user.email}</TableCell>
                    <TableCell>
                      {isSubscriptionActive(user) ? (
                        <Badge className="bg-green-500">{user.subscription?.plan}</Badge>
                      ) : (
                        <Badge variant="secondary">Free</Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      {user.subscription?.expiresAt ? (
                        format(new Date(user.subscription.expiresAt), "MMM dd, yyyy HH:mm")
                      ) : (
                        "-"
                      )}
                    </TableCell>
                    <TableCell>
                      {isSubscriptionActive(user) && user.subscription?.expiresAt
                        ? getRemainingTime(user.subscription.expiresAt)
                        : "-"}
                    </TableCell>
                    <TableCell>
                      {user.createdAt ? format(new Date(user.createdAt), "MMM dd, yyyy") : "-"}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button variant="ghost" size="icon" onClick={() => handleManageSubscription(user)} title="Manage subscription">
                          <CreditCard className="w-4 h-4" />
                        </Button>
                        {isSubscriptionActive(user) && (
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            onClick={() => handleDeactivateSubscription(user.id, user.name)} 
                            title="Deactivate subscription"
                          >
                            <UserX className="w-4 h-4 text-orange-500" />
                          </Button>
                        )}
                        <Button variant="ghost" size="icon" className="text-destructive" onClick={() => handleDeleteUser(user.id)}>
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Subscription Dialog - Enhanced with all plans */}
      <Dialog open={subscriptionDialogOpen} onOpenChange={setSubscriptionDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Manage Subscription</DialogTitle>
          </DialogHeader>
          <div className="space-y-6">
            <div className="bg-muted/50 p-4 rounded-lg">
              <p className="font-medium">{selectedUser?.name}</p>
              <p className="text-sm text-muted-foreground">{selectedUser?.email}</p>
              {selectedUser?.subscription && isSubscriptionActive(selectedUser) && (
                <div className="mt-2">
                  <Badge className="bg-green-500">{selectedUser.subscription.plan}</Badge>
                  <span className="text-xs text-muted-foreground ml-2">
                    Expires: {format(new Date(selectedUser.subscription.expiresAt), "MMM dd, yyyy")}
                  </span>
                </div>
              )}
            </div>

            {/* All available plans */}
            <div className="space-y-2">
              <Label>Select Subscription Plan</Label>
              <Select value={selectedPlan} onValueChange={setSelectedPlan}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose a plan" />
                </SelectTrigger>
                <SelectContent>
                  {PLANS.map((plan) => (
                    <SelectItem key={plan.name} value={plan.name}>
                      {plan.name} {plan.days === -1 ? "(Lifetime)" : `(${plan.days} days)`}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button 
                onClick={handleUpdateSubscription} 
                disabled={!selectedPlan}
                className="w-full mt-2"
              >
                Activate Plan
              </Button>
            </div>

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-background px-2 text-muted-foreground">Or custom duration</span>
              </div>
            </div>

            <div className="space-y-3">
              <div className="space-y-1">
                <Label>Custom Minutes</Label>
                <div className="flex gap-2">
                  <Input type="number" min="1" placeholder="e.g. 30" value={customMinutes}
                    onChange={(e) => setCustomMinutes(e.target.value)} className="flex-1" />
                  <Button variant="outline" disabled={!customMinutes} onClick={() => handleCustomDuration(customMinutes, "minutes")}>
                    Apply Minutes
                  </Button>
                </div>
              </div>
              <div className="space-y-1">
                <Label>Custom Hours</Label>
                <div className="flex gap-2">
                  <Input type="number" min="1" placeholder="e.g. 6" value={customHours}
                    onChange={(e) => setCustomHours(e.target.value)} className="flex-1" />
                  <Button variant="outline" disabled={!customHours} onClick={() => handleCustomDuration(customHours, "hours")}>
                    Apply Hours
                  </Button>
                </div>
              </div>
              <div className="space-y-1">
                <Label>Custom Days</Label>
                <div className="flex gap-2">
                  <Input type="number" min="1" placeholder="e.g. 10" value={customDays}
                    onChange={(e) => setCustomDays(e.target.value)} className="flex-1" />
                  <Button variant="outline" disabled={!customDays} onClick={() => handleCustomDuration(customDays, "days")}>
                    Apply Days
                  </Button>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-4 border-t">
              <Button variant="outline" onClick={() => setSubscriptionDialogOpen(false)}>
                Cancel
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
