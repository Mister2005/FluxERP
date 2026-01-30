'use client';

import React, { useState, useEffect } from 'react';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { Mail, Server, Lock, Send, CheckCircle, XCircle, Loader2 } from 'lucide-react';

interface EmailConfig {
  smtpHost: string;
  smtpPort: string;
  smtpSecure: boolean;
  smtpUser: string;
  smtpFrom: string;
}

export function EmailSettings() {
  const [config, setConfig] = useState<EmailConfig>({
    smtpHost: '',
    smtpPort: '587',
    smtpSecure: false,
    smtpUser: '',
    smtpFrom: '',
  });
  const [smtpPass, setSmtpPass] = useState('');
  const [isTesting, setIsTesting] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [saveResult, setSaveResult] = useState<{ success: boolean; message: string } | null>(null);

  // Load current config on mount
  useEffect(() => {
    fetchConfig();
  }, []);

  const fetchConfig = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/settings/email`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      if (response.ok) {
        const data = await response.json();
        setConfig({
          smtpHost: data.smtpHost || '',
          smtpPort: data.smtpPort || '587',
          smtpSecure: data.smtpSecure || false,
          smtpUser: data.smtpUser || '',
          smtpFrom: data.smtpFrom || '',
        });
      }
    } catch (error) {
      console.error('Failed to fetch email config:', error);
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    setSaveResult(null);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/settings/email`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...config,
          smtpPass: smtpPass || undefined,
        }),
      });

      if (response.ok) {
        setSaveResult({ success: true, message: 'Email settings saved successfully' });
        setSmtpPass('');
      } else {
        const data = await response.json();
        setSaveResult({ success: false, message: data.error || 'Failed to save settings' });
      }
    } catch (error) {
      setSaveResult({ success: false, message: 'Failed to connect to server' });
    } finally {
      setIsSaving(false);
    }
  };

  const handleTestConnection = async () => {
    setIsTesting(true);
    setTestResult(null);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/settings/email/test`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...config,
          smtpPass: smtpPass || undefined,
        }),
      });

      if (response.ok) {
        setTestResult({ success: true, message: 'Connection successful! Test email sent.' });
      } else {
        const data = await response.json();
        setTestResult({ success: false, message: data.error || 'Connection test failed' });
      }
    } catch (error) {
      setTestResult({ success: false, message: 'Failed to test connection' });
    } finally {
      setIsTesting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Mail className="h-5 w-5 text-[var(--color-brown-600)]" />
        <h3 className="text-lg font-semibold">Email Notifications</h3>
      </div>

      <p className="text-sm text-[var(--color-brown-600)]">
        Configure SMTP settings to enable email notifications for ECO status changes, work order updates, and more.
      </p>

      <Card className="p-6">
        <div className="space-y-4">
          {/* SMTP Server */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-[var(--color-brown-700)] mb-1">
                <Server className="h-4 w-4 inline mr-1" />
                SMTP Host
              </label>
              <input
                type="text"
                value={config.smtpHost}
                onChange={(e) => setConfig({ ...config, smtpHost: e.target.value })}
                placeholder="smtp.gmail.com"
                className="w-full px-3 py-2 border border-[var(--color-brown-200)] rounded-md focus:outline-none focus:ring-2 focus:ring-[var(--color-brown-400)]"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-[var(--color-brown-700)] mb-1">
                SMTP Port
              </label>
              <input
                type="text"
                value={config.smtpPort}
                onChange={(e) => setConfig({ ...config, smtpPort: e.target.value })}
                placeholder="587"
                className="w-full px-3 py-2 border border-[var(--color-brown-200)] rounded-md focus:outline-none focus:ring-2 focus:ring-[var(--color-brown-400)]"
              />
            </div>
          </div>

          {/* Security */}
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="smtpSecure"
              checked={config.smtpSecure}
              onChange={(e) => setConfig({ ...config, smtpSecure: e.target.checked })}
              className="h-4 w-4 rounded border-[var(--color-brown-300)] text-[var(--color-brown-600)] focus:ring-[var(--color-brown-500)]"
            />
            <label htmlFor="smtpSecure" className="text-sm font-medium text-[var(--color-brown-700)]">
              <Lock className="h-4 w-4 inline mr-1" />
              Use SSL/TLS (port 465)
            </label>
          </div>

          {/* Authentication */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-[var(--color-brown-700)] mb-1">
                Username/Email
              </label>
              <input
                type="email"
                value={config.smtpUser}
                onChange={(e) => setConfig({ ...config, smtpUser: e.target.value })}
                placeholder="your-email@example.com"
                className="w-full px-3 py-2 border border-[var(--color-brown-200)] rounded-md focus:outline-none focus:ring-2 focus:ring-[var(--color-brown-400)]"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-[var(--color-brown-700)] mb-1">
                Password/App Password
              </label>
              <input
                type="password"
                value={smtpPass}
                onChange={(e) => setSmtpPass(e.target.value)}
                placeholder="••••••••"
                className="w-full px-3 py-2 border border-[var(--color-brown-200)] rounded-md focus:outline-none focus:ring-2 focus:ring-[var(--color-brown-400)]"
              />
              <p className="mt-1 text-xs text-[var(--color-brown-500)]">
                Leave blank to keep current password
              </p>
            </div>
          </div>

          {/* From Address */}
          <div>
            <label className="block text-sm font-medium text-[var(--color-brown-700)] mb-1">
              From Address
            </label>
            <input
              type="text"
              value={config.smtpFrom}
              onChange={(e) => setConfig({ ...config, smtpFrom: e.target.value })}
              placeholder="FluxERP <noreply@yourcompany.com>"
              className="w-full px-3 py-2 border border-[var(--color-brown-200)] rounded-md focus:outline-none focus:ring-2 focus:ring-[var(--color-brown-400)]"
            />
          </div>

          {/* Result Messages */}
          {testResult && (
            <div className={`flex items-center gap-2 p-3 rounded-md ${testResult.success ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
              {testResult.success ? <CheckCircle className="h-5 w-5" /> : <XCircle className="h-5 w-5" />}
              <span className="text-sm">{testResult.message}</span>
            </div>
          )}

          {saveResult && (
            <div className={`flex items-center gap-2 p-3 rounded-md ${saveResult.success ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
              {saveResult.success ? <CheckCircle className="h-5 w-5" /> : <XCircle className="h-5 w-5" />}
              <span className="text-sm">{saveResult.message}</span>
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center gap-3 pt-4 border-t border-[var(--color-brown-200)]">
            <Button
              variant="secondary"
              onClick={handleTestConnection}
              disabled={isTesting || !config.smtpHost || !config.smtpUser}
            >
              {isTesting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Testing...
                </>
              ) : (
                <>
                  <Send className="h-4 w-4 mr-2" />
                  Test Connection
                </>
              )}
            </Button>
            <Button
              onClick={handleSave}
              disabled={isSaving || !config.smtpHost || !config.smtpUser}
            >
              {isSaving ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                'Save Settings'
              )}
            </Button>
          </div>
        </div>
      </Card>

      {/* Help Section */}
      <Card className="p-4 bg-[var(--color-brown-50)]">
        <h4 className="font-medium text-[var(--color-brown-800)] mb-2">Common SMTP Settings</h4>
        <div className="text-sm text-[var(--color-brown-600)] space-y-1">
          <p><strong>Gmail:</strong> smtp.gmail.com, Port 587 (TLS) or 465 (SSL)</p>
          <p><strong>Outlook/Microsoft 365:</strong> smtp.office365.com, Port 587</p>
          <p><strong>SendGrid:</strong> smtp.sendgrid.net, Port 587</p>
          <p className="mt-2 text-xs">
            Note: For Gmail, you may need to use an App Password if 2FA is enabled.
          </p>
        </div>
      </Card>
    </div>
  );
}

export default EmailSettings;
