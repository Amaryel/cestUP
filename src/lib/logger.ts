export interface AuditLogEntry {
  id: string;
  timestamp: string;
  operation: 'SELECT' | 'INSERT' | 'UPDATE' | 'DELETE' | 'AUTH' | 'DIAGNOSTIC';
  table: string;
  recordId?: string;
  companyId?: string;
  userId?: string;
  success: boolean;
  details?: string;
  errorMessage?: string;
}

class SystemLogger {
  private logs: AuditLogEntry[] = [];
  private maxLogs = 200;

  public log(entry: Omit<AuditLogEntry, 'id' | 'timestamp'>) {
    const logItem: AuditLogEntry = {
      id: 'log_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7),
      timestamp: new Date().toISOString(),
      ...entry,
    };

    this.logs.unshift(logItem);
    if (this.logs.length > this.maxLogs) {
      this.logs.pop();
    }

    if (!entry.success) {
      console.error(
        `[AUDIT ERROR] [${entry.operation}] ${entry.table}${entry.recordId ? ` (ID: ${entry.recordId})` : ''}:`,
        entry.errorMessage || 'Falha na operação',
        `[Company: ${entry.companyId || 'N/A'}, User: ${entry.userId || 'N/A'}]`
      );
    } else {
      console.log(
        `[AUDIT SUCCESS] [${entry.operation}] ${entry.table}${entry.recordId ? ` (ID: ${entry.recordId})` : ''}`,
        entry.details || ''
      );
    }
  }

  public getLogs(): AuditLogEntry[] {
    return [...this.logs];
  }

  public clearLogs() {
    this.logs = [];
  }
}

export const logger = new SystemLogger();
