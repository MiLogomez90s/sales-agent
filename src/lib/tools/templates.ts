import { ToolConfig } from '@/lib/db/types';

export interface ToolTemplate {
  id: string;
  name: string;
  description: string;
  category: 'crm' | 'data' | 'scheduling' | 'communication' | 'analytics';
  type: 'http' | 'webhook';
  config: ToolConfig;
  defaultName: string;
  defaultDescription: string;
}

export const TOOL_TEMPLATES: ToolTemplate[] = [
  // CRM
  {
    id: 'tpl_add_contact_crm',
    name: 'Add Contact to CRM',
    description: 'Creates a new contact/lead in the CRM system',
    category: 'crm',
    type: 'http',
    defaultName: 'add_contact_crm',
    defaultDescription: 'Creates a new contact in the CRM with name, email, phone, and company',
    config: {
      method: 'POST',
      url: 'https://your-crm.com/api/v1/contacts',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer YOUR_CRM_TOKEN',
      },
      body_template: JSON.stringify({
        name: '{{name}}',
        email: '{{email}}',
        phone: '{{phone}}',
        company: '{{company}}',
        source: 'sales_agent',
      }, null, 2),
    } as ToolConfig,
  },
  {
    id: 'tpl_update_deal',
    name: 'Update Deal Status',
    description: 'Updates the status of a deal/opportunity in the CRM',
    category: 'crm',
    type: 'http',
    defaultName: 'update_deal_status',
    defaultDescription: 'Updates a deal stage, value, or status in the CRM',
    config: {
      method: 'PUT',
      url: 'https://your-crm.com/api/v1/deals/{{deal_id}}',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer YOUR_CRM_TOKEN',
      },
      body_template: JSON.stringify({
        stage: '{{stage}}',
        value: '{{value}}',
        notes: '{{notes}}',
      }, null, 2),
    } as ToolConfig,
  },
  {
    id: 'tpl_get_contact_info',
    name: 'Get Contact Info',
    description: 'Retrieves contact details from the CRM by email or phone',
    category: 'crm',
    type: 'http',
    defaultName: 'get_contact_info',
    defaultDescription: 'Fetches contact details from CRM using email or phone number',
    config: {
      method: 'GET',
      url: 'https://your-crm.com/api/v1/contacts?email={{email}}',
      headers: {
        Authorization: 'Bearer YOUR_CRM_TOKEN',
      },
    } as ToolConfig,
  },

  // Data
  {
    id: 'tpl_search_leads',
    name: 'Search Leads',
    description: 'Searches for leads in the database or CRM by criteria',
    category: 'data',
    type: 'http',
    defaultName: 'search_leads',
    defaultDescription: 'Searches for leads matching criteria like city, industry, or status',
    config: {
      method: 'GET',
      url: 'https://your-crm.com/api/v1/leads?city={{city}}&industry={{industry}}&status={{status}}',
      headers: {
        Authorization: 'Bearer YOUR_CRM_TOKEN',
      },
    } as ToolConfig,
  },
  {
    id: 'tpl_analyze_lead',
    name: 'Analyze Lead',
    description: 'Analyzes a lead profile and returns insights (score, intent, recommendations)',
    category: 'data',
    type: 'http',
    defaultName: 'analyze_lead',
    defaultDescription: 'Analyzes lead data and returns a score, buying intent, and recommended approach',
    config: {
      method: 'POST',
      url: 'https://your-analytics.com/api/v1/analyze',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer YOUR_ANALYTICS_TOKEN',
      },
      body_template: JSON.stringify({
        lead_id: '{{lead_id}}',
        email: '{{email}}',
        company: '{{company}}',
        source: '{{source}}',
      }, null, 2),
    } as ToolConfig,
  },
  {
    id: 'tpl_get_company_data',
    name: 'Get Company Data',
    description: 'Fetches company information from external data sources',
    category: 'data',
    type: 'http',
    defaultName: 'get_company_data',
    defaultDescription: 'Retrieves company size, industry, revenue, and contact info from data providers',
    config: {
      method: 'GET',
      url: 'https://api.clearbit.com/v2/companies/find?domain={{domain}}',
      headers: {
        Authorization: 'Bearer YOUR_CLEARBIT_TOKEN',
      },
    } as ToolConfig,
  },

  // Scheduling
  {
    id: 'tpl_schedule_meeting',
    name: 'Schedule Meeting',
    description: 'Books a meeting/appointment in the calendar',
    category: 'scheduling',
    type: 'http',
    defaultName: 'schedule_meeting',
    defaultDescription: 'Creates a calendar event for a meeting with the client',
    config: {
      method: 'POST',
      url: 'https://your-calendar.com/api/v1/events',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer YOUR_CALENDAR_TOKEN',
      },
      body_template: JSON.stringify({
        title: 'Sales Meeting - {{client_name}}',
        start_time: '{{start_time}}',
        end_time: '{{end_time}}',
        attendees: ['{{email}}'],
        description: 'Meeting scheduled by sales agent',
      }, null, 2),
    } as ToolConfig,
  },
  {
    id: 'tpl_check_availability',
    name: 'Check Availability',
    description: 'Checks available time slots in the calendar',
    category: 'scheduling',
    type: 'http',
    defaultName: 'check_availability',
    defaultDescription: 'Returns available time slots for scheduling a meeting',
    config: {
      method: 'GET',
      url: 'https://your-calendar.com/api/v1/availability?date={{date}}&duration={{duration}}',
      headers: {
        Authorization: 'Bearer YOUR_CALENDAR_TOKEN',
      },
    } as ToolConfig,
  },

  // Communication
  {
    id: 'tpl_send_whatsapp',
    name: 'Send WhatsApp Message',
    description: 'Sends a WhatsApp message to a phone number',
    category: 'communication',
    type: 'http',
    defaultName: 'send_whatsapp',
    defaultDescription: 'Sends a WhatsApp message to the client',
    config: {
      method: 'POST',
      url: 'https://your-whatsapp-api.com/v1/messages',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer YOUR_WHATSAPP_TOKEN',
      },
      body_template: JSON.stringify({
        to: '{{phone}}',
        body: '{{message}}',
      }, null, 2),
    } as ToolConfig,
  },
  {
    id: 'tpl_send_email',
    name: 'Send Email',
    description: 'Sends an email to a contact',
    category: 'communication',
    type: 'http',
    defaultName: 'send_email',
    defaultDescription: 'Sends an email with subject and body to the client',
    config: {
      method: 'POST',
      url: 'https://your-email-api.com/v1/send',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer YOUR_EMAIL_TOKEN',
      },
      body_template: JSON.stringify({
        to: '{{email}}',
        subject: '{{subject}}',
        body: '{{body}}',
      }, null, 2),
    } as ToolConfig,
  },

  // Analytics
  {
    id: 'tpl_get_sales_metrics',
    name: 'Get Sales Metrics',
    description: 'Retrieves sales KPIs and metrics for a period',
    category: 'analytics',
    type: 'http',
    defaultName: 'get_sales_metrics',
    defaultDescription: 'Fetches sales metrics like conversion rate, pipeline value, and closed deals',
    config: {
      method: 'GET',
      url: 'https://your-analytics.com/v1/metrics?period={{period}}&team={{team}}',
      headers: {
        Authorization: 'Bearer YOUR_ANALYTICS_TOKEN',
      },
    } as ToolConfig,
  },
  {
    id: 'tpl_webhook_crm_update',
    name: 'CRM Update Webhook',
    description: 'Receives webhook notifications when a contact or deal is updated in the CRM',
    category: 'crm',
    type: 'webhook',
    defaultName: 'webhook_crm_update',
    defaultDescription: 'Listens for CRM events like contact updates, deal changes, or new leads',
    config: {
      trigger_description:
        'External CRM systems call this webhook when a contact is created, updated, or a deal changes status',
    } as ToolConfig,
  },
  {
    id: 'tpl_webhook_new_lead',
    name: 'New Lead Webhook',
    description: 'Receives webhook notifications when a new lead comes from external sources',
    category: 'crm',
    type: 'webhook',
    defaultName: 'webhook_new_lead',
    defaultDescription:
      'Listens for new lead notifications from landing pages, Facebook Ads, or other sources',
    config: {
      trigger_description:
        'External systems call this webhook when a new lead is captured (e.g., form submission, ad click)',
    } as ToolConfig,
  },
];

export function getTemplatesByCategory(category: ToolTemplate['category']): ToolTemplate[] {
  return TOOL_TEMPLATES.filter((t) => t.category === category);
}

export function getTemplateById(id: string): ToolTemplate | undefined {
  return TOOL_TEMPLATES.find((t) => t.id === id);
}

export const TEMPLATE_CATEGORIES: Array<{ id: ToolTemplate['category']; label: string }> = [
  { id: 'crm', label: 'CRM & Contacts' },
  { id: 'data', label: 'Data & Research' },
  { id: 'scheduling', label: 'Scheduling' },
  { id: 'communication', label: 'Communication' },
  { id: 'analytics', label: 'Analytics' },
];
