import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, BarChart3, AlertTriangle, Layers, Target, Loader2, Info } from 'lucide-react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip as RechartsTooltip, Cell } from 'recharts';
import api from '../lib/axios';
import { Card } from '../components/ui/Card';

interface EDAMetadata {
  num_rows: number;
  num_cols: number;
  duplicates: number;
  missing: Record<string, number>;
  dtypes: Record<string, string>;
  outliers: Record<string, number>;
  target_suggestions: string[];
  correlation_matrix: { x: string; y: string; value: number }[];
}

export function DatasetEDA() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [data, setData] = useState<EDAMetadata | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchEDA = async () => {
      try {
        const response = await api.get(`/datasets/${id}/eda`);
        setData(response.data);
      } catch (err: any) {
        setError(err.response?.data?.detail || 'Failed to load EDA data');
      } finally {
        setLoading(false);
      }
    };
    fetchEDA();
  }, [id]);

  if (loading) {
    return (
      <div className="flex h-[80vh] items-center justify-center">
        <Loader2 className="w-10 h-10 animate-spin text-primary" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="p-8 max-w-4xl mx-auto">
        <button onClick={() => navigate('/datasets')} className="flex items-center gap-2 text-muted-foreground hover:text-foreground mb-6">
          <ArrowLeft className="w-4 h-4" /> Back to Datasets
        </button>
        <div className="p-6 bg-red-500/10 border border-red-500/20 text-red-500 rounded-2xl flex items-center gap-3">
          <AlertTriangle className="w-6 h-6" />
          <p>{error}</p>
        </div>
      </div>
    );
  }

  // Prepare data for Correlation Heatmap (simplified as Bar Chart of strongest absolute correlations for now to ensure 60fps responsiveness)
  // Get unique columns
  const numericCols = Object.keys(data.outliers);
  const outlierChartData = numericCols.map(col => ({
    name: col,
    outliers: data.outliers[col]
  }));

  const missingChartData = Object.keys(data.missing)
    .filter(k => data.missing[k] > 0)
    .map(k => ({ name: k, missing: data.missing[k] }));

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-8 pb-20">
      <div className="flex items-center gap-4">
        <button onClick={() => navigate('/datasets')} className="p-2 hover:bg-card rounded-xl text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Data Profiling</h1>
          <p className="text-muted-foreground mt-1">Automated Exploratory Data Analysis (EDA)</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="p-5 flex items-center gap-4">
          <div className="p-3 bg-blue-500/10 text-blue-500 rounded-2xl"><Layers className="w-6 h-6" /></div>
          <div>
            <p className="text-sm text-muted-foreground">Rows</p>
            <p className="text-2xl font-bold">{data.num_rows.toLocaleString()}</p>
          </div>
        </Card>
        <Card className="p-5 flex items-center gap-4">
          <div className="p-3 bg-indigo-500/10 text-indigo-500 rounded-2xl"><BarChart3 className="w-6 h-6" /></div>
          <div>
            <p className="text-sm text-muted-foreground">Columns</p>
            <p className="text-2xl font-bold">{data.num_cols.toLocaleString()}</p>
          </div>
        </Card>
        <Card className="p-5 flex items-center gap-4">
          <div className="p-3 bg-amber-500/10 text-amber-500 rounded-2xl"><AlertTriangle className="w-6 h-6" /></div>
          <div>
            <p className="text-sm text-muted-foreground">Duplicate Rows</p>
            <p className="text-2xl font-bold">{data.duplicates.toLocaleString()}</p>
          </div>
        </Card>
        <Card className="p-5 flex items-center gap-4">
          <div className="p-3 bg-emerald-500/10 text-emerald-500 rounded-2xl"><Target className="w-6 h-6" /></div>
          <div>
            <p className="text-sm text-muted-foreground">Target Candidates</p>
            <p className="text-2xl font-bold">{data.target_suggestions.length}</p>
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-8">
          <Card className="p-6">
            <h3 className="text-lg font-semibold mb-6 flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-amber-500" /> Outlier Detection (IQR)
            </h3>
            <div className="h-[300px]">
              {outlierChartData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={outlierChartData}>
                    <XAxis dataKey="name" stroke="#888888" fontSize={12} tickLine={false} axisLine={false} />
                    <YAxis stroke="#888888" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(value) => `${value}`} />
                    <RechartsTooltip cursor={{fill: 'rgba(255,255,255,0.05)'}} contentStyle={{ backgroundColor: 'rgba(10,10,10,0.8)', borderColor: 'rgba(255,255,255,0.1)', borderRadius: '12px' }} />
                    <Bar dataKey="outliers" radius={[4, 4, 0, 0]}>
                      {outlierChartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.outliers > (data.num_rows * 0.05) ? '#ef4444' : '#8b5cf6'} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center text-muted-foreground">No numerical columns found</div>
              )}
            </div>
            <p className="text-xs text-muted-foreground mt-4 flex items-center gap-1">
              <Info className="w-3 h-3" /> Columns in red have &gt;5% outliers and may require preprocessing.
            </p>
          </Card>

          <Card className="p-6">
            <h3 className="text-lg font-semibold mb-6 flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-rose-500" /> Missing Values Count
            </h3>
            <div className="h-[300px]">
              {missingChartData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={missingChartData}>
                    <XAxis dataKey="name" stroke="#888888" fontSize={12} tickLine={false} axisLine={false} />
                    <YAxis stroke="#888888" fontSize={12} tickLine={false} axisLine={false} />
                    <RechartsTooltip cursor={{fill: 'rgba(255,255,255,0.05)'}} contentStyle={{ backgroundColor: 'rgba(10,10,10,0.8)', borderColor: 'rgba(255,255,255,0.1)', borderRadius: '12px' }} />
                    <Bar dataKey="missing" fill="#f43f5e" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center text-muted-foreground border-2 border-dashed border-border rounded-xl">
                  Excellent! No missing values detected in any column.
                </div>
              )}
            </div>
          </Card>
        </div>

        <div className="space-y-8">
          <Card className="p-6 bg-primary/5 border-primary/20">
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <Target className="w-5 h-5 text-primary" /> Target Suggestions
            </h3>
            <p className="text-sm text-muted-foreground mb-4">
              Based on variance and data types, the AI suggests the following columns for forecasting:
            </p>
            <div className="flex flex-wrap gap-2">
              {data.target_suggestions.length > 0 ? (
                data.target_suggestions.map(target => (
                  <span key={target} className="px-3 py-1.5 bg-primary/20 text-primary rounded-lg text-sm font-medium border border-primary/30">
                    {target}
                  </span>
                ))
              ) : (
                <span className="text-sm text-muted-foreground">No suitable targets found.</span>
              )}
            </div>
          </Card>

          <Card className="p-6">
            <h3 className="text-lg font-semibold mb-4">Schema & Types</h3>
            <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
              {Object.entries(data.dtypes).map(([col, type]) => (
                <div key={col} className="flex justify-between items-center p-2 rounded-lg hover:bg-card transition-colors">
                  <span className="font-medium text-sm truncate max-w-[150px]" title={col}>{col}</span>
                  <span className="text-xs px-2 py-1 bg-muted text-muted-foreground rounded-md uppercase tracking-wider">{type}</span>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
