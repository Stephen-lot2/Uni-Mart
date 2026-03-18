import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuthStore } from "@/lib/store";
import { PageTransition } from "@/components/PageTransition";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { Wallet as WalletIcon, ArrowDownCircle, Clock, CheckCircle, XCircle, Loader2 } from "lucide-react";

const withdrawalStatusColors: Record<string, string> = {
  pending: "bg-secondary text-secondary-foreground",
  approved: "bg-primary text-primary-foreground",
  rejected: "bg-destructive text-destructive-foreground",
  processed: "bg-primary text-primary-foreground",
};

const Wallet = () => {
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [withdrawOpen, setWithdrawOpen] = useState(false);
  const [withdrawForm, setWithdrawForm] = useState({
    amount: "",
    bank_name: "",
    account_number: "",
    account_name: "",
  });

  useEffect(() => {
    if (!user) {
      navigate("/login");
    }
  }, [user, navigate]);

  const { data: wallet, isLoading: walletLoading } = useQuery({
    queryKey: ["wallet", user?.id],
    queryFn: async () => {
      if (!user) return null;
      const { data } = await supabase
        .from("seller_wallets")
        .select("*")
        .eq("user_id", user.id)
        .single();
      return data;
    },
    enabled: !!user,
  });

  const { data: withdrawals, isLoading: withdrawalsLoading } = useQuery({
    queryKey: ["withdrawals", user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data } = await supabase
        .from("withdrawal_requests")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });
      return data || [];
    },
    enabled: !!user,
  });

  const requestWithdrawal = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error("Not logged in");
      const amount = parseFloat(withdrawForm.amount);
      if (!amount || amount <= 0) throw new Error("Enter a valid amount");
      if (amount > Number(wallet?.balance || 0)) throw new Error("Insufficient balance");
      if (!withdrawForm.bank_name || !withdrawForm.account_number || !withdrawForm.account_name) {
        throw new Error("Fill in all bank details");
      }

      const { error } = await supabase.from("withdrawal_requests").insert({
        user_id: user.id,
        amount,
        bank_name: withdrawForm.bank_name,
        account_number: withdrawForm.account_number,
        account_name: withdrawForm.account_name,
      });
      if (error) throw error;

      // Deduct from wallet
      await supabase
        .from("seller_wallets")
        .update({ balance: Number(wallet!.balance) - amount })
        .eq("user_id", user.id);
    },
    onSuccess: () => {
      toast.success("Withdrawal request submitted!");
      setWithdrawForm({ amount: "", bank_name: "", account_number: "", account_name: "" });
      setWithdrawOpen(false);
      queryClient.invalidateQueries({ queryKey: ["wallet"] });
      queryClient.invalidateQueries({ queryKey: ["withdrawals"] });
    },
    onError: (error: Error) => toast.error(error.message),
  });

  if (!user) return null;

  return (
    <PageTransition>
      <div className="container mx-auto max-w-2xl px-4 py-8">
        <div className="flex items-center gap-2">
          <WalletIcon className="h-6 w-6 text-primary" />
          <h1 className="font-display text-3xl font-bold">My Wallet</h1>
        </div>
        <p className="mt-1 text-muted-foreground">Manage your earnings</p>

        {/* Balance Card */}
        <Card className="mt-6 overflow-hidden">
          <div className="bg-gradient-to-r from-primary to-primary/80 p-6 text-primary-foreground">
            <p className="text-sm font-medium text-primary-foreground/80">Available Balance</p>
            {walletLoading ? (
              <Skeleton className="mt-1 h-10 w-40 bg-primary-foreground/20" />
            ) : (
              <p className="mt-1 font-display text-4xl font-bold">
                ₦{Number(wallet?.balance || 0).toLocaleString()}
              </p>
            )}
          </div>
          <CardContent className="p-4">
            <Dialog open={withdrawOpen} onOpenChange={setWithdrawOpen}>
              <DialogTrigger asChild>
                <Button className="w-full gap-2" disabled={!wallet || Number(wallet.balance) <= 0}>
                  <ArrowDownCircle className="h-4 w-4" /> Withdraw Funds
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle className="font-display">Withdraw to Bank Account</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label>Amount (₦)</Label>
                    <Input
                      type="number"
                      placeholder="0"
                      min="100"
                      max={Number(wallet?.balance || 0)}
                      value={withdrawForm.amount}
                      onChange={(e) => setWithdrawForm({ ...withdrawForm, amount: e.target.value })}
                    />
                    <p className="mt-1 text-xs text-muted-foreground">
                      Available: ₦{Number(wallet?.balance || 0).toLocaleString()}
                    </p>
                  </div>
                  <div>
                    <Label>Bank Name</Label>
                    <Input
                      placeholder="e.g., GTBank, First Bank"
                      value={withdrawForm.bank_name}
                      onChange={(e) => setWithdrawForm({ ...withdrawForm, bank_name: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label>Account Number</Label>
                    <Input
                      placeholder="0123456789"
                      maxLength={10}
                      value={withdrawForm.account_number}
                      onChange={(e) => setWithdrawForm({ ...withdrawForm, account_number: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label>Account Name</Label>
                    <Input
                      placeholder="John Doe"
                      value={withdrawForm.account_name}
                      onChange={(e) => setWithdrawForm({ ...withdrawForm, account_name: e.target.value })}
                    />
                  </div>
                  <Button
                    className="w-full"
                    onClick={() => requestWithdrawal.mutate()}
                    disabled={requestWithdrawal.isPending}
                  >
                    {requestWithdrawal.isPending ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : null}
                    Submit Withdrawal Request
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </CardContent>
        </Card>

        {/* Withdrawal History */}
        <div className="mt-8">
          <h2 className="font-display text-xl font-bold">Withdrawal History</h2>
          {withdrawalsLoading ? (
            <div className="mt-4 space-y-3">
              {[1, 2].map(i => (
                <Card key={i}><CardContent className="p-4"><Skeleton className="h-12 w-full" /></CardContent></Card>
              ))}
            </div>
          ) : withdrawals && withdrawals.length > 0 ? (
            <div className="mt-4 space-y-3">
              {withdrawals.map((w: Record<string, any>) => (
                <Card key={w.id}>
                  <CardContent className="flex items-center justify-between p-4">
                    <div>
                      <p className="font-semibold">₦{Number(w.amount).toLocaleString()}</p>
                      <p className="text-xs text-muted-foreground">
                        {w.bank_name} • {w.account_number}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        <Clock className="mr-1 inline h-3 w-3" />
                        {new Date(w.created_at).toLocaleDateString()}
                      </p>
                    </div>
                    <Badge className={withdrawalStatusColors[w.status] || ""}>
                      {w.status.charAt(0).toUpperCase() + w.status.slice(1)}
                    </Badge>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <p className="mt-4 text-muted-foreground">No withdrawals yet.</p>
          )}
        </div>
      </div>
    </PageTransition>
  );
};

export default Wallet;
