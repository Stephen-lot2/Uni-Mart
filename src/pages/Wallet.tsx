import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuthStore } from "@/lib/store";
import { PageTransition } from "@/components/PageTransition";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { Wallet as WalletIcon, ArrowDownCircle, ArrowUpCircle, Clock, Loader2, Plus, ArrowLeft } from "lucide-react";

const statusColors: Record<string, string> = {
  pending: "bg-secondary text-secondary-foreground",
  approved: "bg-primary text-primary-foreground",
  rejected: "bg-destructive text-destructive-foreground",
  processed: "bg-primary text-primary-foreground",
};

const Wallet = () => {
  const { user, profile } = useAuthStore();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [withdrawOpen, setWithdrawOpen] = useState(false);
  const [depositOpen, setDepositOpen] = useState(false);
  const [depositAmount, setDepositAmount] = useState("");
  const [depositLoading, setDepositLoading] = useState(false);
  const [withdrawForm, setWithdrawForm] = useState({
    amount: "", bank_name: "", account_number: "", account_name: "",
  });

  useEffect(() => { if (!user) navigate("/login"); }, [user, navigate]);

  const { data: wallet, isLoading: walletLoading } = useQuery({
    queryKey: ["wallet", user?.id],
    queryFn: async () => {
      const { data } = await supabase.from("seller_wallets").select("*").eq("user_id", user!.id).single();
      return data;
    },
    enabled: !!user,
  });

  const { data: withdrawals, isLoading: withdrawalsLoading } = useQuery({
    queryKey: ["withdrawals", user?.id],
    queryFn: async () => {
      const { data } = await supabase.from("withdrawal_requests").select("*").eq("user_id", user!.id).order("created_at", { ascending: false });
      return data || [];
    },
    enabled: !!user,
  });

  const handleDeposit = async () => {
    const amount = parseFloat(depositAmount);
    if (!amount || amount < 100) { toast.error("Minimum deposit is ₦100"); return; }
    if (!user || !profile?.full_name) { toast.error("User not loaded"); return; }

    setDepositLoading(true);
    try {
      const email = user.email;
      const { data, error } = await supabase.functions.invoke("paystack-initialize", {
        body: {
          email,
          amount: amount * 100, // kobo
          metadata: { type: "wallet_deposit", user_id: user.id },
          callback_url: `${window.location.origin}/payment/callback?type=deposit`,
        },
      });
      if (error || !data?.data?.authorization_url) throw new Error(error?.message || "Failed to initialize payment");
      window.location.href = data.data.authorization_url;
    } catch (err: any) {
      toast.error(err.message);
      setDepositLoading(false);
    }
  };

  const requestWithdrawal = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error("Not logged in");
      const amount = parseFloat(withdrawForm.amount);
      if (!amount || amount <= 0) throw new Error("Enter a valid amount");
      if (amount > Number(wallet?.balance || 0)) throw new Error("Insufficient balance");
      if (!withdrawForm.bank_name || !withdrawForm.account_number || !withdrawForm.account_name)
        throw new Error("Fill in all bank details");

      // Insert request only — balance is deducted when admin approves
      const { error } = await supabase.from("withdrawal_requests").insert({
        user_id: user.id,
        amount,
        bank_name: withdrawForm.bank_name,
        account_number: withdrawForm.account_number,
        account_name: withdrawForm.account_name,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Withdrawal request submitted!");
      setWithdrawForm({ amount: "", bank_name: "", account_number: "", account_name: "" });
      setWithdrawOpen(false);
      queryClient.invalidateQueries({ queryKey: ["wallet"] });
      queryClient.invalidateQueries({ queryKey: ["withdrawals"] });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  if (!user) return null;

  return (
    <PageTransition>
      <div className="container mx-auto max-w-2xl px-4 py-8">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="flex h-9 w-9 items-center justify-center rounded-full border bg-card shadow-sm hover:bg-muted transition-colors">
            <ArrowLeft className="h-4 w-4" />
          </button>
          <div>
            <h1 className="font-display text-2xl font-bold">My Wallet</h1>
            <p className="text-sm text-muted-foreground">Deposit, spend, and withdraw your funds</p>
          </div>
        </div>

        {/* Balance Card */}
        <div className="mt-6 overflow-hidden rounded-2xl bg-gradient-to-br from-primary to-primary/80 p-6 text-primary-foreground shadow-lg">
          <p className="text-sm font-medium text-primary-foreground/80">Available Balance</p>
          {walletLoading ? (
            <Skeleton className="mt-1 h-10 w-40 bg-primary-foreground/20" />
          ) : (
            <p className="mt-1 font-display text-4xl font-bold">
              ₦{Number(wallet?.balance || 0).toLocaleString()}
            </p>
          )}
          <div className="mt-5 flex gap-3">
            {/* Deposit */}
            <Dialog open={depositOpen} onOpenChange={setDepositOpen}>
              <DialogTrigger asChild>
                <Button size="sm" variant="secondary" className="gap-1.5 rounded-full">
                  <Plus className="h-4 w-4" /> Deposit
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle className="font-display">Deposit Funds</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <p className="text-sm text-muted-foreground">
                    Add money to your wallet via Paystack. Funds will be available instantly after payment.
                  </p>
                  <div>
                    <Label>Amount (₦)</Label>
                    <Input
                      type="number" placeholder="e.g. 5000" min="100"
                      value={depositAmount}
                      onChange={(e) => setDepositAmount(e.target.value)}
                    />
                    <p className="mt-1 text-xs text-muted-foreground">Minimum: ₦100</p>
                  </div>
                  <div className="grid grid-cols-4 gap-2">
                    {[500, 1000, 2000, 5000].map((amt) => (
                      <button key={amt} type="button"
                        onClick={() => setDepositAmount(String(amt))}
                        className={`rounded-lg border py-2 text-sm font-medium transition-colors hover:bg-primary/10 ${depositAmount === String(amt) ? "border-primary bg-primary/10 text-primary" : ""}`}>
                        ₦{amt.toLocaleString()}
                      </button>
                    ))}
                  </div>
                  <Button className="w-full gap-2" onClick={handleDeposit} disabled={depositLoading || !depositAmount}>
                    {depositLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowUpCircle className="h-4 w-4" />}
                    {depositLoading ? "Redirecting..." : "Pay with Paystack"}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>

            {/* Withdraw */}
            <Dialog open={withdrawOpen} onOpenChange={setWithdrawOpen}>
              <DialogTrigger asChild>
                <Button size="sm" variant="secondary" className="gap-1.5 rounded-full"
                  disabled={!wallet || Number(wallet.balance) <= 0}>
                  <ArrowDownCircle className="h-4 w-4" /> Withdraw
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle className="font-display">Withdraw to Bank</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label>Amount (₦)</Label>
                    <Input type="number" placeholder="0" min="100" max={Number(wallet?.balance || 0)}
                      value={withdrawForm.amount}
                      onChange={(e) => setWithdrawForm({ ...withdrawForm, amount: e.target.value })} />
                    <p className="mt-1 text-xs text-muted-foreground">Available: ₦{Number(wallet?.balance || 0).toLocaleString()}</p>
                  </div>
                  <div>
                    <Label>Bank Name</Label>
                    <Input placeholder="e.g., GTBank, First Bank"
                      value={withdrawForm.bank_name}
                      onChange={(e) => setWithdrawForm({ ...withdrawForm, bank_name: e.target.value })} />
                  </div>
                  <div>
                    <Label>Account Number</Label>
                    <Input placeholder="0123456789" maxLength={10}
                      value={withdrawForm.account_number}
                      onChange={(e) => setWithdrawForm({ ...withdrawForm, account_number: e.target.value })} />
                  </div>
                  <div>
                    <Label>Account Name</Label>
                    <Input placeholder="John Doe"
                      value={withdrawForm.account_name}
                      onChange={(e) => setWithdrawForm({ ...withdrawForm, account_name: e.target.value })} />
                  </div>
                  <Button className="w-full" onClick={() => requestWithdrawal.mutate()} disabled={requestWithdrawal.isPending}>
                    {requestWithdrawal.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Submit Withdrawal Request
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* History Tabs */}
        <Tabs defaultValue="withdrawals" className="mt-8">
          <TabsList className="w-full">
            <TabsTrigger value="withdrawals" className="flex-1">Withdrawals</TabsTrigger>
            <TabsTrigger value="deposits" className="flex-1">Deposits</TabsTrigger>
          </TabsList>

          <TabsContent value="withdrawals" className="mt-4">
            {withdrawalsLoading ? (
              <div className="space-y-3">{[1, 2].map(i => <Card key={i}><CardContent className="p-4"><Skeleton className="h-12 w-full" /></CardContent></Card>)}</div>
            ) : withdrawals && withdrawals.length > 0 ? (
              <div className="space-y-3">
                {withdrawals.map((w: any) => (
                  <Card key={w.id}>
                    <CardContent className="flex items-center justify-between p-4">
                      <div>
                        <p className="font-semibold">₦{Number(w.amount).toLocaleString()}</p>
                        <p className="text-xs text-muted-foreground">{w.bank_name} • {w.account_number}</p>
                        <p className="mt-0.5 flex items-center gap-1 text-xs text-muted-foreground">
                          <Clock className="h-3 w-3" />{new Date(w.created_at).toLocaleDateString()}
                        </p>
                      </div>
                      <Badge className={statusColors[w.status] || ""}>
                        {w.status.charAt(0).toUpperCase() + w.status.slice(1)}
                      </Badge>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <p className="py-8 text-center text-muted-foreground">No withdrawals yet.</p>
            )}
          </TabsContent>

          <TabsContent value="deposits" className="mt-4">
            <p className="py-8 text-center text-muted-foreground">Deposit history coming soon.</p>
          </TabsContent>
        </Tabs>
      </div>
    </PageTransition>
  );
};

export default Wallet;
