import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';
import { formatInEST } from '@/components/dateFormatter';
import { 
  Search, 
  Filter, 
  Download, 
  ChevronDown, 
  Check, 
  X, 
  AlertCircle,
  Plus,
  Trash2,
  Edit2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';

export default function AuditLogPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [actionFilter, setActionFilter] = useState('all');
  const [entityFilter, setEntityFilter] = useState('all');
  const [userFilter, setUserFilter] = useState('all');
  const [departmentFilter, setDepartmentFilter] = useState('all');
  const [sortBy, setSortBy] = useState('-created_date');
  const [expanded, setExpanded] = useState(null);

  const { data: auditLogs = [], isLoading, error } = useQuery({
    queryKey: ['auditlogs', { searchTerm, actionFilter, entityFilter, userFilter, departmentFilter, sortBy }],
    queryFn: async () => {
      const query = {};
      
      if (searchTerm) {
        // Search across multiple fields
        const allLogs = await base44.entities.AuditLog.filter({}, sortBy, 1000);
        return allLogs.filter(log =>
          log.entity_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          log.user_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          log.user_email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          log.details?.toLowerCase().includes(searchTerm.toLowerCase())
        );
      }
      
      if (actionFilter !== 'all') query.action = actionFilter;
      if (entityFilter !== 'all') query.entity_type = entityFilter;
      if (userFilter !== 'all') query.user_id = userFilter;
      if (departmentFilter !== 'all') query.department = departmentFilter;

      return base44.entities.AuditLog.filter(query, sortBy, 500);
    },
    refetchInterval: 5000, // Auto-refresh every 5 seconds
  });

  const { data: users = [] } = useQuery({
    queryKey: ['users-audit'],
    queryFn: () => base44.entities.User.list()
  });

  const actionColors = {
    create: 'bg-green-100 text-green-800',
    update: 'bg-blue-100 text-blue-800',
    delete: 'bg-red-100 text-red-800',
    login: 'bg-purple-100 text-purple-800',
    logout: 'bg-gray-100 text-gray-800',
    settings_change: 'bg-amber-100 text-amber-800',
    invite_user: 'bg-indigo-100 text-indigo-800',
    default: 'bg-slate-100 text-slate-800'
  };

  const actionIcons = {
    create: <Plus className="w-4 h-4" />,
    update: <Edit2 className="w-4 h-4" />,
    delete: <X className="w-4 h-4" />,
    login: <Check className="w-4 h-4" />,
    logout: <X className="w-4 h-4" />,
    settings_change: <AlertCircle className="w-4 h-4" />,
    invite_user: <Plus className="w-4 h-4" />
  };

  const uniqueActions = [...new Set(auditLogs.map(log => log.action))];
  const uniqueEntityTypes = [...new Set(auditLogs.map(log => log.entity_type))];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Audit Log</h1>
          <p className="text-slate-500 mt-1">Track all system actions and changes</p>
        </div>
        <Button variant="outline" className="gap-2">
          <Download className="w-4 h-4" />
          Export
        </Button>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl border border-slate-200 p-6 space-y-4">
        <div className="flex gap-4 flex-wrap">
          <div className="flex-1 min-w-64">
            <label className="text-sm font-medium text-slate-700 block mb-2">Search</label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input
                placeholder="Search by name, email, or details..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div>
            <label className="text-sm font-medium text-slate-700 block mb-2">Action</label>
            <Select value={actionFilter} onValueChange={setActionFilter}>
              <SelectTrigger>
                <SelectValue placeholder="All actions" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All actions</SelectItem>
                {uniqueActions.map(action => (
                  <SelectItem key={action} value={action}>
                    {action}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className="text-sm font-medium text-slate-700 block mb-2">Entity Type</label>
            <Select value={entityFilter} onValueChange={setEntityFilter}>
              <SelectTrigger>
                <SelectValue placeholder="All entities" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All entities</SelectItem>
                {uniqueEntityTypes.map(type => (
                  <SelectItem key={type} value={type}>
                    {type}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className="text-sm font-medium text-slate-700 block mb-2">User</label>
            <Select value={userFilter} onValueChange={setUserFilter}>
              <SelectTrigger>
                <SelectValue placeholder="All users" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All users</SelectItem>
                {[...new Set(auditLogs.map(log => log.user_id))].map(userId => {
                  const log = auditLogs.find(l => l.user_id === userId);
                  return (
                    <SelectItem key={userId} value={userId}>
                      {log?.user_name}
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className="text-sm font-medium text-slate-700 block mb-2">Sort</label>
            <Select value={sortBy} onValueChange={setSortBy}>
              <SelectTrigger>
                <SelectValue placeholder="Sort by" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="-created_date">Newest First</SelectItem>
                <SelectItem value="created_date">Oldest First</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* Results */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        {isLoading ? (
          <div className="flex items-center justify-center p-12">
            <div className="flex flex-col items-center gap-3">
              <div className="w-8 h-8 border-4 border-slate-200 border-t-slate-600 rounded-full animate-spin" />
              <p className="text-slate-500">Loading audit logs...</p>
            </div>
          </div>
        ) : auditLogs.length === 0 ? (
          <div className="flex items-center justify-center p-12">
            <div className="text-center">
              <AlertCircle className="w-12 h-12 mx-auto mb-3 text-slate-300" />
              <p className="text-slate-500">No audit logs found</p>
            </div>
          </div>
        ) : (
          <div className="divide-y divide-slate-200">
            {auditLogs.map((log) => (
              <div key={log.id} className="hover:bg-slate-50 transition-colors">
                <button
                  onClick={() => setExpanded(expanded === log.id ? null : log.id)}
                  className="w-full text-left p-4 flex items-center justify-between gap-4"
                >
                  <div className="flex-1 min-w-0 flex items-center gap-4">
                    <Badge className={cn(
                      'shrink-0 flex items-center gap-1.5',
                      actionColors[log.action] || actionColors.default
                    )}>
                      {actionIcons[log.action]}
                      {log.action}
                    </Badge>
                    
                    <div className="flex-1 min-w-0">
                      <h3 className="font-medium text-slate-900 truncate">
                        {log.entity_name || log.entity_id}
                      </h3>
                      <div className="flex items-center gap-2 text-sm text-slate-500 mt-1">
                        <span>{log.user_name}</span>
                        <span>•</span>
                        <span>{log.entity_type}</span>
                        <span>•</span>
                        <span className="text-slate-400">{formatInEST(log.created_date)}</span>
                      </div>
                    </div>
                  </div>

                  <ChevronDown className={cn(
                    "w-5 h-5 text-slate-400 shrink-0 transition-transform",
                    expanded === log.id && "rotate-180"
                  )} />
                </button>

                {expanded === log.id && (
                  <div className="bg-slate-50 p-4 border-t border-slate-200 space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-xs font-medium text-slate-600 uppercase tracking-wider">User</p>
                        <p className="text-sm text-slate-900 mt-1">{log.user_name}</p>
                        {log.user_email && (
                          <p className="text-xs text-slate-500">{log.user_email}</p>
                        )}
                        {log.user_role && (
                          <p className="text-xs text-slate-500 capitalize">{log.user_role}</p>
                        )}
                      </div>
                      <div>
                        <p className="text-xs font-medium text-slate-600 uppercase tracking-wider">Timestamp</p>
                        <p className="text-sm text-slate-900 mt-1">{formatInEST(log.created_date)}</p>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-xs font-medium text-slate-600 uppercase tracking-wider">Entity</p>
                        <p className="text-sm text-slate-900 mt-1">{log.entity_type}</p>
                        {log.entity_id && (
                          <p className="text-xs text-slate-500 font-mono break-all">{log.entity_id}</p>
                        )}
                      </div>
                      <div>
                        <p className="text-xs font-medium text-slate-600 uppercase tracking-wider">Department</p>
                        <p className="text-sm text-slate-900 mt-1 capitalize">{log.department}</p>
                      </div>
                    </div>

                    {log.details && (
                      <div>
                        <p className="text-xs font-medium text-slate-600 uppercase tracking-wider">Details</p>
                        <p className="text-sm text-slate-900 mt-1">{log.details}</p>
                      </div>
                    )}

                    {(log.old_value || log.new_value) && (
                      <div className="bg-white rounded-lg p-3 space-y-2 border border-slate-200">
                        <p className="text-xs font-medium text-slate-600 uppercase tracking-wider">Changes</p>
                        {log.old_value && (
                          <div>
                            <p className="text-xs text-slate-600">Old Value:</p>
                            <p className="text-sm font-mono text-red-600 bg-red-50 p-2 rounded mt-1 break-all">{log.old_value}</p>
                          </div>
                        )}
                        {log.new_value && (
                          <div>
                            <p className="text-xs text-slate-600">New Value:</p>
                            <p className="text-sm font-mono text-green-600 bg-green-50 p-2 rounded mt-1 break-all">{log.new_value}</p>
                          </div>
                        )}
                      </div>
                    )}

                    {(log.ip_address || log.device_info) && (
                      <div className="bg-white rounded-lg p-3 border border-slate-200 space-y-2">
                        <p className="text-xs font-medium text-slate-600 uppercase tracking-wider">Request Info</p>
                        {log.ip_address && (
                          <div className="flex justify-between">
                            <span className="text-xs text-slate-600">IP Address:</span>
                            <span className="text-xs font-mono text-slate-900">{log.ip_address}</span>
                          </div>
                        )}
                        {log.device_info && (
                          <div className="flex justify-between">
                            <span className="text-xs text-slate-600">Device:</span>
                            <span className="text-xs text-slate-900">{log.device_info}</span>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Results count */}
        {!isLoading && auditLogs.length > 0 && (
          <div className="px-4 py-3 bg-slate-50 border-t border-slate-200 text-sm text-slate-600">
            Showing {auditLogs.length} audit log entries
          </div>
        )}
      </div>
    </div>
  );
}