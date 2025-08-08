'use client';

/**
 * System Health Dashboard Component
 * 
 * Provides real-time monitoring of system health, metrics, and alerts
 * for operational visibility and debugging.
 */

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';

interface HealthMetric {
  name: string;
  value: number;
  unit: string;
  status: 'healthy' | 'warning' | 'critical';
  timestamp: string;
  details?: Record<string, any>;
}

interface HealthAlert {
  id: string;
  severity: 'info' | 'warning' | 'error' | 'critical';
  message: string;
  timestamp: string;
  component: string;
  resolved: boolean;
}

interface SystemHealthData {
  overall: 'healthy' | 'warning' | 'critical';
  metrics: HealthMetric[];
  alerts: HealthAlert[];
  circuitBreakers: Record<string, any>;
}

export default function SystemHealthDashboard() {
  const [healthData, setHealthData] = useState<SystemHealthData | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'overview' | 'metrics' | 'alerts' | 'circuit-breakers'>('overview');

  useEffect(() => {
    fetchHealthData();
    const interval = setInterval(fetchHealthData, 30000); // Refresh every 30 seconds
    return () => clearInterval(interval);
  }, []);

  const fetchHealthData = async () => {
    try {
      const response = await fetch('/api/admin/system-health?action=metrics');
      const data = await response.json();
      
      if (data.ok) {
        setHealthData({
          overall: determineOverallHealth(data.entities.metrics),
          metrics: data.entities.metrics,
          alerts: [], // Will be fetched separately
          circuitBreakers: data.entities.circuitBreakers
        });
      }
    } catch (error) {
      console.error('Error fetching health data:', error);
    } finally {
      setLoading(false);
    }
  };

  const determineOverallHealth = (metrics: HealthMetric[]): 'healthy' | 'warning' | 'critical' => {
    const criticalCount = metrics.filter(m => m.status === 'critical').length;
    const warningCount = metrics.filter(m => m.status === 'warning').length;
    
    if (criticalCount > 0) return 'critical';
    if (warningCount > 0) return 'warning';
    return 'healthy';
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'healthy': return 'text-green-600 bg-green-100';
      case 'warning': return 'text-yellow-600 bg-yellow-100';
      case 'critical': return 'text-red-600 bg-red-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'healthy': return '✅';
      case 'warning': return '⚠️';
      case 'critical': return '❌';
      default: return '❓';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#eb1966]"></div>
      </div>
    );
  }

  if (!healthData) {
    return (
      <div className="text-center py-8">
        <p className="text-gray-500">Failed to load system health data</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900">System Health Dashboard</h2>
        <div className={`px-4 py-2 rounded-lg ${getStatusColor(healthData.overall)}`}>
          <span className="font-semibold">
            {getStatusIcon(healthData.overall)} {healthData.overall.toUpperCase()}
          </span>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          {[
            { id: 'overview', label: 'Overview' },
            { id: 'metrics', label: 'Metrics' },
            { id: 'alerts', label: 'Alerts' },
            { id: 'circuit-breakers', label: 'Circuit Breakers' }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === tab.id
                  ? 'border-[#eb1966] text-[#eb1966]'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      <motion.div
        key={activeTab}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        {activeTab === 'overview' && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white p-6 rounded-lg shadow">
              <h3 className="text-lg font-semibold mb-4">System Status</h3>
              <div className={`text-center p-4 rounded-lg ${getStatusColor(healthData.overall)}`}>
                <div className="text-3xl mb-2">{getStatusIcon(healthData.overall)}</div>
                <div className="font-bold text-lg">{healthData.overall.toUpperCase()}</div>
              </div>
            </div>

            <div className="bg-white p-6 rounded-lg shadow">
              <h3 className="text-lg font-semibold mb-4">Metrics Summary</h3>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span>Total:</span>
                  <span className="font-semibold">{healthData.metrics.length}</span>
                </div>
                <div className="flex justify-between">
                  <span>Healthy:</span>
                  <span className="text-green-600 font-semibold">
                    {healthData.metrics.filter(m => m.status === 'healthy').length}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Warning:</span>
                  <span className="text-yellow-600 font-semibold">
                    {healthData.metrics.filter(m => m.status === 'warning').length}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Critical:</span>
                  <span className="text-red-600 font-semibold">
                    {healthData.metrics.filter(m => m.status === 'critical').length}
                  </span>
                </div>
              </div>
            </div>

            <div className="bg-white p-6 rounded-lg shadow">
              <h3 className="text-lg font-semibold mb-4">Circuit Breakers</h3>
              <div className="space-y-2">
                {Object.entries(healthData.circuitBreakers).map(([name, metrics]: [string, any]) => (
                  <div key={name} className="flex justify-between items-center">
                    <span className="text-sm">{name}:</span>
                    <span className={`px-2 py-1 rounded text-xs font-semibold ${
                      metrics.state === 'CLOSED' ? 'bg-green-100 text-green-800' :
                      metrics.state === 'OPEN' ? 'bg-red-100 text-red-800' :
                      'bg-yellow-100 text-yellow-800'
                    }`}>
                      {metrics.state}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'metrics' && (
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-semibold">System Metrics</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Metric
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Value
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Last Updated
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {healthData.metrics.map((metric, index) => (
                    <tr key={index}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {metric.name.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {metric.value} {metric.unit}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(metric.status)}`}>
                          {getStatusIcon(metric.status)} {metric.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {new Date(metric.timestamp).toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Add other tab content as needed */}
      </motion.div>
    </div>
  );
}
