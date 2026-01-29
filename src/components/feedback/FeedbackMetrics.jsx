import React, { useMemo } from 'react';
import { BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { TrendingUp, Clock, CheckCircle, Target } from 'lucide-react';
import { format, subDays, eachDayOfInterval, startOfDay } from 'date-fns';

const COLORS = ['#3b82f6', '#f59e0b', '#10b981', '#64748b'];

export default function FeedbackMetrics({ feedback }) {
  const metrics = useMemo(() => {
    // Category distribution
    const categoryData = [
      { name: 'Bug Report', value: feedback.filter(f => f.category === 'Bug Report').length },
      { name: 'Feature Request', value: feedback.filter(f => f.category === 'Feature Request').length },
      { name: 'UI/UX', value: feedback.filter(f => f.category === 'UI/UX Improvement').length },
      { name: 'Other', value: feedback.filter(f => f.category === 'Other').length },
    ].filter(d => d.value > 0);

    // App distribution
    const appData = [
      { name: 'Sales', value: feedback.filter(f => f.app_id === 'sales').length },
      { name: 'Social', value: feedback.filter(f => f.app_id === 'social').length },
      { name: 'Admin', value: feedback.filter(f => f.app_id === 'admin').length },
    ].filter(d => d.value > 0);

    // Trends over last 30 days
    const last30Days = eachDayOfInterval({
      start: subDays(new Date(), 29),
      end: new Date()
    });

    const trendData = last30Days.map(day => {
      const dayStart = startOfDay(day);
      const daySubmitted = feedback.filter(f => {
        const createdDate = startOfDay(new Date(f.created_date));
        return createdDate.getTime() === dayStart.getTime();
      }).length;

      const dayCompleted = feedback.filter(f => {
        if (!f.completed_at) return false;
        const completedDate = startOfDay(new Date(f.completed_at));
        return completedDate.getTime() === dayStart.getTime();
      }).length;

      return {
        date: format(day, 'MMM d'),
        submitted: daySubmitted,
        completed: dayCompleted
      };
    });

    // Resolution rate
    const total = feedback.length;
    const resolved = feedback.filter(f => f.status === 'Completed').length;
    const resolutionRate = total > 0 ? Math.round((resolved / total) * 100) : 0;

    // Average time to complete (for completed items with completed_at)
    const completedItems = feedback.filter(f => f.status === 'Completed' && f.completed_at);
    let avgDays = 0;
    if (completedItems.length > 0) {
      const totalDays = completedItems.reduce((sum, item) => {
        const created = new Date(item.created_date);
        const completed = new Date(item.completed_at);
        const days = Math.ceil((completed - created) / (1000 * 60 * 60 * 24));
        return sum + days;
      }, 0);
      avgDays = Math.round(totalDays / completedItems.length);
    }

    // Priority breakdown
    const priorityData = [
      { name: 'High', value: feedback.filter(f => f.priority === 'high').length },
      { name: 'Medium', value: feedback.filter(f => f.priority === 'medium').length },
      { name: 'Low', value: feedback.filter(f => f.priority === 'low').length },
    ].filter(d => d.value > 0);

    return { categoryData, appData, trendData, resolutionRate, avgDays, priorityData };
  }, [feedback]);

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-6 mb-6">
      <h2 className="text-lg font-semibold text-slate-900 mb-6">Feedback Analytics</h2>
      
      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-gradient-to-br from-blue-50 to-blue-100/50 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp className="w-4 h-4 text-blue-600" />
            <span className="text-sm font-medium text-blue-900">Total Feedback</span>
          </div>
          <p className="text-3xl font-bold text-blue-600">{feedback.length}</p>
        </div>
        
        <div className="bg-gradient-to-br from-emerald-50 to-emerald-100/50 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-2">
            <CheckCircle className="w-4 h-4 text-emerald-600" />
            <span className="text-sm font-medium text-emerald-900">Resolution Rate</span>
          </div>
          <p className="text-3xl font-bold text-emerald-600">{metrics.resolutionRate}%</p>
        </div>
        
        <div className="bg-gradient-to-br from-amber-50 to-amber-100/50 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-2">
            <Clock className="w-4 h-4 text-amber-600" />
            <span className="text-sm font-medium text-amber-900">Avg. Resolution</span>
          </div>
          <p className="text-3xl font-bold text-amber-600">{metrics.avgDays} days</p>
        </div>

        <div className="bg-gradient-to-br from-purple-50 to-purple-100/50 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-2">
            <Target className="w-4 h-4 text-purple-600" />
            <span className="text-sm font-medium text-purple-900">High Priority</span>
          </div>
          <p className="text-3xl font-bold text-purple-600">
            {feedback.filter(f => f.priority === 'high').length}
          </p>
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Trends */}
        <div>
          <h3 className="text-sm font-semibold text-slate-700 mb-3">30-Day Trend</h3>
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={metrics.trendData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="date" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip />
              <Legend />
              <Line type="monotone" dataKey="submitted" stroke="#3b82f6" strokeWidth={2} name="Submitted" />
              <Line type="monotone" dataKey="completed" stroke="#10b981" strokeWidth={2} name="Completed" />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Category Distribution */}
        <div>
          <h3 className="text-sm font-semibold text-slate-700 mb-3">By Category</h3>
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie
                data={metrics.categoryData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                outerRadius={80}
                fill="#8884d8"
                dataKey="value"
              >
                {metrics.categoryData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Additional Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* App Distribution */}
        <div>
          <h3 className="text-sm font-semibold text-slate-700 mb-3">By App</h3>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={metrics.appData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="name" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip />
              <Bar dataKey="value" fill="#3b82f6" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Priority Distribution */}
        <div>
          <h3 className="text-sm font-semibold text-slate-700 mb-3">By Priority</h3>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={metrics.priorityData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="name" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip />
              <Bar dataKey="value" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}