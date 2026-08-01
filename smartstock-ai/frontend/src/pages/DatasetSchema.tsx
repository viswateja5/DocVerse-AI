import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, Check, AlertTriangle, Loader2, Target, Calendar, Hash, Tag, Fingerprint, Save } from 'lucide-react';
import api from '../lib/axios';
import { Card } from '../components/ui/Card';

interface ColumnSchema {
  name: string;
  role: string;
  confidence: number;
  type: string;
}

const ROLES = [
  { id: 'target', label: 'Target (Forecast Variable)', icon: Target },
  { id: 'date', label: 'Date / Time', icon: Calendar },
  { id: 'numerical', label: 'Numerical Feature', icon: Hash },
  { id: 'categorical', label: 'Categorical Feature', icon: Tag },
  { id: 'identifier', label: 'Identifier (ID)', icon: Fingerprint },
  { id: 'ignore', label: 'Ignore Column', icon: AlertTriangle }
];

export function DatasetSchema() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [columns, setColumns] = useState<ColumnSchema[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchSchema = async () => {
      try {
        const response = await api.get(`/datasets/${id}/schema`);
        setColumns(response.data);
      } catch (err: any) {
        setError(err.response?.data?.detail || 'Failed to load schema data');
      } finally {
        setLoading(false);
      }
    };
    fetchSchema();
  }, [id]);

  const handleRoleChange = (colName: string, newRole: string) => {
    setColumns(columns.map(c => c.name === colName ? { ...c, role: newRole, confidence: 1.0 } : c));
  };

  const handleSave = async () => {
    // Validate
    const targets = columns.filter(c => c.role === 'target');
    const dates = columns.filter(c => c.role === 'date');
    
    if (targets.length !== 1) {
      alert(`You must select exactly ONE Target column. Currently selected: ${targets.length}`);
      return;
    }
    
    if (dates.length !== 1) {
      alert(`You must select exactly ONE Date column for time-series forecasting. Currently selected: ${dates.length}`);
      return;
    }

    setSaving(true);
    try {
      await api.put(`/datasets/${id}/schema`, { columns });
      // Redirect to the actual forecasting wizard
      navigate(`/forecast?dataset=${id}`);
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Failed to save schema');
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-[80vh] items-center justify-center">
        <Loader2 className="w-10 h-10 animate-spin text-primary" />
      </div>
    );
  }

  if (error || columns.length === 0) {
    return (
      <div className="p-8 max-w-4xl mx-auto">
        <button onClick={() => navigate('/datasets')} className="flex items-center gap-2 text-muted-foreground hover:text-foreground mb-6">
          <ArrowLeft className="w-4 h-4" /> Back to Datasets
        </button>
        <div className="p-6 bg-red-500/10 border border-red-500/20 text-red-500 rounded-2xl flex items-center gap-3">
          <AlertTriangle className="w-6 h-6" />
          <p>{error || "No schema generated."}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-8 pb-32">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate('/datasets')} className="p-2 hover:bg-card rounded-xl text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-foreground">Configure Schema</h1>
            <p className="text-muted-foreground mt-1">Review AI-detected column roles before forecasting</p>
          </div>
        </div>
        
        <button 
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-2 px-6 py-2.5 bg-primary text-primary-foreground font-medium rounded-xl hover:bg-primary/90 transition-colors disabled:opacity-50"
        >
          {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
          Confirm & Forecast
        </button>
      </div>

      <Card className="overflow-hidden bg-card/60 backdrop-blur-xl border border-border">
        <div className="grid grid-cols-12 gap-4 p-4 border-b bg-muted/30 font-medium text-sm text-muted-foreground">
          <div className="col-span-3">Column Name</div>
          <div className="col-span-2">Data Type</div>
          <div className="col-span-3">AI Confidence</div>
          <div className="col-span-4">Assigned Role</div>
        </div>
        
        <div className="divide-y divide-border">
          {columns.map((col) => (
            <div key={col.name} className="grid grid-cols-12 gap-4 p-4 items-center hover:bg-card/50 transition-colors">
              <div className="col-span-3 font-medium truncate" title={col.name}>
                {col.name}
              </div>
              <div className="col-span-2">
                <span className="text-xs px-2 py-1 bg-muted rounded-md uppercase tracking-wider">{col.type}</span>
              </div>
              <div className="col-span-3 flex flex-col gap-1.5 pr-4">
                <div className="flex justify-between text-xs">
                  <span className={col.confidence > 0.8 ? 'text-emerald-500' : col.confidence > 0.5 ? 'text-amber-500' : 'text-red-500'}>
                    {col.confidence > 0.8 ? 'High' : col.confidence > 0.5 ? 'Medium' : 'Low'}
                  </span>
                  <span>{Math.round(col.confidence * 100)}%</span>
                </div>
                <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                  <div 
                    className={`h-full rounded-full ${col.confidence > 0.8 ? 'bg-emerald-500' : col.confidence > 0.5 ? 'bg-amber-500' : 'bg-red-500'}`}
                    style={{ width: `${col.confidence * 100}%` }}
                  />
                </div>
              </div>
              <div className="col-span-4">
                <div className="relative">
                  <select 
                    value={col.role}
                    onChange={(e) => handleRoleChange(col.name, e.target.value)}
                    className={`w-full appearance-none bg-background border rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 transition-colors
                      ${col.role === 'target' ? 'border-primary text-primary font-medium' : 
                        col.role === 'date' ? 'border-indigo-500 text-indigo-500 font-medium' : 
                        col.role === 'ignore' ? 'border-red-500/50 text-red-500 line-through opacity-70' : 
                        'border-border'}
                    `}
                  >
                    {ROLES.map(r => (
                      <option key={r.id} value={r.id}>{r.label}</option>
                    ))}
                  </select>
                  <div className="absolute inset-y-0 right-3 flex items-center pointer-events-none text-muted-foreground">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
