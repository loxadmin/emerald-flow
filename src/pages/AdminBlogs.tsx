import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import AdminLayout from "@/components/AdminLayout";
import { GlassCard, GlassCardContent, GlassCardHeader, GlassCardTitle } from "@/components/ui/glass-card";
import { GlassButton } from "@/components/ui/glass-button";
import { GlassInput } from "@/components/ui/glass-input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import MotionWrapper from "@/components/MotionWrapper";
import { toast } from "sonner";
import { Save, Plus, Trash2, Edit2, X } from "lucide-react";

interface Blog {
  id: string;
  title: string;
  slug: string;
  content: string | null;
  excerpt: string | null;
  meta_title: string | null;
  meta_description: string | null;
  is_published: boolean;
  created_at: string;
}

export default function AdminBlogs() {
  const [blogs, setBlogs] = useState<Blog[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);

  // Form state
  const [formData, setFormData] = useState<Partial<Blog>>({
    title: "",
    slug: "",
    content: "",
    excerpt: "",
    meta_title: "",
    meta_description: "",
    is_published: false,
  });

  useEffect(() => {
    fetchBlogs();
  }, []);

  const fetchBlogs = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("blogs" as any)
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      toast.error("Failed to fetch blogs");
    } else {
      setBlogs(data || []);
    }
    setLoading(false);
  };

  const handleEdit = (blog: Blog) => {
    setEditingId(blog.id);
    setFormData(blog);
    setIsCreating(false);
  };

  const handleCreate = () => {
    setEditingId(null);
    setFormData({
      title: "",
      slug: "",
      content: "",
      excerpt: "",
      meta_title: "",
      meta_description: "",
      is_published: false,
    });
    setIsCreating(true);
  };

  const handleCancel = () => {
    setEditingId(null);
    setIsCreating(false);
  };

  const saveBlog = async () => {
    if (!formData.title || !formData.slug) {
      toast.error("Title and Slug are required");
      return;
    }

    if (editingId) {
      const { error } = await supabase
        .from("blogs" as any)
        .update({
          title: formData.title,
          slug: formData.slug,
          content: formData.content,
          excerpt: formData.excerpt,
          meta_title: formData.meta_title,
          meta_description: formData.meta_description,
          is_published: formData.is_published,
        })
        .eq("id", editingId);

      if (error) toast.error(error.message);
      else {
        toast.success("Blog updated");
        setEditingId(null);
        fetchBlogs();
      }
    } else {
      const { error } = await supabase
        .from("blogs" as any)
        .insert([formData]);

      if (error) toast.error(error.message);
      else {
        toast.success("Blog created");
        setIsCreating(false);
        fetchBlogs();
      }
    }
  };

  const deleteBlog = async (id: string) => {
    if (!confirm("Are you sure you want to delete this blog post?")) return;

    const { error } = await supabase
      .from("blogs" as any)
      .delete()
      .eq("id", id);

    if (error) toast.error(error.message);
    else {
      toast.success("Blog deleted");
      fetchBlogs();
    }
  };

  const generateSlug = (title: string) => {
    return title
      .toLowerCase()
      .replace(/[^\w ]+/g, "")
      .replace(/ +/g, "-");
  };

  return (
    <AdminLayout>
      <MotionWrapper className="mx-auto max-w-4xl space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground">Blog Management</h1>
            <p className="text-muted-foreground">Manage SEO and AEO content</p>
          </div>
          {!isCreating && !editingId && (
            <GlassButton onClick={handleCreate}>
              <Plus className="mr-2 h-4 w-4" /> New Post
            </GlassButton>
          )}
        </div>

        {(isCreating || editingId) ? (
          <GlassCard variant="strong">
            <GlassCardHeader className="flex flex-row items-center justify-between">
              <GlassCardTitle>{editingId ? "Edit Post" : "Create New Post"}</GlassCardTitle>
              <GlassButton variant="ghost" size="sm" onClick={handleCancel}>
                <X className="h-4 w-4" />
              </GlassButton>
            </GlassCardHeader>
            <GlassCardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Title</Label>
                  <GlassInput
                    value={formData.title}
                    onChange={(e) => {
                      const newTitle = e.target.value;
                      setFormData(prev => ({
                        ...prev,
                        title: newTitle,
                        slug: prev.slug === generateSlug(prev.title || "") ? generateSlug(newTitle) : prev.slug
                      }));
                    }}
                    placeholder="e.g. How to Get Customers for Your Business"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Slug</Label>
                  <GlassInput
                    value={formData.slug}
                    onChange={(e) => setFormData(prev => ({ ...prev, slug: e.target.value }))}
                    placeholder="e.g. how-to-get-customers"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Excerpt (Search result snippet)</Label>
                <textarea
                  className="w-full rounded-xl border border-border/50 bg-background/50 px-4 py-3 text-sm text-foreground backdrop-blur-sm focus:border-primary/50 focus:outline-none focus:ring-1 focus:ring-primary/20 min-h-[60px] resize-y"
                  value={formData.excerpt || ""}
                  onChange={(e) => setFormData(prev => ({ ...prev, excerpt: e.target.value }))}
                  placeholder="Short summary for SEO..."
                />
              </div>

              <div className="space-y-2">
                <Label>Content (Markdown supported)</Label>
                <textarea
                  className="w-full rounded-xl border border-border/50 bg-background/50 px-4 py-3 text-sm text-foreground backdrop-blur-sm focus:border-primary/50 focus:outline-none focus:ring-1 focus:ring-primary/20 min-h-[300px] resize-y font-mono"
                  value={formData.content || ""}
                  onChange={(e) => setFormData(prev => ({ ...prev, content: e.target.value }))}
                  placeholder="Write your article here..."
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 border-t border-border/30 pt-4">
                <div className="space-y-2">
                  <Label>Meta Title</Label>
                  <GlassInput
                    value={formData.meta_title || ""}
                    onChange={(e) => setFormData(prev => ({ ...prev, meta_title: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Meta Description</Label>
                  <GlassInput
                    value={formData.meta_description || ""}
                    onChange={(e) => setFormData(prev => ({ ...prev, meta_description: e.target.value }))}
                  />
                </div>
              </div>

              <div className="flex items-center justify-between border-t border-border/30 pt-4">
                <div className="flex items-center gap-2">
                  <Label>Published</Label>
                  <Switch
                    checked={formData.is_published}
                    onCheckedChange={(v) => setFormData(prev => ({ ...prev, is_published: v }))}
                  />
                </div>
                <div className="flex gap-2">
                  <GlassButton variant="ghost" onClick={handleCancel}>Cancel</GlassButton>
                  <GlassButton variant="glow" onClick={saveBlog}>
                    <Save className="mr-2 h-4 w-4" /> Save Post
                  </GlassButton>
                </div>
              </div>
            </GlassCardContent>
          </GlassCard>
        ) : (
          <div className="space-y-4">
            {loading ? (
              <div className="flex justify-center py-12">
                <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
              </div>
            ) : blogs.length === 0 ? (
              <GlassCard>
                <GlassCardContent className="py-12 text-center text-muted-foreground">
                  No blog posts yet. Click "New Post" to get started.
                </GlassCardContent>
              </GlassCard>
            ) : (
              blogs.map((blog) => (
                <GlassCard key={blog.id} className="hover:border-primary/30 transition-colors">
                  <GlassCardContent className="flex items-center justify-between p-6">
                    <div>
                      <h3 className="font-bold text-lg">{blog.title}</h3>
                      <div className="flex items-center gap-4 mt-1">
                        <span className="text-xs text-muted-foreground font-mono">/{blog.slug}</span>
                        <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded-full ${blog.is_published ? "bg-primary/20 text-primary" : "bg-muted text-muted-foreground"}`}>
                          {blog.is_published ? "Published" : "Draft"}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {new Date(blog.created_at).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <GlassButton variant="ghost" size="sm" onClick={() => handleEdit(blog)}>
                        <Edit2 className="h-4 w-4" />
                      </GlassButton>
                      <GlassButton variant="ghost" size="sm" className="text-destructive hover:text-destructive hover:bg-destructive/10" onClick={() => deleteBlog(blog.id)}>
                        <Trash2 className="h-4 w-4" />
                      </GlassButton>
                    </div>
                  </GlassCardContent>
                </GlassCard>
              ))
            )}
          </div>
        )}
      </MotionWrapper>
    </AdminLayout>
  );
}
