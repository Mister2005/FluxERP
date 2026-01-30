import nodemailer from 'nodemailer';
import type { Transporter, SendMailOptions } from 'nodemailer';

// ============================================
// EMAIL CONFIGURATION
// ============================================

interface EmailConfig {
  host: string;
  port: number;
  secure: boolean;
  auth: {
    user: string;
    pass: string;
  };
  from: string;
}

const getEmailConfig = (): EmailConfig => ({
  host: process.env.SMTP_HOST || 'smtp.gmail.com',
  port: parseInt(process.env.SMTP_PORT || '587', 10),
  secure: process.env.SMTP_SECURE === 'true',
  auth: {
    user: process.env.SMTP_USER || '',
    pass: process.env.SMTP_PASS || '',
  },
  from: process.env.SMTP_FROM || 'FluxERP <noreply@fluxerp.com>',
});

// Create transporter singleton
let transporter: Transporter | null = null;

const getTransporter = (): Transporter => {
  if (!transporter) {
    const config = getEmailConfig();
    transporter = nodemailer.createTransport({
      host: config.host,
      port: config.port,
      secure: config.secure,
      auth: config.auth,
    });
  }
  return transporter;
};

// ============================================
// EMAIL TYPES
// ============================================

export interface EmailRecipient {
  email: string;
  name?: string;
}

export interface EmailOptions {
  to: EmailRecipient | EmailRecipient[];
  subject: string;
  html: string;
  text?: string;
  cc?: EmailRecipient[];
  bcc?: EmailRecipient[];
  attachments?: Array<{
    filename: string;
    content: string | Buffer;
    contentType?: string;
  }>;
}

// ============================================
// EMAIL TEMPLATES
// ============================================

const baseTemplate = (content: string): string => `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>FluxERP Notification</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      line-height: 1.6;
      color: #333;
      background-color: #f5f5f5;
      margin: 0;
      padding: 0;
    }
    .container {
      max-width: 600px;
      margin: 0 auto;
      background-color: #ffffff;
      border-radius: 8px;
      overflow: hidden;
      box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
    }
    .header {
      background-color: #8D6E63;
      color: white;
      padding: 24px;
      text-align: center;
    }
    .header h1 {
      margin: 0;
      font-size: 24px;
      font-weight: 600;
    }
    .content {
      padding: 24px;
    }
    .content h2 {
      color: #3E2723;
      margin-top: 0;
    }
    .button {
      display: inline-block;
      background-color: #8D6E63;
      color: white !important;
      text-decoration: none;
      padding: 12px 24px;
      border-radius: 6px;
      margin: 16px 0;
      font-weight: 500;
    }
    .button:hover {
      background-color: #6D4C41;
    }
    .info-box {
      background-color: #f8f9fa;
      border-left: 4px solid #8D6E63;
      padding: 16px;
      margin: 16px 0;
      border-radius: 0 4px 4px 0;
    }
    .info-box p {
      margin: 4px 0;
    }
    .info-box strong {
      color: #3E2723;
    }
    .status-badge {
      display: inline-block;
      padding: 4px 12px;
      border-radius: 12px;
      font-size: 12px;
      font-weight: 600;
      text-transform: uppercase;
    }
    .status-pending { background-color: #FFF3E0; color: #E65100; }
    .status-approved { background-color: #E8F5E9; color: #2E7D32; }
    .status-rejected { background-color: #FFEBEE; color: #C62828; }
    .status-in-progress { background-color: #E3F2FD; color: #1565C0; }
    .status-completed { background-color: #E8F5E9; color: #2E7D32; }
    .footer {
      background-color: #f8f9fa;
      padding: 16px 24px;
      text-align: center;
      font-size: 12px;
      color: #666;
    }
    .footer a {
      color: #8D6E63;
      text-decoration: none;
    }
  </style>
</head>
<body>
  <div style="padding: 24px;">
    <div class="container">
      <div class="header">
        <h1>FluxERP</h1>
      </div>
      <div class="content">
        ${content}
      </div>
      <div class="footer">
        <p>This is an automated message from FluxERP.</p>
        <p><a href="${process.env.FRONTEND_URL || 'http://localhost:3000'}">Open FluxERP</a></p>
      </div>
    </div>
  </div>
</body>
</html>
`;

// ============================================
// ECO EMAIL TEMPLATES
// ============================================

export interface ECOEmailData {
  ecoId: string;
  ecoTitle: string;
  productName?: string;
  productSku?: string;
  status: string;
  priority: string;
  description?: string;
  requestedBy: string;
  reason?: string;
  link: string;
}

export const ecoCreatedTemplate = (data: ECOEmailData): string => {
  const content = `
    <h2>New Engineering Change Order Created</h2>
    <p>A new ECO has been created and requires your attention.</p>
    
    <div class="info-box">
      <p><strong>Title:</strong> ${data.ecoTitle}</p>
      <p><strong>Priority:</strong> <span class="status-badge status-${data.priority.toLowerCase()}">${data.priority}</span></p>
      ${data.productName ? `<p><strong>Product:</strong> ${data.productName} (${data.productSku})</p>` : ''}
      <p><strong>Requested By:</strong> ${data.requestedBy}</p>
      ${data.description ? `<p><strong>Description:</strong> ${data.description}</p>` : ''}
    </div>
    
    <a href="${data.link}" class="button">View ECO Details</a>
  `;
  return baseTemplate(content);
};

export const ecoStatusChangedTemplate = (data: ECOEmailData & { oldStatus: string; changedBy: string }): string => {
  const getStatusClass = (status: string) => {
    const statusMap: Record<string, string> = {
      draft: 'pending',
      pending: 'pending',
      'under review': 'in-progress',
      approved: 'approved',
      rejected: 'rejected',
      implemented: 'completed',
      closed: 'completed',
    };
    return statusMap[status.toLowerCase()] || 'pending';
  };

  const content = `
    <h2>ECO Status Updated</h2>
    <p>The status of an Engineering Change Order has been updated.</p>
    
    <div class="info-box">
      <p><strong>Title:</strong> ${data.ecoTitle}</p>
      <p><strong>Status Change:</strong> 
        <span class="status-badge status-${getStatusClass(data.oldStatus)}">${data.oldStatus}</span>
        → 
        <span class="status-badge status-${getStatusClass(data.status)}">${data.status}</span>
      </p>
      <p><strong>Changed By:</strong> ${data.changedBy}</p>
      ${data.productName ? `<p><strong>Product:</strong> ${data.productName}</p>` : ''}
    </div>
    
    <a href="${data.link}" class="button">View ECO Details</a>
  `;
  return baseTemplate(content);
};

export const ecoAssignedTemplate = (data: ECOEmailData & { assignedTo: string; assignedBy: string }): string => {
  const content = `
    <h2>ECO Assigned to You</h2>
    <p>You have been assigned to review an Engineering Change Order.</p>
    
    <div class="info-box">
      <p><strong>Title:</strong> ${data.ecoTitle}</p>
      <p><strong>Priority:</strong> <span class="status-badge status-${data.priority.toLowerCase()}">${data.priority}</span></p>
      ${data.productName ? `<p><strong>Product:</strong> ${data.productName}</p>` : ''}
      <p><strong>Assigned By:</strong> ${data.assignedBy}</p>
      ${data.description ? `<p><strong>Description:</strong> ${data.description}</p>` : ''}
    </div>
    
    <a href="${data.link}" class="button">Review ECO</a>
  `;
  return baseTemplate(content);
};

// ============================================
// WORK ORDER EMAIL TEMPLATES
// ============================================

export interface WorkOrderEmailData {
  workOrderId: string;
  workOrderName?: string;
  productName: string;
  productSku: string;
  status: string;
  priority: string;
  quantity: number;
  scheduledStart?: string;
  scheduledEnd?: string;
  link: string;
}

export const workOrderCreatedTemplate = (data: WorkOrderEmailData): string => {
  const content = `
    <h2>New Work Order Created</h2>
    <p>A new work order has been created.</p>
    
    <div class="info-box">
      ${data.workOrderName ? `<p><strong>Name:</strong> ${data.workOrderName}</p>` : ''}
      <p><strong>Product:</strong> ${data.productName} (${data.productSku})</p>
      <p><strong>Quantity:</strong> ${data.quantity}</p>
      <p><strong>Priority:</strong> <span class="status-badge status-${data.priority.toLowerCase()}">${data.priority}</span></p>
      ${data.scheduledStart ? `<p><strong>Scheduled Start:</strong> ${data.scheduledStart}</p>` : ''}
      ${data.scheduledEnd ? `<p><strong>Scheduled End:</strong> ${data.scheduledEnd}</p>` : ''}
    </div>
    
    <a href="${data.link}" class="button">View Work Order</a>
  `;
  return baseTemplate(content);
};

export const workOrderStatusChangedTemplate = (data: WorkOrderEmailData & { oldStatus: string; changedBy: string }): string => {
  const getStatusClass = (status: string) => {
    const statusMap: Record<string, string> = {
      draft: 'pending',
      scheduled: 'pending',
      'in progress': 'in-progress',
      'in-progress': 'in-progress',
      completed: 'completed',
      cancelled: 'rejected',
      'on hold': 'pending',
    };
    return statusMap[status.toLowerCase()] || 'pending';
  };

  const content = `
    <h2>Work Order Status Updated</h2>
    <p>The status of a work order has been updated.</p>
    
    <div class="info-box">
      ${data.workOrderName ? `<p><strong>Name:</strong> ${data.workOrderName}</p>` : ''}
      <p><strong>Product:</strong> ${data.productName}</p>
      <p><strong>Status Change:</strong> 
        <span class="status-badge status-${getStatusClass(data.oldStatus)}">${data.oldStatus}</span>
        → 
        <span class="status-badge status-${getStatusClass(data.status)}">${data.status}</span>
      </p>
      <p><strong>Changed By:</strong> ${data.changedBy}</p>
    </div>
    
    <a href="${data.link}" class="button">View Work Order</a>
  `;
  return baseTemplate(content);
};

// ============================================
// GENERAL NOTIFICATION TEMPLATE
// ============================================

export interface NotificationEmailData {
  title: string;
  message: string;
  actionText?: string;
  actionLink?: string;
  details?: Record<string, string>;
}

export const notificationTemplate = (data: NotificationEmailData): string => {
  const detailsHtml = data.details
    ? `<div class="info-box">${Object.entries(data.details)
        .map(([key, value]) => `<p><strong>${key}:</strong> ${value}</p>`)
        .join('')}</div>`
    : '';

  const actionHtml = data.actionText && data.actionLink
    ? `<a href="${data.actionLink}" class="button">${data.actionText}</a>`
    : '';

  const content = `
    <h2>${data.title}</h2>
    <p>${data.message}</p>
    ${detailsHtml}
    ${actionHtml}
  `;
  return baseTemplate(content);
};

// ============================================
// EMAIL SERVICE FUNCTIONS
// ============================================

/**
 * Send an email
 */
export async function sendEmail(options: EmailOptions): Promise<boolean> {
  const config = getEmailConfig();
  
  // Skip sending in test mode or if SMTP is not configured
  if (process.env.NODE_ENV === 'test' || !config.auth.user || !config.auth.pass) {
    console.log('[Email] Skipping email send (test mode or SMTP not configured)');
    console.log('[Email] Would send to:', options.to);
    console.log('[Email] Subject:', options.subject);
    return true;
  }

  try {
    const transport = getTransporter();

    const toAddresses = Array.isArray(options.to)
      ? options.to.map((r) => (r.name ? `"${r.name}" <${r.email}>` : r.email)).join(', ')
      : options.to.name
      ? `"${options.to.name}" <${options.to.email}>`
      : options.to.email;

    const mailOptions: SendMailOptions = {
      from: config.from,
      to: toAddresses,
      subject: options.subject,
      html: options.html,
      text: options.text || options.subject,
    };

    if (options.cc) {
      mailOptions.cc = options.cc.map((r) => (r.name ? `"${r.name}" <${r.email}>` : r.email)).join(', ');
    }

    if (options.bcc) {
      mailOptions.bcc = options.bcc.map((r) => (r.name ? `"${r.name}" <${r.email}>` : r.email)).join(', ');
    }

    if (options.attachments) {
      mailOptions.attachments = options.attachments;
    }

    await transport.sendMail(mailOptions);
    console.log('[Email] Sent successfully to:', toAddresses);
    return true;
  } catch (error) {
    console.error('[Email] Failed to send:', error);
    return false;
  }
}

/**
 * Send ECO created notification
 */
export async function sendECOCreatedEmail(
  recipients: EmailRecipient[],
  data: ECOEmailData
): Promise<boolean> {
  return sendEmail({
    to: recipients,
    subject: `[FluxERP] New ECO Created: ${data.ecoTitle}`,
    html: ecoCreatedTemplate(data),
  });
}

/**
 * Send ECO status change notification
 */
export async function sendECOStatusChangedEmail(
  recipients: EmailRecipient[],
  data: ECOEmailData & { oldStatus: string; changedBy: string }
): Promise<boolean> {
  return sendEmail({
    to: recipients,
    subject: `[FluxERP] ECO Status Updated: ${data.ecoTitle}`,
    html: ecoStatusChangedTemplate(data),
  });
}

/**
 * Send ECO assignment notification
 */
export async function sendECOAssignedEmail(
  recipient: EmailRecipient,
  data: ECOEmailData & { assignedTo: string; assignedBy: string }
): Promise<boolean> {
  return sendEmail({
    to: recipient,
    subject: `[FluxERP] ECO Assigned to You: ${data.ecoTitle}`,
    html: ecoAssignedTemplate(data),
  });
}

/**
 * Send work order created notification
 */
export async function sendWorkOrderCreatedEmail(
  recipients: EmailRecipient[],
  data: WorkOrderEmailData
): Promise<boolean> {
  return sendEmail({
    to: recipients,
    subject: `[FluxERP] New Work Order: ${data.productName}`,
    html: workOrderCreatedTemplate(data),
  });
}

/**
 * Send work order status change notification
 */
export async function sendWorkOrderStatusChangedEmail(
  recipients: EmailRecipient[],
  data: WorkOrderEmailData & { oldStatus: string; changedBy: string }
): Promise<boolean> {
  return sendEmail({
    to: recipients,
    subject: `[FluxERP] Work Order Status Updated: ${data.productName}`,
    html: workOrderStatusChangedTemplate(data),
  });
}

/**
 * Send generic notification email
 */
export async function sendNotificationEmail(
  recipients: EmailRecipient[],
  data: NotificationEmailData
): Promise<boolean> {
  return sendEmail({
    to: recipients,
    subject: `[FluxERP] ${data.title}`,
    html: notificationTemplate(data),
  });
}

/**
 * Verify SMTP connection
 */
export async function verifyEmailConnection(): Promise<boolean> {
  const config = getEmailConfig();
  
  if (!config.auth.user || !config.auth.pass) {
    console.log('[Email] SMTP not configured');
    return false;
  }

  try {
    const transport = getTransporter();
    await transport.verify();
    console.log('[Email] SMTP connection verified');
    return true;
  } catch (error) {
    console.error('[Email] SMTP connection failed:', error);
    return false;
  }
}
