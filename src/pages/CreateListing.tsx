import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useAuthStore } from "@/lib/store";
import { CATEGORIES, CONDITIONS } from "@/lib/constants";
import { compressToBase64 } from "@/lib/imageUpload";
import { PageTransition } from "@/components/PageTransition";
import { toast } from "sonner";
import { ImagePlus, X, Loader2, ArrowLeft } from "lucide-react";

const CreateListing = () => {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const [loading, setLoading] = useState(false);
  const [images, setImages] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const [form, setForm] = useState({
    title: "", description: "", price: "",
    category: "", condition: "", location: "",
  });

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files?.length) return;
    setUploading(true);

    const files = Array.from(e.target.files).slice(0, 4); // max 4 images
    const results: string[] = [];

    for (const file of files) {
      if (file.size > 10 * 1024 * 1024) {
        toast.error(`${file.name} is too large (max 10MB)`);
        continue;
      }
      try {
        const dataUrl = await compressToBase64(file, 600, 0.7);
        results.push(dataUrl);
      } catch {
        toast.error(`Could not process ${file.name}`);
      }
    }

    setImages((prev) => [...prev, ...results].slice(0, 4));
    setUploading(false);
    e.target.value = "";
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) { navigate("/login"); return; }
    if (images.length === 0) { toast.error("Please add at least one photo"); return; }
    if (!form.category) { toast.error("Please select a category"); return; }
    if (!form.condition) { toast.error("Please select a condition"); return; }

    setLoading(true);

    // Use user from store directly — avoids the AbortError from getSession()
    const { error } = await supabase.from("listings").insert({
      seller_id: user.id,
      title: form.title.trim(),
      description: form.description.trim(),
      price: parseFloat(form.price),
      category: form.category as any,
      condition: form.condition as any,
      images,
      location: form.location.trim() || null,
    });

    setLoading(false);

    if (error) {
      console.error("Listing insert error:", error);
      toast.error(`Failed: ${error.message}`);
    } else {
      toast.success("Listing created!");
      navigate("/marketplace");
    }
  };

  if (!user) { navigate("/login"); return null; }

  return (
    <PageTransition>
    <div className="container mx-auto max-w-lg px-4 py-8">
      <div className="flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="flex h-9 w-9 items-center justify-center rounded-full border bg-card shadow-sm hover:bg-muted transition-colors">
          <ArrowLeft className="h-4 w-4" />
        </button>
        <div>
          <h1 className="font-display text-2xl font-bold">Create Listing</h1>
          <p className="text-sm text-muted-foreground">Post an item or service for sale</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="mt-8 space-y-5">
        {/* Images */}
        <div>
          <Label>Photos <span className="text-muted-foreground text-xs">(max 4)</span></Label>
          <div className="mt-2 flex flex-wrap gap-3">
            {images.map((img, i) => (
              <div key={i} className="relative h-20 w-20 shrink-0 overflow-hidden rounded-xl border bg-muted">
                <img src={img} alt="" className="h-full w-full object-cover" />
                <button
                  type="button"
                  onClick={() => setImages((p) => p.filter((_, j) => j !== i))}
                  className="absolute right-1 top-1 flex h-5 w-5 items-center justify-center rounded-full bg-destructive text-destructive-foreground shadow"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            ))}
            {images.length < 4 && (
              <label className={`flex h-20 w-20 cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed transition-colors ${uploading ? "cursor-not-allowed opacity-50" : "border-muted-foreground/30 hover:border-primary"}`}>
                {uploading
                  ? <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                  : <ImagePlus className="h-5 w-5 text-muted-foreground" />}
                <span className="mt-1 text-[10px] text-muted-foreground">
                  {uploading ? "Processing..." : "Add photo"}
                </span>
                <input
                  type="file" accept="image/*" multiple className="hidden"
                  onChange={handleImageUpload} disabled={uploading}
                />
              </label>
            )}
          </div>
          {images.length > 0 && (
            <p className="mt-1 text-xs text-muted-foreground">{images.length} / 4 photos added</p>
          )}
        </div>

        <div>
          <Label htmlFor="title">Title</Label>
          <Input id="title" placeholder="e.g., iPhone 13 Pro Max"
            value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })}
            required maxLength={100} />
        </div>

        <div>
          <Label htmlFor="desc">Description</Label>
          <Textarea id="desc" placeholder="Describe your item..."
            value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })}
            required maxLength={1000} rows={4} />
        </div>

        <div>
          <Label htmlFor="price">Price (₦)</Label>
          <Input id="price" type="number" placeholder="0" min="0" step="0.01"
            value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} required />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label>Category</Label>
            <Select value={form.category} onValueChange={(v) => setForm({ ...form, category: v })}>
              <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
              <SelectContent>
                {CATEGORIES.map((c) => (
                  <SelectItem key={c.value} value={c.value}>{c.icon} {c.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Condition</Label>
            <Select value={form.condition} onValueChange={(v) => setForm({ ...form, condition: v })}>
              <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
              <SelectContent>
                {CONDITIONS.map((c) => (
                  <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div>
          <Label htmlFor="loc">Location on Campus (optional)</Label>
          <Input id="loc" placeholder="e.g., Alabata Gate, COLNAS"
            value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })}
            maxLength={100} />
        </div>

        <Button type="submit" className="w-full" disabled={loading || uploading}>
          {loading
            ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Creating...</>
            : "Create Listing"}
        </Button>
      </form>
    </div>
    </PageTransition>
  );
};

export default CreateListing;
