import { useState, useCallback, useEffect } from 'react';
import { useDropzone } from 'react-dropzone';
import { motion, AnimatePresence } from 'framer-motion';
import { UploadCloud, FileSpreadsheet, Trash2, Edit2, Play, Loader2, AlertCircle, BarChart3 } from 'lucide-react';
import { Card } from '../components/ui/Card';
import api from '../lib/axios';

interface Dataset {
  id: number;
  name: string;
  original_filename: string;
  file_type: string;
  size_bytes: number;
  num_rows: number | null;
  num_columns: number | null;
  status: string;
  error_message: string | null;
  created_at: string;
}

export function MyDatasets() {
  const [datasets, setDatasets] = useState<Dataset[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);

  const fetchDatasets = async () => {
    try {
      const { data } = await api.get('/datasets/');
      setDatasets(data);
    } catch (error) {
      console.error("Failed to fetch datasets", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDatasets();
    // Poll for status updates
    const interval = setInterval(fetchDatasets, 5000);
    return () => clearInterval(interval);
  }, []);

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (!file) return;

    if (file.size > 50 * 1024 * 1024) {
      alert('File exceeds 50MB limit');
      return;
    }

    const formData = new FormData();
    formData.append('file', file);

    try {
      setUploadProgress(0);
      await api.post('/datasets/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        onUploadProgress: (progressEvent) => {
          const percentCompleted = Math.round((progressEvent.loaded * 100) / (progressEvent.total || 1));
          setUploadProgress(percentCompleted);
        }
      });
      fetchDatasets();
    } catch (error: any) {
      alert(error.response?.data?.detail || 'Upload failed');
    } finally {
      setUploadProgress(null);
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive, isDragReject } = useDropzone({
    onDrop,
    accept: {
      'text/csv': ['.csv'],
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
      'application/vnd.apache.parquet': ['.parquet']
    },
    maxFiles: 1
  });

  const handleDelete = async (id: number) => {
    if (!confirm('Are you sure you want to delete this dataset?')) return;
    try {
      await api.delete(`/datasets/${id}`);
      setDatasets(datasets.filter(d => d.id !== id));
    } catch (error) {
      alert('Failed to delete');
    }
  };

  const formatSize = (bytes: number) => {
    const mb = bytes / (1024 * 1024);
    return mb.toFixed(2) + ' MB';
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-8">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">My Datasets</h1>
          <p className="text-muted-foreground mt-1">Upload and manage your enterprise data lakes</p>
        </div>
      </div>

      <Card
        {...getRootProps()}
        className={`p-12 border-2 border-dashed flex flex-col items-center justify-center transition-all cursor-pointer bg-card/40 backdrop-blur-xl
          ${isDragActive ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50'}
          ${isDragReject ? 'border-red-500 bg-red-500/5' : ''}
        `}
      >
        <input {...getInputProps()} />
        <div className="p-4 bg-primary/10 rounded-full mb-4">
          <UploadCloud className={`w-8 h-8 ${isDragActive ? 'text-primary' : 'text-muted-foreground'}`} />
        </div>
        <p className="text-lg font-medium text-foreground">
          {isDragActive ? 'Drop dataset here' : 'Drag & drop a dataset, or click to browse'}
        </p>
        <p className="text-sm text-muted-foreground mt-2">
          Supports CSV, Excel (.xlsx), and Parquet. Maximum file size 50MB.
        </p>
        
        <AnimatePresence>
          {uploadProgress !== null && (
            <motion.div 
              initial={{ opacity: 0, y: 10 }} 
              animate={{ opacity: 1, y: 0 }} 
              exit={{ opacity: 0, height: 0 }}
              className="w-full max-w-md mt-6"
            >
              <div className="flex justify-between text-xs mb-2">
                <span>Uploading...</span>
                <span>{uploadProgress}%</span>
              </div>
              <div className="h-2 bg-background rounded-full overflow-hidden border border-border">
                <motion.div 
                  className="h-full bg-primary"
                  initial={{ width: 0 }}
                  animate={{ width: `${uploadProgress}%` }}
                />
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </Card>

      <div className="space-y-4">
        <h2 className="text-xl font-semibold">Uploaded Datasets</h2>
        
        {loading ? (
          <div className="flex justify-center p-12">
            <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
          </div>
        ) : datasets.length === 0 ? (
          <div className="text-center p-12 border rounded-2xl bg-card/40 border-dashed text-muted-foreground">
            No datasets uploaded yet. Upload one to begin forecasting.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <AnimatePresence>
              {datasets.map((dataset) => (
                <motion.div
                  key={dataset.id}
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  layout
                >
                  <Card className="p-5 flex flex-col h-full bg-card/60 backdrop-blur-xl group hover:border-primary/50 transition-colors">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <div className="p-2.5 bg-blue-500/10 text-blue-500 rounded-xl">
                          <FileSpreadsheet className="w-5 h-5" />
                        </div>
                        <div>
                          <h3 className="font-semibold text-foreground truncate max-w-[150px]" title={dataset.name}>
                            {dataset.name}
                          </h3>
                          <div className="text-xs text-muted-foreground uppercase tracking-wider mt-0.5 flex gap-2">
                            <span>{dataset.file_type}</span>
                            <span>•</span>
                            <span>{formatSize(dataset.size_bytes)}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex-grow">
                      {dataset.status === 'uploading' && (
                        <div className="flex items-center gap-2 text-sm text-yellow-500">
                          <Loader2 className="w-4 h-4 animate-spin" /> Processing...
                        </div>
                      )}
                      {dataset.status === 'error' && (
                        <div className="flex items-start gap-2 text-sm text-red-500">
                          <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                          <span className="line-clamp-2">{dataset.error_message || 'Processing failed'}</span>
                        </div>
                      )}
                      {dataset.status === 'ready' && (
                        <div className="grid grid-cols-2 gap-2 text-sm">
                          <div className="bg-background rounded-lg p-2 border">
                            <div className="text-muted-foreground text-xs mb-1">Rows</div>
                            <div className="font-medium text-foreground">{dataset.num_rows?.toLocaleString()}</div>
                          </div>
                          <div className="bg-background rounded-lg p-2 border">
                            <div className="text-muted-foreground text-xs mb-1">Columns</div>
                            <div className="font-medium text-foreground">{dataset.num_columns}</div>
                          </div>
                        </div>
                      )}
                    </div>
                    
                    <div className="pt-4 mt-4 border-t flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button className="p-2 hover:bg-background rounded-lg text-muted-foreground hover:text-foreground transition-colors" title="Rename">
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button onClick={() => handleDelete(dataset.id)} className="p-2 hover:bg-red-500/10 rounded-lg text-muted-foreground hover:text-red-500 transition-colors" title="Delete">
                        <Trash2 className="w-4 h-4" />
                      </button>
                      <button 
                        disabled={dataset.status !== 'ready'} 
                        onClick={() => window.location.href = `/datasets/${dataset.id}/eda`}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-500/10 text-indigo-500 hover:bg-indigo-500 hover:text-white rounded-lg transition-colors font-medium text-sm disabled:opacity-50 disabled:hover:bg-indigo-500/10 disabled:hover:text-indigo-500"
                        title="View Exploratory Data Analysis"
                      >
                        <BarChart3 className="w-4 h-4" /> View EDA
                      </button>
                      <button 
                        disabled={dataset.status !== 'ready'} 
                        onClick={() => window.location.href = `/datasets/${dataset.id}/schema`}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-primary/10 text-primary hover:bg-primary hover:text-primary-foreground rounded-lg transition-colors font-medium text-sm disabled:opacity-50 disabled:hover:bg-primary/10 disabled:hover:text-primary"
                        title="Configure schema and forecast"
                      >
                        <Play className="w-4 h-4" /> Forecast
                      </button>
                    </div>
                  </Card>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>
    </div>
  );
}
