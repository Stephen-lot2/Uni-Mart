import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuthStore } from "@/lib/store";
import { PageTransition } from "@/components/PageTransition";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { Users, ShoppingBag, MessageCircle, TrendingUp, Trash2, Ban, DollarSign, Package, Wallet } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import { useNavigate } from "react-router-dom";

const CHART_COLORS = ["hsl(120, 56%, 20%)", "hsl(45, 100%, 48%)", "hsl(120, 30%, 50%)", "hsl(45, 80%, 60%)"];

const Admin = () => {
  const { user } = useAuthStore();
  const navigate = useNavigate();

  // Role check — redirect non-admins
  const { data: isAdmin, isLoading: roleLoading } = useQuery({
    queryKey: ["is-admin", user?.id],
    queryFn: async () => {
      if (!user) return false;
      const { data } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id)
        .eq("role", "admin")
        .maybeSingle();
      return !!data;
    },
    enabled: !!user,
  });

  useEffect(() => {
    if (!user) { navigate("/login"); return; }
    if (!roleLoading && isAdmin === false) { navigate("/"); }
  }, [user, isAdmin, roleLoading, navigate]);

  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ["admin-stats"],
    queryFn: async () => {
      const [usersRes, listingsRes, activeListingsRes, messagesRes, ordersRes, walletRes] = await Promise.all([
        supabase.from("profiles").select("*", { count: "exact", head: true }),
        supabase.from("listings").select("*", { count: "exact", head: true }),
        supabase.from("listings").select("*", { count: "exact", head: true }).eq("is_active", true),
        supabase.from("messages").select("*", { count: "exact", head: true }),
        supabase.from("orders").select("*", { count: "exact", head: true }),
        supabase.from("seller_wallets").select("balance"),
      ]);
      const totalWalletBalance = (walletRes.data || []).reduce((s: number, w: any) => s + Number(w.balance), 0);
      return {
        users: usersRes.count || 0,
        listings: listingsRes.count || 0,
        activeListings: activeListingsRes.count || 0,
        messages: messagesRes.count || 0,
        orders: ordersRes.count || 0,
        totalWalletBalance,
      };
    },
  });

  const { data: recentUsers } = useQuery({
    queryKey: ["admin-users"],
    queryFn: async () => {
      const { data } = await supabase.from("profiles").select("*").order("created_at", { ascending: false }).limit(20);
      return data || [];
    },
  });

  const { data: recentListings, refetch: refetchListings } = useQuery({
    queryKey: ["admin-listings"],
    queryFn: async () => {
      const { data } = await supabase.from("listings").select("*").order("created_at", { ascending: false }).limit(20);
      return data || [];
    },
  });

  const { data: recentOrders } = useQuery({
    queryKey: ["admin-orders"],
    queryFn: async () => {
      const { data } = await supabase.from("orders").select("*").order("created_at", { ascending: false }).limit(20);
      if (!data) return [];
      const buyerIds = [...new Set(data.map(o => o.buyer_id))];
      const sellerIds = [...new Set(data.map(o => o.seller_id))];
      const allIds = [...new Set([...buyerIds, ...sellerIds])];
      const { data: profiles } = await supabase.from("profiles").select("user_id, full_name").in("user_id", allIds);
      const profileMap = Object.fromEntries((profiles || []).map(p => [p.user_id, p]));
      return data.map(o => ({ ...o, buyer_name: profileMap[o.buyer_id]?.full_name, seller_name: profileMap[o.seller_id]?.full_name }));
    },
  });

  const { data: withdrawalRequests, refetch: refetchWithdrawals } = useQuery({
    queryKey: ["admin-withdrawals"],
    queryFn: async () => {
      const { data } = await supabase.from("withdrawal_requests").select("*").order("created_at", { ascending: false }).limit(20);
      if (!data) return [];
      const userIds = [...new Set(data.map(w => w.user_id))];
      const { data: profiles } = await supabase.from("profiles").select("user_id, full_name").in("user_id", userIds);
      const profileMap = Object.fromEntries((profiles || []).map(p => [p.user_id, p]));
      return data.map(w => ({ ...w, user_name: profileMap[w.user_id]?.full_name }));
    },
  });

  const handleDeleteListing = async (id: string) => {
    const { error } = await supabase.from("listings").delete().eq("id", id);
    if (error) toast.error("Failed to delete");
    else { toast.success("Listing deleted"); refetchListings(); }
  };

  const handleBanUser = async (userId: string, isBanned: boolean) => {
    const { error } = await supabase.from("profiles").update({ is_banned: !isBanned }).eq("user_id", userId);
    if (error) toast.error("Failed");
    else toast.success(isBanned ? "User unbanned" : "User banned");
  };

  const handleWithdrawalAction = async (id: string, action: "approved" | "rejected") => {
    const { error } = await supabase.from("withdrawal_requests").update({ status: action as any }).eq("id", id);
    if (error) { toast.error("Failed"); return; }

    // Deduct balance from wallet when approved
    if (action === "approved") {
      const request = withdrawalRequests?.find((w: any) => w.id === id);
      if (request) {
        const { data: walletData } = await supabase
          .from("seller_wallets")
          .select("balance")
          .eq("user_id", request.user_id)
          .single();
        if (walletData) {
          await supabase
            .from("seller_wallets")
            .update({ balance: Math.max(0, Number(walletData.balance) - Number(request.amount)) })
            .eq("user_id", request.user_id);
        }
      }
    }

    toast.success(`Withdrawal ${action}`);
    refetchWithdrawals();
  };

  if (!user || roleLoading || !isAdmin) return null;

  const barChartData = [
    { name: "Users", value: stats?.users || 0 },
    { name: "Listings", value: stats?.listings || 0 },
    { name: "Active", value: stats?.activeListings || 0 },
    { name: "Orders", value: stats?.orders || 0 },
  ];

  const statusColors: Record<string, string> = {
    pending: "bg-secondary text-secondary-foreground",
    paid: "bg-primary text-primary-foreground",
    delivered: "bg-primary text-primary-foreground",
    approved: "bg-primary text-primary-foreground",
    rejected: "bg-destructive text-destructive-foreground",
  };

  return (
    <PageTransition>
      <div className="container mx-auto px-4 py-8">
        <h1 className="font-display text-3xl font-bold">Admin Dashboard</h1>
        <p className="mt-1 text-muted-foreground">Platform overview and management</p>

        {/* Stats */}
        <div className="mt-6 grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-6">
          {statsLoading ? (
            Array.from({ length: 6 }).map((_, i) => (
              <Card key={i}><CardContent className="p-4"><Skeleton className="h-16 w-full" /></CardContent></Card>
            ))
          ) : (
            [
              { label: "Users", value: stats?.users || 0, icon: Users },
              { label: "Listings", value: stats?.listings || 0, icon: ShoppingBag },
              { label: "Active", value: stats?.activeListings || 0, icon: TrendingUp },
              { label: "Messages", value: stats?.messages || 0, icon: MessageCircle },
              { label: "Orders", value: stats?.orders || 0, icon: Package },
              { label: "Wallet Total", value: `₦${(stats?.totalWalletBalance || 0).toLocaleString()}`, icon: Wallet },
            ].map((stat) => (
              <Card key={stat.label}>
                <CardContent className="flex items-center gap-3 p-4">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                    <stat.icon className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-xl font-bold">{stat.value}</p>
                    <p className="text-xs text-muted-foreground">{stat.label}</p>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>

        {/* Chart */}
        <Card className="mt-6">
          <CardHeader><CardTitle className="font-display">Platform Analytics</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={barChartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="value" fill="hsl(120, 56%, 20%)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Tabs defaultValue="users" className="mt-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="users">Users</TabsTrigger>
            <TabsTrigger value="listings">Listings</TabsTrigger>
            <TabsTrigger value="orders">Orders</TabsTrigger>
            <TabsTrigger value="withdrawals">Withdrawals</TabsTrigger>
          </TabsList>

          <TabsContent value="users">
            <Card>
              <CardHeader><CardTitle className="font-display text-lg">Recent Users</CardTitle></CardHeader>
              <CardContent className="max-h-96 overflow-y-auto space-y-2">
                {recentUsers?.map((u: any) => (
                  <div key={u.id} className="flex items-center justify-between rounded-lg border p-3">
                    <div className="flex items-center gap-2">
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={u.avatar_url} />
                        <AvatarFallback className="bg-primary text-primary-foreground text-xs">{u.full_name?.[0]}</AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="text-sm font-medium">{u.full_name}</p>
                        <p className="text-xs text-muted-foreground">@{u.username}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {u.is_banned && <Badge variant="destructive">Banned</Badge>}
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleBanUser(u.user_id, u.is_banned)}>
                        <Ban className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="listings">
            <Card>
              <CardHeader><CardTitle className="font-display text-lg">Recent Listings</CardTitle></CardHeader>
              <CardContent className="max-h-96 overflow-y-auto space-y-2">
                {recentListings?.map((l: any) => (
                  <div key={l.id} className="flex items-center justify-between rounded-lg border p-3">
                    <div className="flex-1 overflow-hidden">
                      <p className="truncate text-sm font-medium">{l.title}</p>
                      <p className="text-xs text-muted-foreground">₦{l.price.toLocaleString()} • {l.category}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      {!l.is_active && <Badge variant="outline">Inactive</Badge>}
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => handleDeleteListing(l.id)}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="orders">
            <Card>
              <CardHeader><CardTitle className="font-display text-lg">Recent Orders</CardTitle></CardHeader>
              <CardContent className="max-h-96 overflow-y-auto space-y-2">
                {recentOrders?.map((o: any) => (
                  <div key={o.id} className="flex items-center justify-between rounded-lg border p-3">
                    <div>
                      <p className="text-sm font-medium">₦{Number(o.amount).toLocaleString()}</p>
                      <p className="text-xs text-muted-foreground">{o.buyer_name} → {o.seller_name}</p>
                      <p className="text-xs text-muted-foreground">{new Date(o.created_at).toLocaleDateString()}</p>
                    </div>
                    <Badge className={statusColors[o.status] || ""}>{o.status}</Badge>
                  </div>
                ))}
                {(!recentOrders || recentOrders.length === 0) && (
                  <p className="py-4 text-center text-sm text-muted-foreground">No orders yet</p>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="withdrawals">
            <Card>
              <CardHeader><CardTitle className="font-display text-lg">Withdrawal Requests</CardTitle></CardHeader>
              <CardContent className="max-h-96 overflow-y-auto space-y-2">
                {withdrawalRequests?.map((w: any) => (
                  <div key={w.id} className="flex items-center justify-between rounded-lg border p-3">
                    <div>
                      <p className="text-sm font-medium">₦{Number(w.amount).toLocaleString()} — {w.user_name}</p>
                      <p className="text-xs text-muted-foreground">{w.bank_name} • {w.account_number} • {w.account_name}</p>
                      <p className="text-xs text-muted-foreground">{new Date(w.created_at).toLocaleDateString()}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge className={statusColors[w.status] || ""}>{w.status}</Badge>
                      {w.status === "pending" && (
                        <>
                          <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => handleWithdrawalAction(w.id, "approved")}>Approve</Button>
                          <Button size="sm" variant="ghost" className="h-7 text-xs text-destructive" onClick={() => handleWithdrawalAction(w.id, "rejected")}>Reject</Button>
                        </>
                      )}
                    </div>
                  </div>
                ))}
                {(!withdrawalRequests || withdrawalRequests.length === 0) && (
                  <p className="py-4 text-center text-sm text-muted-foreground">No withdrawal requests</p>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </PageTransition>
  );
};

export default Admin;
