import { useEffect, useState } from 'react';
import type { ActionFunctionArgs, LoaderFunctionArgs } from 'react-router';
import { useLoaderData, useFetcher } from 'react-router';
import { useAppBridge } from '@shopify/app-bridge-react';
import { authenticate } from '../shopify.server';
import prisma from '../db.server';
import { queueService } from '../modules/queue/services/queue.service';
import type { BackgroundJob } from '@prisma/client';

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { session } = await authenticate.admin(request);
  const shop = session.shop;

  const [jobs, pendingCount, processingCount, completedCount, failedCount] = await Promise.all([
    prisma.backgroundJob.findMany({
      where: {
        payload: {
          path: ['shop'],
          equals: shop,
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 100,
    }),
    prisma.backgroundJob.count({
      where: {
        status: 'PENDING',
        payload: {
          path: ['shop'],
          equals: shop,
        },
      },
    }),
    prisma.backgroundJob.count({
      where: {
        status: 'PROCESSING',
        payload: {
          path: ['shop'],
          equals: shop,
        },
      },
    }),
    prisma.backgroundJob.count({
      where: {
        status: 'COMPLETED',
        payload: {
          path: ['shop'],
          equals: shop,
        },
      },
    }),
    prisma.backgroundJob.count({
      where: {
        status: 'FAILED',
        payload: {
          path: ['shop'],
          equals: shop,
        },
      },
    }),
  ]);

  return {
    jobs,
    stats: {
      total: pendingCount + processingCount + completedCount + failedCount,
      pending: pendingCount,
      processing: processingCount,
      completed: completedCount,
      failed: failedCount,
    },
  };
};

export const action = async ({ request }: ActionFunctionArgs) => {
  const { session } = await authenticate.admin(request);
  const shop = session.shop;

  const formData = await request.formData();
  const actionType = formData.get('actionType');

  try {
    if (actionType === 'retryJob') {
      const jobId = formData.get('jobId') as string;
      if (!jobId) {
        return Response.json({ error: 'Job ID is required.' }, { status: 400 });
      }

      const job = await prisma.backgroundJob.findUnique({ where: { id: jobId } });
      if (!job || (job.payload as any)?.shop !== shop) {
        return Response.json({ error: 'Job not found or access denied.' }, { status: 404 });
      }

      const updated = await prisma.backgroundJob.update({
        where: { id: jobId },
        data: {
          status: 'PENDING',
          attempts: 0,
          errorMessage: null,
          runAt: new Date(),
        },
      });

      return Response.json({ success: true, action: 'retryJob', job: updated });
    }

    if (actionType === 'retryAllFailed') {
      const affected = await prisma.backgroundJob.updateMany({
        where: {
          status: 'FAILED',
          payload: {
            path: ['shop'],
            equals: shop,
          },
        },
        data: {
          status: 'PENDING',
          attempts: 0,
          errorMessage: null,
          runAt: new Date(),
        },
      });

      return Response.json({ success: true, action: 'retryAllFailed', count: affected.count });
    }

    if (actionType === 'deleteJob') {
      const jobId = formData.get('jobId') as string;
      if (!jobId) {
        return Response.json({ error: 'Job ID is required.' }, { status: 400 });
      }

      const job = await prisma.backgroundJob.findUnique({ where: { id: jobId } });
      if (!job || (job.payload as any)?.shop !== shop) {
        return Response.json({ error: 'Job not found or access denied.' }, { status: 404 });
      }

      await prisma.backgroundJob.delete({ where: { id: jobId } });

      return Response.json({ success: true, action: 'deleteJob', jobId });
    }

    if (actionType === 'clearCompleted') {
      const affected = await prisma.backgroundJob.deleteMany({
        where: {
          status: 'COMPLETED',
          payload: {
            path: ['shop'],
            equals: shop,
          },
        },
      });

      return Response.json({ success: true, action: 'clearCompleted', count: affected.count });
    }

    if (actionType === 'triggerSync') {
      const job = await queueService.enqueueJob('SYNC_TEMPLATES', { shop });
      return Response.json({ success: true, action: 'triggerSync', job });
    }

    return Response.json({ error: 'Unknown action' }, { status: 400 });
  } catch (error: any) {
    console.error('[JobsAction] Error executing action:', error);
    return Response.json({ error: error.message || 'Action failed' }, { status: 500 });
  }
};

export default function BackgroundJobsPage() {
  const { jobs: rawJobs, stats } = useLoaderData<typeof loader>();
  const jobs = rawJobs as BackgroundJob[];
  const fetcher = useFetcher() as any;
  const shopify = useAppBridge();

  const [expandedJobId, setExpandedJobId] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [typeFilter, setTypeFilter] = useState<string>('ALL');

  useEffect(() => {
    if (fetcher.data?.success) {
      if (fetcher.data.action === 'retryJob') {
        shopify.toast.show('Job scheduled for retry');
      } else if (fetcher.data.action === 'retryAllFailed') {
        shopify.toast.show(`Retrying ${fetcher.data.count} failed job(s)`);
      } else if (fetcher.data.action === 'deleteJob') {
        shopify.toast.show('Job deleted successfully');
      } else if (fetcher.data.action === 'clearCompleted') {
        shopify.toast.show(`Deleted ${fetcher.data.count} completed job(s)`);
      } else if (fetcher.data.action === 'triggerSync') {
        shopify.toast.show('Sync templates job enqueued');
      }
    } else if (fetcher.data?.error) {
      shopify.toast.show(`Error: ${fetcher.data.error}`);
    }
  }, [fetcher.data, shopify]);

  const handleRetryJob = (jobId: string) => {
    fetcher.submit({ actionType: 'retryJob', jobId }, { method: 'POST' });
  };

  const handleDeleteJob = (jobId: string) => {
    if (confirm('Are you sure you want to delete this job record?')) {
      fetcher.submit({ actionType: 'deleteJob', jobId }, { method: 'POST' });
    }
  };

  const handleRetryAllFailed = () => {
    fetcher.submit({ actionType: 'retryAllFailed' }, { method: 'POST' });
  };

  const handleClearCompleted = () => {
    if (confirm('Clear all completed job logs from the database?')) {
      fetcher.submit({ actionType: 'clearCompleted' }, { method: 'POST' });
    }
  };

  const handleTriggerSync = () => {
    fetcher.submit({ actionType: 'triggerSync' }, { method: 'POST' });
  };

  const getBadgeTone = (status: string) => {
    switch (status) {
      case 'COMPLETED':
        return 'success';
      case 'PROCESSING':
        return 'info';
      case 'PENDING':
        return 'warning';
      case 'FAILED':
        return 'critical';
      default:
        return undefined;
    }
  };

  const filteredJobs = jobs.filter((job) => {
    const matchesStatus = statusFilter === 'ALL' || job.status === statusFilter;
    const matchesType = typeFilter === 'ALL' || job.type === typeFilter;
    return matchesStatus && matchesType;
  });

  const uniqueJobTypes = Array.from(new Set(jobs.map((j) => j.type)));

  return (
    <s-page heading="Background Jobs Queue">
      <s-stack direction="block" gap="base">
        {/* Information Banner */}
        <s-banner tone="info" heading="Database Polling Queue Status">
          <s-paragraph>
            This dashboard displays background jobs processed by the local database-backed worker loop.
            Jobs are scheduled with exponential backoff on failure (up to 3 attempts max).
          </s-paragraph>
        </s-banner>

        {/* KPI stats cards */}
        <div style={{ width: '100%' }}>
          <s-stack direction="inline" gap="base">
            <div style={{ flex: 1, minWidth: '150px' }}>
              <s-box padding="base" borderWidth="base" borderRadius="base">
                <s-heading>Total Jobs</s-heading>
                <h2 style={{ fontSize: '2rem', margin: '0.5rem 0 0 0' }}>{stats.total}</h2>
              </s-box>
            </div>
            <div style={{ flex: 1, minWidth: '150px' }}>
              <s-box padding="base" borderWidth="base" borderRadius="base">
                <s-heading>Pending</s-heading>
                <h2 style={{ fontSize: '2rem', color: '#8e6100', margin: '0.5rem 0 0 0' }}>{stats.pending}</h2>
              </s-box>
            </div>
            <div style={{ flex: 1, minWidth: '150px' }}>
              <s-box padding="base" borderWidth="base" borderRadius="base">
                <s-heading>Processing</s-heading>
                <h2 style={{ fontSize: '2rem', color: '#005ea2', margin: '0.5rem 0 0 0' }}>{stats.processing}</h2>
              </s-box>
            </div>
            <div style={{ flex: 1, minWidth: '150px' }}>
              <s-box padding="base" borderWidth="base" borderRadius="base">
                <s-heading>Completed</s-heading>
                <h2 style={{ fontSize: '2rem', color: '#108548', margin: '0.5rem 0 0 0' }}>{stats.completed}</h2>
              </s-box>
            </div>
            <div style={{ flex: 1, minWidth: '150px' }}>
              <s-box padding="base" borderWidth="base" borderRadius="base">
                <s-heading>Failed</s-heading>
                <h2 style={{ fontSize: '2rem', color: '#bf0711', margin: '0.5rem 0 0 0' }}>{stats.failed}</h2>
              </s-box>
            </div>
          </s-stack>
        </div>

        {/* Global actions bar */}
        <s-box padding="base" background="subdued" borderWidth="base" borderRadius="base">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
            <s-stack direction="inline" gap="base">
              <s-button onClick={() => window.location.reload()}>Refresh Queue</s-button>
              <s-button onClick={handleTriggerSync} {...(fetcher.state === 'submitting' ? { loading: true } : {})}>
                Trigger Test Sync
              </s-button>
            </s-stack>
            <s-stack direction="inline" gap="base">
              {stats.failed > 0 && (
                <s-button onClick={handleRetryAllFailed} variant="primary">
                  Retry All Failed
                </s-button>
              )}
              {stats.completed > 0 && (
                <s-button onClick={handleClearCompleted} variant="tertiary">
                  Clear Completed Logs
                </s-button>
              )}
            </s-stack>
          </div>
        </s-box>

        {/* Search & Filters */}
        <s-section heading="Filter Queue Records">
          <s-stack direction="inline" gap="base">
            <s-select
              label="Filter by Status"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.currentTarget.value)}
            >
              <s-option value="ALL">All Statuses</s-option>
              <s-option value="PENDING">Pending</s-option>
              <s-option value="PROCESSING">Processing</s-option>
              <s-option value="COMPLETED">Completed</s-option>
              <s-option value="FAILED">Failed</s-option>
            </s-select>

            <s-select
              label="Filter by Type"
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.currentTarget.value)}
            >
              <s-option value="ALL">All Types</s-option>
              {uniqueJobTypes.map((type) => (
                <s-option key={type} value={type}>
                  {type}
                </s-option>
              ))}
            </s-select>
          </s-stack>
        </s-section>

        {/* Jobs Table */}
        <s-section heading="Queue Dispatch Log (Last 100)">
          {filteredJobs.length === 0 ? (
            <s-paragraph>No jobs found matching the selected filters.</s-paragraph>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                <thead>
                  <tr style={{ borderBottom: '2px solid #e1e3e5' }}>
                    <th style={{ padding: '12px 8px' }}>Job Type / ID</th>
                    <th style={{ padding: '12px 8px' }}>Status</th>
                    <th style={{ padding: '12px 8px' }}>Attempts</th>
                    <th style={{ padding: '12px 8px' }}>Timeline</th>
                    <th style={{ padding: '12px 8px', textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredJobs.map((job) => {
                    const isExpanded = expandedJobId === job.id;
                    return (
                      <tr key={job.id} style={{ borderBottom: '1px solid #e1e3e5' }}>
                        <td style={{ padding: '12px 8px' }}>
                          <div style={{ fontWeight: 'bold' }}>{job.type}</div>
                          <div style={{ fontSize: '0.75rem', color: '#6d7175', fontFamily: 'monospace' }}>
                            {job.id}
                          </div>
                        </td>
                        <td style={{ padding: '12px 8px' }}>
                          <s-badge tone={getBadgeTone(job.status)}>{job.status}</s-badge>
                        </td>
                        <td style={{ padding: '12px 8px' }}>
                          {job.attempts} / {job.maxAttempts}
                        </td>
                        <td style={{ padding: '12px 8px', fontSize: '0.875rem' }}>
                          <div>Created: {new Date(job.createdAt).toLocaleTimeString()}</div>
                          <div>Scheduled: {new Date(job.runAt).toLocaleTimeString()}</div>
                        </td>
                        <td style={{ padding: '12px 8px', textAlign: 'right' }}>
                          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                            <s-button onClick={() => setExpandedJobId(isExpanded ? null : job.id)} variant="tertiary">
                              {isExpanded ? 'Hide Payload' : 'Payload'}
                            </s-button>
                            {(job.status === 'FAILED' || job.status === 'PROCESSING') && (
                              <s-button onClick={() => handleRetryJob(job.id)} variant="primary">
                                Retry
                              </s-button>
                            )}
                            <s-button onClick={() => handleDeleteJob(job.id)} variant="tertiary">
                              Delete
                            </s-button>
                          </div>
                          {isExpanded && (
                            <div style={{ textAlign: 'left', marginTop: '8px', padding: '12px', background: '#f6f6f7', borderRadius: '4px', border: '1px solid #e1e3e5' }}>
                              <div style={{ fontWeight: 'bold', marginBottom: '4px', fontSize: '0.875rem' }}>Payload Data:</div>
                              <pre style={{ margin: 0, fontSize: '11px', whiteSpace: 'pre-wrap', fontFamily: 'monospace', background: '#ffffff', padding: '8px', borderRadius: '4px', border: '1px solid #e1e3e5' }}>
                                {JSON.stringify(job.payload, null, 2)}
                              </pre>
                              {job.errorMessage && (
                                <div style={{ marginTop: '8px' }}>
                                  <div style={{ fontWeight: 'bold', color: '#bf0711', fontSize: '0.875rem' }}>Error Detail:</div>
                                  <pre style={{ margin: 0, fontSize: '11px', whiteSpace: 'pre-wrap', fontFamily: 'monospace', color: '#bf0711', background: '#fff0f0', padding: '8px', borderRadius: '4px', border: '1px solid #fecdd3' }}>
                                    {job.errorMessage}
                                  </pre>
                                </div>
                              )}
                            </div>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </s-section>
      </s-stack>
    </s-page>
  );
}
