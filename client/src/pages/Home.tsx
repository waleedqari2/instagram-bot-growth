import { useAuth } from "@/_core/hooks/useAuth";
import React from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getLoginUrl } from "@/const";
import { trpc } from "@/lib/trpc";
import { Activity, BarChart3, Bot, PlayCircle, Settings, StopCircle, Target, TrendingUp, Upload } from "lucide-react";
import { Link } from "wouter";
import { toast } from "sonner";


export default function Home() {
  const { user, loading, isAuthenticated } = useAuth();
  
  // Bypass authentication and always render the Dashboard
  // We keep useAuth for the Dashboard component to function, but ignore the checks.
  // The user object will be null/undefined if not authenticated, which is handled in Dashboard.

  return <Dashboard />;
}

function Dashboard() {
  const { user, logout } = useAuth();
  const { data: botStatus, refetch: refetchStatus } = trpc.bot.status.useQuery(undefined, {
    refetchInterval: 5000, // Refresh every 5 seconds
  });
  const { data: todayStats } = trpc.analytics.today.useQuery();
  const { data: recentLogs } = trpc.logs.recent.useQuery({ limit: 10 });

  const startBotMutation = trpc.bot.start.useMutation({
    onSuccess: (result) => {
      if (result.success) {
        refetchStatus();
        toast.success('Bot started successfully!');
      } else {
        toast.error(result.message);
      }
    },
    onError: (error) => {
      if (error.message.includes('Facebook')) {
        toast.error('❌ Your Instagram account is linked to Facebook. Please unlink it from Instagram Settings → Linked Accounts, then try again.');
      } else {
        toast.error(error.message || 'Failed to start bot');
      }
    },
  });

  const stopBotMutation = trpc.bot.stop.useMutation({
    onSuccess: () => {
      refetchStatus();
    },
  });

  const disconnectMutation = trpc.bot.disconnect.useMutation({
    onSuccess: () => {
      refetchStatus();
      toast.success('Instagram account disconnected successfully');
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to disconnect account');
    },
  });

  const handleStartBot = () => {
    // Original logic for starting the bot with username/password
    if (botStatus?.account?.username) {
      const password = prompt(`Enter password for @${botStatus.account.username}:`);
      if (password) {
        startBotMutation.mutate({ 
          username: botStatus.account.username, 
          password 
        });
      }
    } else {
      const username = prompt('Enter your Instagram username:');
      if (username) {
        const password = prompt('Enter your Instagram password:');
        if (password) {
          startBotMutation.mutate({ username, password });
        }
      }
    }
  };

  const handleUploadSession = () => {
    // Session file upload logic moved to a dedicated function
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = async (e: any) => {
      const file = e.target?.files?.[0];
      if (file) {
        try {
          const text = await file.text();
          const sessionData = JSON.parse(text);
          
          if (!sessionData.username || !sessionData.authorization_data) {
            toast.error('Invalid session file format');
            return;
          }
          
          startBotMutation.mutate({ 
            username: sessionData.username,
            sessionData 
          });
        } catch (error) {
          toast.error('Failed to read session file');
        }
      }
    };
    input.click();
  };

  const handleStopBot = () => {
    if (confirm("Are you sure you want to stop the bot?")) {
      stopBotMutation.mutate();
    }
  };

  const isRunning = botStatus?.isRunning || false;
  const followsToday = botStatus?.limits.followsToday || 0;
  const likesToday = botStatus?.limits.likesToday || 0;
  const storiesViewedToday = botStatus?.limits.storiesViewedToday || 0;
  const followsLimit = botStatus?.limits.followsLimit || 100;
  const likesLimit = botStatus?.limits.likesLimit || 62;
  const dailyLikesLimit = likesLimit * 24; // Calculate daily limit based on hourly rate

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-blue-50">
      <nav className="border-b bg-white/80 backdrop-blur-sm">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <Bot className="h-8 w-8 text-purple-600" />
            <h1 className="text-2xl font-bold text-gray-900">Instagram Growth Bot</h1>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-sm text-gray-600">{user?.name || user?.email}</span>
            <Button variant="outline" onClick={() => logout()}>
              Sign Out
            </Button>
          </div>
        </div>
      </nav>

      <main className="container mx-auto px-4 py-8">
        <div className="grid gap-6">
          {/* Bot Control */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Bot className="h-6 w-6" />
                    Bot Control
                  </CardTitle>
                  <CardDescription>
                    {botStatus?.account ? `Connected as @${botStatus.account.username}` : 'Not connected'}
                  </CardDescription>
                </div>
                <div className="flex items-center gap-2">
                  {isRunning ? (
                    <>
                      <span className="flex items-center gap-2 text-green-600 font-semibold">
                        <span className="w-2 h-2 bg-green-600 rounded-full animate-pulse"></span>
                        Running
                      </span>
                      <Button onClick={handleStopBot} variant="destructive" disabled={stopBotMutation.isPending}>
                        <StopCircle className="h-4 w-4 mr-2" />
                        Stop Bot
                      </Button>
                    </>
                  ) : (
                    <>
                      <span className="flex items-center gap-2 text-gray-500 font-semibold">
                        <span className="w-2 h-2 bg-gray-400 rounded-full"></span>
                        Stopped
                      </span>
                   <Button onClick={handleStartBot} disabled={isRunning || startBotMutation.isPending}>
                        <PlayCircle className="h-4 w-4 mr-2" />
                        Start Bot (User/Pass)
                      </Button>
                      <Button onClick={handleUploadSession} variant="outline" disabled={isRunning || startBotMutation.isPending}>
                        <Upload className="h-4 w-4 mr-2" />
                        Upload Session (JSON)
                      </Button>           </>
                  )}
                  {botStatus?.account && (
                    <Button 
                      onClick={() => {
                        if (confirm('Are you sure you want to disconnect your Instagram account? All data will be deleted.')) {
                          disconnectMutation.mutate();
                        }
                      }} 
                      variant="outline" 
                      size="sm"
                      disabled={disconnectMutation.isPending}
                    >
                      Disconnect
                    </Button>
                  )}
                </div>
              </div>
            </CardHeader>
          </Card>

          {/* Stats Grid */}
          <div className="grid md:grid-cols-3 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-medium text-gray-600">Follows Today</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-purple-600">
                  {followsToday} / {followsLimit}
                </div>
                <div className="mt-2 w-full bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-purple-600 h-2 rounded-full transition-all"
                    style={{ width: `${(followsToday / followsLimit) * 100}%` }}
                  ></div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-medium text-gray-600">Likes Today</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-blue-600">
                  {likesToday} / {dailyLikesLimit}
                </div>
                <div className="mt-2 w-full bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-blue-600 h-2 rounded-full transition-all"
                    style={{ width: `${(likesToday / dailyLikesLimit) * 100}%` }}
                  ></div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-medium text-gray-600">Stories Viewed</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-green-600">{storiesViewedToday}</div>
                <p className="text-sm text-gray-500 mt-2">No limit</p>
              </CardContent>
            </Card>
          </div>

          {/* Quick Actions */}
          <div className="grid md:grid-cols-3 gap-6">
            <Link href="/targets">
              <Card className="cursor-pointer hover:shadow-lg transition-shadow">
                <CardHeader>
                  <Target className="h-10 w-10 text-purple-600 mb-2" />
                  <CardTitle>Target Accounts</CardTitle>
                  <CardDescription>Manage accounts to scrape followers from</CardDescription>
                </CardHeader>
              </Card>
            </Link>

            <Link href="/logs">
              <Card className="cursor-pointer hover:shadow-lg transition-shadow">
                <CardHeader>
                  <Activity className="h-10 w-10 text-blue-600 mb-2" />
                  <CardTitle>Activity Logs</CardTitle>
                  <CardDescription>View all bot actions and events</CardDescription>
                </CardHeader>
              </Card>
            </Link>

            <Link href="/settings">
              <Card className="cursor-pointer hover:shadow-lg transition-shadow">
                <CardHeader>
                  <Settings className="h-10 w-10 text-gray-600 mb-2" />
                  <CardTitle>Settings</CardTitle>
                  <CardDescription>Configure bot limits and behavior</CardDescription>
                </CardHeader>
              </Card>
            </Link>
          </div>

          {/* Recent Activity */}
          <Card>
            <CardHeader>
              <CardTitle>Recent Activity</CardTitle>
              <CardDescription>Latest bot actions</CardDescription>
            </CardHeader>
            <CardContent>
              {recentLogs && recentLogs.length > 0 ? (
                <div className="space-y-2">
                  {recentLogs.map((log) => (
                    <div key={log.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div className="flex items-center gap-3">
                        <span className={`w-2 h-2 rounded-full ${log.status === 'success' ? 'bg-green-500' : log.status === 'failed' ? 'bg-red-500' : 'bg-gray-400'}`}></span>
                        <span className="font-medium capitalize">{log.actionType.replace('_', ' ')}</span>
                        {log.targetUsername && <span className="text-gray-600">@{log.targetUsername}</span>}
                      </div>
                      <span className="text-sm text-gray-500">
                        {new Date(log.createdAt).toLocaleTimeString()}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-500 text-center py-8">No activity yet. Start the bot to begin!</p>
              )}
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
