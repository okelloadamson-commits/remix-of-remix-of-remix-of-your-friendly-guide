import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ChevronLeft, Plus, Trash2, Save, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { getPlans, savePlans, type SubscriptionPlan } from "@/lib/plans-db";

export default function AdminPlans() {
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    getPlans().then((p) => {
      setPlans(p);
      setLoading(false);
    });
  }, []);

  const update = (id: string, patch: Partial<SubscriptionPlan>) =>
    setPlans((ps) => ps.map((p) => (p.id === id ? { ...p, ...patch } : p)));

  const addPlan = () =>
    setPlans((ps) => [
      ...ps,
      { id: crypto.randomUUID(), name: "New Plan", price: 0, days: 30, dailyDownloads: 50, icon: "star" },
    ]);

  const removePlan = (id: string) => setPlans((ps) => ps.filter((p) => p.id !== id));

  const handleSave = async () => {
    const names = plans.map((p) => p.name.trim());
    if (names.some((n) => !n)) return toast({ title: "Every plan needs a name", variant: "destructive" });
    if (new Set(names).size !== names.length)
      return toast({ title: "Plan names must be unique", variant: "destructive" });
    setSaving(true);
    try {
      await savePlans(plans.map((p) => ({ ...p, name: p.name.trim() })));
      toast({ title: "Plans saved", description: "Users will now see the updated plans." });
    } catch (e) {
      toast({
        title: "Could not save plans",
        description: e instanceof Error ? e.message : "Check your Firestore rules and admin login.",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading)
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Link to="/admin/dashboard">
            <Button variant="ghost" size="icon"><ChevronLeft className="w-5 h-5" /></Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold">Subscription Plans</h1>
            <p className="text-sm text-muted-foreground">Add, edit or remove the plans users can buy.</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={addPlan}><Plus className="w-4 h-4 mr-1" /> Add plan</Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <Save className="w-4 h-4 mr-1" />}
            Save
          </Button>
        </div>
      </div>

      {plans.length === 0 && <p className="text-muted-foreground">No plans. Click "Add plan".</p>}

      <div className="grid gap-4 md:grid-cols-2">
        {plans.map((p) => (
          <Card key={p.id}>
            <CardContent className="p-4 grid grid-cols-2 gap-3">
              <div className="col-span-2">
                <Label>Plan name</Label>
                <Input value={p.name} onChange={(e) => update(p.id, { name: e.target.value })} />
              </div>
              <div>
                <Label>Price (UGX)</Label>
                <Input type="number" min={0} value={p.price}
                  onChange={(e) => update(p.id, { price: Number(e.target.value) })} />
              </div>
              <div>
                <Label>Duration (days, -1 = lifetime)</Label>
                <Input type="number" min={-1} value={p.days}
                  onChange={(e) => update(p.id, { days: Number(e.target.value) })} />
              </div>
              <div>
                <Label>Daily downloads</Label>
                <Input type="number" min={0} value={p.dailyDownloads}
                  onChange={(e) => update(p.id, { dailyDownloads: Number(e.target.value) })} />
              </div>
              <div>
                <Label>Icon</Label>
                <Select value={p.icon ?? "star"} onValueChange={(v) => update(p.id, { icon: v as SubscriptionPlan["icon"] })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="zap">Lightning</SelectItem>
                    <SelectItem value="star">Star</SelectItem>
                    <SelectItem value="crown">Crown</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center gap-2">
                <Switch checked={!!p.popular} onCheckedChange={(v) => update(p.id, { popular: v })} />
                <Label>Mark as popular</Label>
              </div>
              <div className="flex justify-end">
                <Button variant="destructive" size="sm" onClick={() => removePlan(p.id)}>
                  <Trash2 className="w-4 h-4 mr-1" /> Remove
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
      <p className="text-xs text-muted-foreground">Changes go live for users only after you press Save.</p>
    </div>
  );
}
