import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { trpc } from "@/lib/trpc";
import { Activity, ArrowLeft, CheckCircle2, XCircle, MinusCircle } from "lucide-react";
import { Link } from "wouter";

export default function Logs() {
  const { data: logs, refetch } = trpc.logs.recent.useQuery({ limit: 100 });

  const getActionIcon = (actionType: string) => {
    switch (actionType) {
      case 'follow':
        return '👤';
      case 'like':
        return '❤️';
      case 'view_story':
        return '👁️';
      case 'scrape_followers':
        return '📥';
      case 'scrape_likers':
        return '📊';
      default:
        return '•';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'success':
        return <CheckCircle2 className="h-5 w-5 text-green-500" />;
      case 'failed':
        return <XCircle className="h-5 w-5 text-red-500" />;
      case 'skipped':
        return <MinusCircle className="h-5 w-5 text-gray-400" />;
      default:
        return null;
    }
  };

  const formatActionType = (type: string) => {
    return type.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
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

      <main className="container mx-auto px-4 py-8 max-w-5xl">
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
                <Activity className="h-8 w-8 text-blue-600" />
                Activity Logs
              </h1>
              <p className="text-gray-600 mt-2">
                Complete history of all bot actions and events
              </p>
            </div>
            <Button onClick={() => refetch()} variant="outline">
              Refresh
            </Button>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Recent Activity ({logs?.length || 0})</CardTitle>
              <CardDescription>
                All bot actions are logged here for transparency and debugging
              </CardDescription>
            </CardHeader>
            <CardContent>
              {logs && logs.length > 0 ? (
                <div className="space-y-2">
                  {logs.map((log) => (
                    <div
                      key={log.id}
                      className="flex items-start gap-4 p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                    >
                      <div className="flex-shrink-0 mt-1">
                        {getStatusIcon(log.status)}
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-lg">{getActionIcon(log.actionType)}</span>
                          <span className="font-semibold text-gray-900">
                            {formatActionType(log.actionType)}
                          </span>
                          {log.targetUsername && (
                            <span className="text-gray-600">→ @{log.targetUsername}</span>
                          )}
                        </div>
                        
                        {log.errorMessage && (
                          <div className="text-sm text-red-600 mt-1">
                            Error: {log.errorMessage}
                          </div>
                        )}
                        
                        {log.metadata && (
                          <div className="text-xs text-gray-500 mt-1">
                            {(() => {
                              try {
                                const meta = JSON.parse(log.metadata);
                                return Object.entries(meta).map(([key, value]) => (
                                  <span key={key} className="mr-3">
                                    {key}: {String(value)}
                                  </span>
                                ));
                              } catch {
                                return null;
                              }
                            })()}
                          </div>
                        )}
                      </div>
                      
                      <div className="flex-shrink-0 text-right">
                        <div className="text-sm text-gray-600">
                          {new Date(log.createdAt).toLocaleDateString()}
                        </div>
                        <div className="text-xs text-gray-500">
                          {new Date(log.createdAt).toLocaleTimeString()}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <Activity className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-600 mb-2">No activity logs yet</p>
                  <p className="text-sm text-gray-500">
                    Start the bot to see actions logged here
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Stats Summary */}
          {logs && logs.length > 0 && (
            <div className="grid md:grid-cols-4 gap-4">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium text-gray-600">Total Actions</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{logs.length}</div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium text-gray-600">Successful</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-green-600">
                    {logs.filter(l => l.status === 'success').length}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium text-gray-600">Failed</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-red-600">
                    {logs.filter(l => l.status === 'failed').length}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium text-gray-600">Success Rate</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-blue-600">
                    {logs.length > 0
                      ? Math.round((logs.filter(l => l.status === 'success').length / logs.length) * 100)
                      : 0}%
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
