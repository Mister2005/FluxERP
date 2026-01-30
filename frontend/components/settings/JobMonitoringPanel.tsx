'use client';

import React, { useState, useEffect } from 'react';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { 
  RefreshCw, 
  PlayCircle, 
  Trash2, 
  Clock, 
  CheckCircle, 
  XCircle, 
  Loader2,
  AlertTriangle,
  Activity
} from 'lucide-react';

interface QueueStats {
  name: string;
  waiting: number;
  active: number;
  completed: number;
  failed: number;
  delayed: number;
  total: number;
}

interface JobItem {
  id: string;
  name: string;
  status: string;
  progress: number;
  data: any;
  createdAt: string;
  processedAt: string | null;
  finishedAt: string | null;
  failedReason: string | null;
}

const queueNames = ['email', 'ai-analysis', 'reports', 'notifications'];

export function JobMonitoringPanel() {
  const [stats, setStats] = useState<QueueStats[]>([]);
  const [selectedQueue, setSelectedQueue] = useState<string | null>(null);
  const [jobs, setJobs] = useState<JobItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [jobsLoading, setJobsLoading] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>('all');

  const fetchStats = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/jobs/stats`, {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      if (response.ok) {
        const data = await response.json();
        setStats(data);
      }
    } catch (error) {
      console.error('Failed to fetch queue stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchJobs = async (queueName: string, status: string = 'all') => {
    setJobsLoading(true);
    try {
      const token = localStorage.getItem('token');
      const url = status === 'all' 
        ? `${process.env.NEXT_PUBLIC_API_URL}/api/jobs/${queueName}/jobs`
        : `${process.env.NEXT_PUBLIC_API_URL}/api/jobs/${queueName}/jobs?status=${status}`;
      
      const response = await fetch(url, {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      if (response.ok) {
        const data = await response.json();
        setJobs(data);
      }
    } catch (error) {
      console.error('Failed to fetch jobs:', error);
    } finally {
      setJobsLoading(false);
    }
  };

  const retryJob = async (queueName: string, jobId: string) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/jobs/${queueName}/retry/${jobId}`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
      });
      if (response.ok) {
        fetchJobs(queueName, statusFilter);
        fetchStats();
      }
    } catch (error) {
      console.error('Failed to retry job:', error);
    }
  };

  const cleanQueue = async (queueName: string, status: 'completed' | 'failed') => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/jobs/${queueName}/clean`, {
        method: 'POST',
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status, grace: 0 }),
      });
      if (response.ok) {
        fetchJobs(queueName, statusFilter);
        fetchStats();
      }
    } catch (error) {
      console.error('Failed to clean queue:', error);
    }
  };

  useEffect(() => {
    fetchStats();
    // Refresh stats every 30 seconds
    const interval = setInterval(fetchStats, 30000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (selectedQueue) {
      fetchJobs(selectedQueue, statusFilter);
    }
  }, [selectedQueue, statusFilter]);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'waiting':
        return <Clock className="h-4 w-4 text-yellow-500" />;
      case 'active':
        return <Loader2 className="h-4 w-4 text-blue-500 animate-spin" />;
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'failed':
        return <XCircle className="h-4 w-4 text-red-500" />;
      case 'delayed':
        return <AlertTriangle className="h-4 w-4 text-orange-500" />;
      default:
        return <Activity className="h-4 w-4 text-gray-500" />;
    }
  };

  const getStatusBadgeVariant = (status: string): 'default' | 'success' | 'error' | 'warning' => {
    switch (status) {
      case 'active':
        return 'default';
      case 'completed':
        return 'success';
      case 'failed':
        return 'error';
      case 'waiting':
      case 'delayed':
        return 'warning';
      default:
        return 'default';
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Activity className="h-5 w-5 text-[var(--color-brown-600)]" />
          <h3 className="text-lg font-semibold">Background Jobs</h3>
        </div>
        <Button
          variant="secondary"
          size="sm"
          onClick={fetchStats}
          disabled={loading}
        >
          {loading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <RefreshCw className="h-4 w-4" />
          )}
          <span className="ml-2">Refresh</span>
        </Button>
      </div>

      {/* Queue Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((queue) => (
          <div
            key={queue.name}
            className={`cursor-pointer transition-all rounded-lg ${
              selectedQueue === queue.name 
                ? 'ring-2 ring-[var(--color-brown-500)]' 
                : 'hover:shadow-md'
            }`}
            onClick={() => setSelectedQueue(queue.name)}
          >
          <Card className="p-4">
            <div className="flex items-center justify-between mb-3">
              <h4 className="font-medium capitalize">{queue.name.replace('-', ' ')}</h4>
              {queue.active > 0 && (
                <Loader2 className="h-4 w-4 text-blue-500 animate-spin" />
              )}
            </div>
            
            <div className="grid grid-cols-3 gap-2 text-sm">
              <div className="text-center">
                <div className="text-lg font-semibold text-yellow-600">{queue.waiting}</div>
                <div className="text-xs text-gray-500">Waiting</div>
              </div>
              <div className="text-center">
                <div className="text-lg font-semibold text-blue-600">{queue.active}</div>
                <div className="text-xs text-gray-500">Active</div>
              </div>
              <div className="text-center">
                <div className="text-lg font-semibold text-green-600">{queue.completed}</div>
                <div className="text-xs text-gray-500">Done</div>
              </div>
            </div>

            {queue.failed > 0 && (
              <div className="mt-2 pt-2 border-t border-gray-100">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-red-600 flex items-center gap-1">
                    <XCircle className="h-3 w-3" />
                    {queue.failed} failed
                  </span>
                </div>
              </div>
            )}
          </Card>
          </div>
        ))}
      </div>

      {/* Job List */}
      {selectedQueue && (
        <Card className="p-4">
          <div className="flex items-center justify-between mb-4">
            <h4 className="font-medium capitalize">{selectedQueue.replace('-', ' ')} Jobs</h4>
            <div className="flex items-center gap-2">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="text-sm px-2 py-1 border border-gray-200 rounded"
              >
                <option value="all">All Status</option>
                <option value="waiting">Waiting</option>
                <option value="active">Active</option>
                <option value="completed">Completed</option>
                <option value="failed">Failed</option>
                <option value="delayed">Delayed</option>
              </select>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => cleanQueue(selectedQueue, 'completed')}
              >
                <Trash2 className="h-4 w-4" />
                <span className="ml-1">Clear Done</span>
              </Button>
            </div>
          </div>

          {jobsLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
            </div>
          ) : jobs.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              No jobs found
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Job</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Progress</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Created</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {jobs.map((job) => (
                    <tr key={job.id}>
                      <td className="px-4 py-2 whitespace-nowrap">
                        <Badge variant={getStatusBadgeVariant(job.status)}>
                          <span className="flex items-center gap-1">
                            {getStatusIcon(job.status)}
                            {job.status}
                          </span>
                        </Badge>
                      </td>
                      <td className="px-4 py-2">
                        <div className="text-sm font-medium">{job.name}</div>
                        <div className="text-xs text-gray-500">ID: {job.id}</div>
                        {job.failedReason && (
                          <div className="text-xs text-red-500 mt-1">{job.failedReason}</div>
                        )}
                      </td>
                      <td className="px-4 py-2 whitespace-nowrap">
                        {job.status === 'active' && (
                          <div className="w-24">
                            <div className="bg-gray-200 rounded-full h-2">
                              <div 
                                className="bg-blue-500 h-2 rounded-full transition-all"
                                style={{ width: `${job.progress}%` }}
                              />
                            </div>
                            <div className="text-xs text-gray-500 mt-1">{job.progress}%</div>
                          </div>
                        )}
                        {job.status === 'completed' && (
                          <span className="text-green-600 text-sm">100%</span>
                        )}
                      </td>
                      <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-500">
                        {new Date(job.createdAt).toLocaleString()}
                      </td>
                      <td className="px-4 py-2 whitespace-nowrap">
                        {job.status === 'failed' && (
                          <Button
                            variant="secondary"
                            size="sm"
                            onClick={() => retryJob(selectedQueue, job.id)}
                          >
                            <PlayCircle className="h-4 w-4" />
                            <span className="ml-1">Retry</span>
                          </Button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      )}
    </div>
  );
}

export default JobMonitoringPanel;
