import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { trpc } from "@/lib/trpc";
import { ArrowLeft, Save, Settings as SettingsIcon } from "lucide-react";
import { Link } from "wouter";
import { toast } from "sonner";

export default function Settings() {
  const { data: config, refetch } = trpc.bot.getConfig.useQuery();
  const [likesPerHour, setLikesPerHour] = useState(62);
  const [followsPerDay, setFollowsPerDay] = useState(100);
  const [minDelay, setMinDelay] = useState(30);
  const [maxDelay, setMaxDelay] = useState(90);
  const [enableFollows, setEnableFollows] = useState(true);
  const [enableLikes, setEnableLikes] = useState(true);

  useEffect(() => {
    if (config) {
      setLikesPerHour(config.likesPerHour);
      setFollowsPerDay(config.followsPerDay);
      setMinDelay(config.minDelaySeconds);
      setMaxDelay(config.maxDelaySeconds);
      setEnableFollows(config.enableFollows ?? true);
      setEnableLikes(config.enableLikes ?? true);
    }
  }, [config]);

  const updateMutation = trpc.bot.updateConfig.useMutation({
    onSuccess: () => {
      refetch();
      toast.success("Settings saved successfully");
    },
    onError: (error) => {
      toast.error(error.message || "Failed to save settings");
    },
  });

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (minDelay >= maxDelay) {
      toast.error("Minimum delay must be less than maximum delay");
      return;
    }

    updateMutation.mutate({
      likesPerHour,
      followsPerDay,
      minDelaySeconds: minDelay,
      maxDelaySeconds: maxDelay,
      enableFollows,
      enableLikes,
    });
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

      <main className="container mx-auto px-4 py-8 max-w-3xl">
        <div className="space-y-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
              <SettingsIcon className="h-8 w-8 text-gray-600" />
              Bot Settings
            </h1>
            <p className="text-gray-600 mt-2">
              Configure rate limits and behavior to keep your account safe
            </p>
          </div>

          <form onSubmit={handleSave} className="space-y-6">
            {/* Action Toggles */}
            <Card>
              <CardHeader>
                <CardTitle>Action Controls</CardTitle>
                <CardDescription>
                  Enable or disable specific bot actions
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="enableFollows">Enable Follows</Label>
                    <p className="text-sm text-gray-500">
                      Turn on/off automatic following
                    </p>
                  </div>
                  <Switch
                    id="enableFollows"
                    checked={enableFollows}
                    onCheckedChange={setEnableFollows}
                  />
                </div>
                
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="enableLikes">Enable Likes</Label>
                    <p className="text-sm text-gray-500">
                      Turn on/off automatic liking
                    </p>
                  </div>
                  <Switch
                    id="enableLikes"
                    checked={enableLikes}
                    onCheckedChange={setEnableLikes}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Rate Limits */}
            <Card>
              <CardHeader>
                <CardTitle>Rate Limits</CardTitle>
                <CardDescription>
                  Control how many actions the bot performs per day to avoid Instagram bans
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="likesPerHour">Likes Per Hour</Label>
                  <Input
                    id="likesPerHour"
                    type="number"
                    min="1"
                    max="200"
                    value={likesPerHour}
                    onChange={(e) => setLikesPerHour(parseInt(e.target.value))}
                  />
                  <p className="text-sm text-gray-500 mt-1">
                    Recommended: 50-70 likes per hour (safe limit = ~1500/day)
                  </p>
                </div>

                <div>
                  <Label htmlFor="followsPerDay">Follows Per Day</Label>
                  <Input
                    id="followsPerDay"
                    type="number"
                    min="1"
                    max="200"
                    value={followsPerDay}
                    onChange={(e) => setFollowsPerDay(parseInt(e.target.value))}
                  />
                  <p className="text-sm text-gray-500 mt-1">
                    Recommended: 80-100 follows per day (safe limit)
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Action Delays */}
            <Card>
              <CardHeader>
                <CardTitle>Action Delays</CardTitle>
                <CardDescription>
                  Random delays between actions to appear more human-like
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="minDelay">Minimum Delay (seconds)</Label>
                  <Input
                    id="minDelay"
                    type="number"
                    min="10"
                    max="300"
                    value={minDelay}
                    onChange={(e) => setMinDelay(parseInt(e.target.value))}
                  />
                  <p className="text-sm text-gray-500 mt-1">
                    Minimum wait time between actions
                  </p>
                </div>

                <div>
                  <Label htmlFor="maxDelay">Maximum Delay (seconds)</Label>
                  <Input
                    id="maxDelay"
                    type="number"
                    min="10"
                    max="300"
                    value={maxDelay}
                    onChange={(e) => setMaxDelay(parseInt(e.target.value))}
                  />
                  <p className="text-sm text-gray-500 mt-1">
                    Maximum wait time between actions
                  </p>
                </div>

                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <p className="text-sm text-blue-800">
                    <strong>Current range:</strong> {minDelay}-{maxDelay} seconds between actions
                  </p>
                  <p className="text-sm text-blue-700 mt-1">
                    The bot will wait a random time in this range to avoid detection
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Safety Tips */}
            <Card className="bg-yellow-50 border-yellow-200">
              <CardHeader>
                <CardTitle className="text-yellow-900">⚠️ Safety Guidelines</CardTitle>
              </CardHeader>
              <CardContent className="text-yellow-800 space-y-2">
                <p>• <strong>Start slow:</strong> Begin with lower limits for new accounts</p>
                <p>• <strong>Don't exceed limits:</strong> Instagram monitors unusual activity</p>
                <p>• <strong>Use realistic delays:</strong> 30-90 seconds is recommended</p>
                <p>• <strong>Monitor your account:</strong> Stop immediately if you get warnings</p>
                <p>• <strong>Avoid suspicious patterns:</strong> Random delays help appear natural</p>
              </CardContent>
            </Card>

            <Button type="submit" size="lg" disabled={updateMutation.isPending} className="w-full">
              <Save className="h-4 w-4 mr-2" />
              Save Settings
            </Button>
          </form>
        </div>
      </main>
    </div>
  );
}
