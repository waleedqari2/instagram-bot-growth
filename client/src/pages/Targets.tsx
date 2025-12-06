import { useState } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { trpc } from "@/lib/trpc";
import { ArrowLeft, Plus, Target, Trash2, ToggleLeft, ToggleRight } from "lucide-react";
import { Link } from "wouter";
import { toast } from "sonner";

export default function Targets() {
  const { user } = useAuth();
  const [username, setUsername] = useState("");
  const [category, setCategory] = useState("");

  const { data: targets, refetch } = trpc.targets.list.useQuery();
  const addMutation = trpc.targets.add.useMutation({
    onSuccess: () => {
      refetch();
      setUsername("");
      setCategory("");
      toast.success("Target account added successfully");
    },
    onError: (error) => {
      toast.error(error.message || "Failed to add target account");
    },
  });

  const deleteMutation = trpc.targets.delete.useMutation({
    onSuccess: () => {
      refetch();
      toast.success("Target account deleted");
    },
  });

  const toggleMutation = trpc.targets.toggle.useMutation({
    onSuccess: () => {
      refetch();
    },
  });

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim()) {
      toast.error("Username is required");
      return;
    }
    addMutation.mutate({ username: username.trim(), category: category.trim() || undefined });
  };

  const handleDelete = (id: number) => {
    if (confirm("Are you sure you want to delete this target account?")) {
      deleteMutation.mutate({ id });
    }
  };

  const handleToggle = (id: number, currentStatus: boolean) => {
    toggleMutation.mutate({ id, isActive: !currentStatus });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-blue-50">
      <nav className="border-b bg-white/80 backdrop-blur-sm">
        <div className="container mx-auto px-4 py-4">
          <Link href="/">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Dashboard
            </Button>
          </Link>
        </div>
      </nav>

      <main className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="space-y-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
              <Target className="h-8 w-8 text-purple-600" />
              Target Accounts
            </h1>
            <p className="text-gray-600 mt-2">
              Add Instagram accounts to scrape followers and engagers from. Focus on competitors in your niche.
            </p>
          </div>

          {/* Add New Target */}
          <Card>
            <CardHeader>
              <CardTitle>Add New Target Account</CardTitle>
              <CardDescription>
                Enter the Instagram username of an account in your niche (e.g., umrah services, hotels in Mecca/Medina)
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleAdd} className="space-y-4">
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="username">Instagram Username *</Label>
                    <Input
                      id="username"
                      placeholder="username (without @)"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      disabled={addMutation.isPending}
                    />
                  </div>
                  <div>
                    <Label htmlFor="category">Category (Optional)</Label>
                    <Input
                      id="category"
                      placeholder="e.g., umrah, hotels_mecca"
                      value={category}
                      onChange={(e) => setCategory(e.target.value)}
                      disabled={addMutation.isPending}
                    />
                  </div>
                </div>
                <Button type="submit" disabled={addMutation.isPending}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Target Account
                </Button>
              </form>
            </CardContent>
          </Card>

          {/* Target List */}
          <Card>
            <CardHeader>
              <CardTitle>Your Target Accounts ({targets?.length || 0})</CardTitle>
              <CardDescription>
                The bot will scrape followers and engagers from these accounts
              </CardDescription>
            </CardHeader>
            <CardContent>
              {targets && targets.length > 0 ? (
                <div className="space-y-3">
                  {targets.map((target) => (
                    <div
                      key={target.id}
                      className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                    >
                      <div className="flex items-center gap-4">
                        <div
                          className={`w-3 h-3 rounded-full ${target.isActive ? 'bg-green-500' : 'bg-gray-400'}`}
                        ></div>
                        <div>
                          <div className="font-semibold text-gray-900">@{target.username}</div>
                          {target.category && (
                            <div className="text-sm text-gray-600">Category: {target.category}</div>
                          )}
                          {target.lastScrapedAt && (
                            <div className="text-xs text-gray-500">
                              Last scraped: {new Date(target.lastScrapedAt).toLocaleString()}
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleToggle(target.id, target.isActive)}
                          disabled={toggleMutation.isPending}
                        >
                          {target.isActive ? (
                            <ToggleRight className="h-5 w-5 text-green-600" />
                          ) : (
                            <ToggleLeft className="h-5 w-5 text-gray-400" />
                          )}
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete(target.id)}
                          disabled={deleteMutation.isPending}
                        >
                          <Trash2 className="h-4 w-4 text-red-500" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <Target className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-600 mb-4">No target accounts yet</p>
                  <p className="text-sm text-gray-500">
                    Add your first target account to start growing your Instagram
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Tips */}
          <Card className="bg-blue-50 border-blue-200">
            <CardHeader>
              <CardTitle className="text-blue-900">💡 Tips for Choosing Target Accounts</CardTitle>
            </CardHeader>
            <CardContent className="text-blue-800 space-y-2">
              <p>• Choose accounts in your exact niche (umrah services, hotels in Mecca/Medina)</p>
              <p>• Look for accounts with engaged followers (high likes/comments ratio)</p>
              <p>• Target accounts with 10K-100K followers for best results</p>
              <p>• Add 3-5 target accounts for optimal diversity</p>
              <p>• Avoid adding competitors that might block or report you</p>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
