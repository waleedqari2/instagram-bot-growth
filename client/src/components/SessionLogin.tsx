import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Info, Copy, CheckCircle2 } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";

interface SessionLoginProps {
  onSuccess: () => void;
}

export default function SessionLogin({ onSuccess }: SessionLoginProps) {
  const [username, setUsername] = useState("");
  const [sessionCookie, setSessionCookie] = useState("");
  const [showInstructions, setShowInstructions] = useState(false);

  const startBotMutation = trpc.bot.start.useMutation({
    onSuccess: (result) => {
      if (result.success) {
        toast.success('Bot started successfully!');
        onSuccess();
      } else {
        toast.error(result.message);
      }
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to start bot');
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!username || !sessionCookie) {
      toast.error('Please provide both username and password');
      return;
    }
    startBotMutation.mutate({ username, password: sessionCookie });
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success('Copied to clipboard!');
  };

  return (
    <Card className="max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle>Connect Instagram Account</CardTitle>
        <CardDescription>
          Enter your Instagram credentials to start the bot
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Alert>
          <Info className="h-4 w-4" />
          <AlertDescription>
            Your password is encrypted and stored securely. We never share your credentials.
          </AlertDescription>
        </Alert>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="username">Instagram Username</Label>
            <Input
              id="username"
              placeholder="your_username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
            />
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="sessionCookie">Session Cookie</Label>
              <Button
                type="button"
                variant="link"
                size="sm"
                onClick={() => setShowInstructions(!showInstructions)}
              >
                {showInstructions ? 'Hide' : 'Show'} Instructions
              </Button>
            </div>
            <Input
              id="password"
              type="password"
              placeholder="Enter your Instagram password"
              value={sessionCookie}
              onChange={(e) => setSessionCookie(e.target.value)}
              required
            />
          </div>

          {showInstructions && (
            <Alert className="bg-blue-50 border-blue-200">
              <Info className="h-4 w-4 text-blue-600" />
              <AlertDescription className="space-y-3 text-sm">
                <p className="font-semibold text-blue-900">How to get your Session Cookies (Easy Method):</p>
                <ol className="list-decimal list-inside space-y-2 text-blue-800">
                  <li>Install browser extension: <strong>"EditThisCookie"</strong> (Chrome) or <strong>"Cookie-Editor"</strong> (Firefox)</li>
                  <li>Open <a href="https://www.instagram.com" target="_blank" className="underline">Instagram.com</a> and log in</li>
                  <li>Click the extension icon in your browser toolbar</li>
                  <li>Click <strong>"Export"</strong> or <strong>"Export All"</strong> button</li>
                  <li>Paste the exported JSON in the box above</li>
                </ol>
                <div className="mt-3 p-3 bg-amber-50 border border-amber-300 rounded">
                  <p className="text-sm text-amber-900 font-semibold mb-2">Alternative Method (Manual):</p>
                  <ol className="list-decimal list-inside space-y-1 text-xs text-amber-800">
                    <li>Press F12 → Console tab</li>
                    <li>Paste this code and press Enter:</li>
                  </ol>
                  <code className="block mt-2 p-2 bg-white rounded text-xs font-mono overflow-x-auto">
                    JSON.stringify(document.cookie.split('; ').map(c =&gt; &#123;const [name,value]=c.split('=');return &#123;name,value,domain:'.instagram.com'&#125;&#125;))
                  </code>
                  <p className="text-xs text-amber-800 mt-2">Copy the result and paste above ↑</p>
                </div>
              </AlertDescription>
            </Alert>
          )}

          <Button
            type="submit"
            className="w-full"
            disabled={startBotMutation.isPending || !username || !sessionCookie}
          >
            {startBotMutation.isPending ? 'Connecting...' : 'Connect & Start Bot'}
          </Button>
        </form>

        <div className="pt-4 border-t">
          <p className="text-xs text-gray-500 text-center">
            Your session cookie is encrypted and stored securely. We never see your password.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
