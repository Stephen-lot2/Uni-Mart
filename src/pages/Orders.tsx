import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuthStore } from "@/lib/store";
import { PageTransition } from "@/components/PageTransition";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { Link, useNavigate } from "react-router-dom";
import { ShoppingBag, Package, QrCode, Clock } from "lucide-react";
import { SkeletonRows } from "@/components/PageLoader";

const statusColors: Record<string, string> = {
  pending: "bg-muted text-muted-foreground",
  paid: "bg-secondary text-secondary-foreground",
  delivered: "bg-primary text-primary-foreground",
  completed: "bg-primary text-primary-foreground",
  disputed: "bg-destructive text-destructive-foreground",
  cancelled: "bg-muted text-muted-foreground",
};

const Orders = () => {
  const { user } = useAuthStore();
  const navigate = useNavigate();

  if (!user) { navigate("/login"); return null; }

  const { data: buyerOrders, isLoading: loadingBuyer } = useQuery({
    queryKey: ["buyer-orders", user.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("orders")
        .select("*")
        .eq("buyer_id", user.id)
        .order("created_at", { ascending: false });
      if (!data) return [];
      const listingIds = data.filter(o => o.listing_id).map(o => o.listing_id!);
      if (listingIds.length === 0) return data.map(o => ({ ...o, listing: null }));
      const { data: listings } = await supabase.from("listings").select("id, title, images").in("id", listingIds);
      const listingMap = Object.fromEntries((listings || []).map(l => [l.id, l]));
      return data.map(o => ({ ...o, listing: o.listing_id ? listingMap[o.listing_id] : null }));
    },
  });

  const { data: sellerOrders, isLoading: loadingSeller } = useQuery({
    queryKey: ["seller-orders", user.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("orders")
        .select("*")
        .eq("seller_id", user.id)
        .order("created_at", { ascending: false });
      if (!data) return [];
      const listingIds = data.filter(o => o.listing_id).map(o => o.listing_id!);
      if (listingIds.length === 0) return data.map(o => ({ ...o, listing: null }));
      const { data: listings } = await supabase.from("listings").select("id, title, images").in("id", listingIds);
      const listingMap = Object.fromEntries((listings || []).map(l => [l.id, l]));
      return data.map(o => ({ ...o, listing: o.listing_id ? listingMap[o.listing_id] : null }));
    },
  });

  const OrderCard = ({ order, role }: { order: any; role: "buyer" | "seller" }) => (
    <Card className="overflow-hidden transition-shadow hover:shadow-md">
      <CardContent className="flex items-center gap-4 p-4">
        <div className="h-16 w-16 flex-shrink-0 overflow-hidden rounded-lg bg-muted">
          {order.listing?.images?.[0] ? (
            <img src={order.listing.images[0]} alt="" className="h-full w-full object-cover" />
          ) : (
            <div className="flex h-full items-center justify-center text-2xl">📦</div>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <p className="truncate font-display font-semibold">{order.listing?.title || "Item"}</p>
          <p className="text-lg font-bold text-primary">₦{Number(order.amount).toLocaleString()}</p>
          <p className="text-xs text-muted-foreground">
            <Clock className="mr-1 inline h-3 w-3" />
            {new Date(order.created_at).toLocaleDateString()}
          </p>
        </div>
        <div className="flex flex-col items-end gap-2">
          <Badge className={statusColors[order.status] || ""}>
            {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
          </Badge>
          {role === "buyer" && order.status === "paid" && (
            <Link to={`/order/${order.id}/qr`}>
              <Button size="sm" variant="outline" className="gap-1">
                <QrCode className="h-3.5 w-3.5" /> Show QR
              </Button>
            </Link>
          )}
          {role === "seller" && order.status === "paid" && (
            <Link to={`/order/${order.id}/scan`}>
              <Button size="sm" className="gap-1">
                <QrCode className="h-3.5 w-3.5" /> Scan QR
              </Button>
            </Link>
          )}
        </div>
      </CardContent>
    </Card>
  );

  const SkeletonCards = () => <SkeletonRows count={3} />;

  return (
    <PageTransition>
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center gap-2">
          <ShoppingBag className="h-6 w-6 text-primary" />
          <h1 className="font-display text-3xl font-bold">My Orders</h1>
        </div>
        <p className="mt-1 text-muted-foreground">Track your purchases and sales</p>

        <Tabs defaultValue="purchases" className="mt-6">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="purchases" className="gap-1">
              <ShoppingBag className="h-4 w-4" /> Purchases
            </TabsTrigger>
            <TabsTrigger value="sales" className="gap-1">
              <Package className="h-4 w-4" /> Sales
            </TabsTrigger>
          </TabsList>

          <TabsContent value="purchases" className="mt-4 space-y-3">
            {loadingBuyer ? <SkeletonCards /> : buyerOrders && buyerOrders.length > 0 ? (
              buyerOrders.map((order: any) => <OrderCard key={order.id} order={order} role="buyer" />)
            ) : (
              <div className="py-16 text-center">
                <p className="text-4xl">🛍️</p>
                <p className="mt-2 text-lg font-medium">No purchases yet</p>
                <Link to="/marketplace"><Button className="mt-4">Start Shopping</Button></Link>
              </div>
            )}
          </TabsContent>

          <TabsContent value="sales" className="mt-4 space-y-3">
            {loadingSeller ? <SkeletonCards /> : sellerOrders && sellerOrders.length > 0 ? (
              sellerOrders.map((order: any) => <OrderCard key={order.id} order={order} role="seller" />)
            ) : (
              <div className="py-16 text-center">
                <p className="text-4xl">📦</p>
                <p className="mt-2 text-lg font-medium">No sales yet</p>
                <Link to="/create-listing"><Button className="mt-4">Create a Listing</Button></Link>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </PageTransition>
  );
};

export default Orders;
