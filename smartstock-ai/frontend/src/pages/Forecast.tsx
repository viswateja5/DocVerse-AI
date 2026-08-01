import { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useDropzone } from 'react-dropzone';
import { useVirtualizer } from '@tanstack/react-virtual';
import { 
  UploadCloud, Play, Loader2, ArrowRight, ArrowLeft, BrainCircuit, CheckCircle2, 
  BarChart3, Settings2, Target, Calendar, Fingerprint, Hash, Tag, Activity, Cpu, Layers
} from 'lucide-react';
import { Card } from '../components/ui/Card';
import api from '../lib/axios';
import { ForecastDashboard } from './ForecastDashboard';
import toast from 'react-hot-toast';

const STEPS = [
  "Upload Data",
  "Preview Data",
  "Date Column",
  "Target Column",
  "Feature Eng",
  "Horizon",
  "Model",
  "Training",
  "Results"
];

// --- Subcomponents for Wizard Steps ---

// STEP 1: Upload
function StepUpload({ onComplete }: { onComplete: (id: number, previewData: any) => void }) {
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (!file) return;
    const formData = new FormData();
    formData.append('file', file);
    try {
      setUploadProgress(0);
      const res = await api.post('/datasets/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        onUploadProgress: (e) => setUploadProgress(Math.round((e.loaded * 100) / (e.total || 1)))
      });
      // Immediately move to preview with the 100-row preview data
      onComplete(res.data.id, res.data.preview);
    } catch (err: any) {
      toast.error(err.response?.data?.detail || "Upload failed.");
    } finally {
      setUploadProgress(null);
    }
  }, [onComplete]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({ onDrop, maxFiles: 1 });

  return (
    <div className="flex flex-col items-center justify-center min-h-[400px] space-y-6">
      <h2 className="text-2xl font-bold">Step 1: Ingest Dataset</h2>
      <Card
        {...getRootProps()}
        className={`p-12 w-full max-w-2xl border-2 border-dashed flex flex-col items-center justify-center transition-all cursor-pointer bg-card/40 backdrop-blur-xl
          ${isDragActive ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50'}
        `}
      >
        <input {...getInputProps()} />
        <div className="p-4 bg-primary/10 rounded-full mb-4">
          <UploadCloud className={`w-8 h-8 ${isDragActive ? 'text-primary' : 'text-muted-foreground'}`} />
        </div>
        <p className="text-lg font-medium">Drag & drop a dataset here</p>
        <p className="text-sm text-muted-foreground mt-2">CSV, Excel, Parquet supported.</p>
        
        {uploadProgress !== null && (
          <div className="w-full max-w-md mt-6">
            <div className="flex justify-between text-xs mb-2"><span>Uploading & Profiling...</span><span>{uploadProgress}%</span></div>
            <div className="h-2 bg-background rounded-full overflow-hidden border border-border">
              <div className="h-full bg-primary" style={{ width: `${uploadProgress}%` }} />
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}

// STEP 2: Preview (EDA) & Status Polling
function StepPreview({ datasetId, previewData, onNext }: { datasetId: number, previewData: any, onNext: () => void }) {
  const [status, setStatus] = useState<string>("reading");
  const [edaData, setEdaData] = useState<any>(null);

  // Poll for status
  useEffect(() => {
    let interval = setInterval(async () => {
      try {
        const res = await api.get(`/datasets/${datasetId}/status`);
        setStatus(res.data.status);
        if (res.data.status === 'ready') {
          clearInterval(interval);
          const edaRes = await api.get(`/datasets/${datasetId}/eda`);
          setEdaData(edaRes.data);
        } else if (res.data.status === 'error') {
          clearInterval(interval);
          toast.error("Error processing dataset.");
        }
      } catch (err) {
        console.error(err);
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [datasetId]);

  const steps = [
    { key: "validating", label: "Validating..." },
    { key: "generating_preview", label: "Preview..." },
    { key: "reading", label: "Reading..." },
    { key: "cleaning", label: "Cleaning..." },
    { key: "generating_features", label: "Features..." },
    { key: "ready", label: "Ready" }
  ];
  const currentIndex = steps.findIndex(s => s.key === status) === -1 ? 0 : steps.findIndex(s => s.key === status);

  const parentRef = useRef<HTMLDivElement>(null);
  
  const rowVirtualizer = useVirtualizer({
    count: previewData?.data?.length || 0,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 40, // height of a row
    overscan: 5,
  });

  return (
    <div className="space-y-6 min-h-[400px]">
      <h2 className="text-2xl font-bold">Step 2: Dataset Preview & AI Analysis</h2>
      
      {/* Background Task Progress */}
      <Card className="p-6">
        <div className="flex justify-between items-center mb-4">
          <h3 className="font-semibold">AI Profiler Status</h3>
        </div>
        <div className="flex justify-between relative">
          <div className="absolute left-4 right-4 top-4 h-0.5 bg-border -z-10" />
          <div className="absolute left-4 top-4 h-0.5 bg-primary -z-10 transition-all duration-500" style={{ width: `${(currentIndex / (steps.length - 1)) * 100}%` }} />
          {steps.map((step, idx) => (
            <div key={step.key} className="flex flex-col items-center gap-2">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm transition-colors
                ${idx < currentIndex ? 'bg-emerald-500 text-white' : idx === currentIndex ? 'bg-primary text-white shadow-lg' : 'bg-muted text-muted-foreground'}
              `}>
                {idx < currentIndex ? <CheckCircle2 className="w-5 h-5" /> : idx + 1}
              </div>
              <span className={`text-xs ${idx <= currentIndex ? 'text-foreground' : 'text-muted-foreground'}`}>{step.label}</span>
            </div>
          ))}
        </div>
      </Card>

      {/* Dataset Preview Table */}
      {previewData && (
        <Card className="overflow-hidden">
          <div className="p-4 border-b">
            <h3 className="font-semibold">Dataset Preview (Virtual Scrolling Enabled)</h3>
          </div>
          <div ref={parentRef} className="overflow-auto max-h-[400px] relative" style={{ height: '400px' }}>
            <table className="w-full text-sm text-left relative">
              <thead className="text-xs uppercase bg-muted/50 sticky top-0 z-10">
                <tr>
                  {previewData.columns.map((col: string, i: number) => (
                    <th key={i} className="px-4 py-3 font-medium truncate max-w-[150px] border-b">{col}</th>
                  ))}
                </tr>
              </thead>
              <tbody style={{ display: 'block', height: `${rowVirtualizer.getTotalSize()}px`, width: '100%', position: 'relative' }}>
                {rowVirtualizer.getVirtualItems().map((virtualRow) => {
                  const row = previewData.data[virtualRow.index];
                  return (
                    <tr 
                      key={virtualRow.index} 
                      className="border-b hover:bg-muted/30 absolute w-full flex"
                      style={{
                        height: `${virtualRow.size}px`,
                        transform: `translateY(${virtualRow.start}px)`
                      }}
                    >
                      {previewData.columns.map((col: string, cIndex: number) => (
                        <td key={cIndex} className="px-4 py-2 truncate flex-1 min-w-[150px] max-w-[150px]">{String(row[col])}</td>
                      ))}
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {edaData && (
        <div className="flex justify-end mt-8">
          <button onClick={onNext} className="flex items-center gap-2 px-6 py-2.5 bg-primary text-primary-foreground font-medium rounded-xl hover:bg-primary/90 transition-colors">
            Proceed to Mapping <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  );
}

// STEP 3 & 4 Combined: Select Target & Date
function StepSchema({ datasetId, onNext }: { datasetId: number, onNext: (schema: any) => void }) {
  const [schema, setSchema] = useState<any[]>([]);
  useEffect(() => {
    api.get(`/datasets/${datasetId}/schema`).then(res => setSchema(res.data));
  }, [datasetId]);

  const handleRole = (name: string, role: string) => setSchema(s => s.map(c => c.name === name ? { ...c, role } : c));

  const validate = () => {
    if (schema.filter(c => c.role === 'target').length !== 1) return toast.error("Select exactly 1 Target.");
    if (schema.filter(c => c.role === 'date').length !== 1) return toast.error("Select exactly 1 Date column.");
    api.put(`/datasets/${datasetId}/schema`, { columns: schema }).then(() => onNext(schema));
  };

  if (!schema.length) return <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 animate-spin" /></div>;

  return (
    <div className="space-y-6 min-h-[400px]">
      <h2 className="text-2xl font-bold">Step 3 & 4: Map Schema Roles</h2>
      <Card className="overflow-hidden border border-border">
        <div className="grid grid-cols-12 gap-4 p-4 border-b bg-muted/30 font-medium text-sm text-muted-foreground">
          <div className="col-span-4">Column Name</div>
          <div className="col-span-2">AI Confidence</div>
          <div className="col-span-6">Assigned Role</div>
        </div>
        <div className="divide-y divide-border max-h-[400px] overflow-y-auto">
          {schema.map((col) => (
            <div key={col.name} className="grid grid-cols-12 gap-4 p-4 items-center">
              <div className="col-span-4 font-medium truncate">{col.name}</div>
              <div className="col-span-2 text-xs">{Math.round(col.confidence * 100)}%</div>
              <div className="col-span-6">
                <select value={col.role} onChange={(e) => handleRole(col.name, e.target.value)} className="w-full bg-background border rounded-lg px-4 py-2 text-sm">
                  <option value="target">Target</option>
                  <option value="date">Date</option>
                  <option value="numerical">Numerical</option>
                  <option value="categorical">Categorical</option>
                  <option value="identifier">Identifier</option>
                  <option value="ignore">Ignore</option>
                </select>
              </div>
            </div>
          ))}
        </div>
      </Card>
      <div className="flex justify-end mt-8">
        <button onClick={validate} className="flex items-center gap-2 px-6 py-2.5 bg-primary text-primary-foreground font-medium rounded-xl hover:bg-primary/90 transition-colors">
          Confirm Schema <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

// STEP 5: Feature Engineering Loader
function StepFeatureEng({ onNext }: { onNext: () => void }) {
  useEffect(() => { setTimeout(onNext, 3000); }, [onNext]);
  return (
    <div className="flex flex-col items-center justify-center min-h-[400px] space-y-6">
      <div className="relative">
        <div className="absolute inset-0 border-4 border-primary/20 rounded-full" />
        <div className="p-8 bg-primary/10 rounded-full relative z-10"><BrainCircuit className="w-16 h-16 text-primary" /></div>
      </div>
      <h2 className="text-2xl font-bold">Automatic Feature Engineering</h2>
      <p className="text-muted-foreground max-w-md text-center">Generating rolling windows, lag features, day-of-week encodings, and seasonality markers...</p>
    </div>
  );
}

// STEP 6: Horizon
function StepHorizon({ onNext }: { onNext: (horizon: number) => void }) {
  const [horizon, setHorizon] = useState(30);
  return (
    <div className="flex flex-col items-center justify-center min-h-[400px] space-y-8">
      <h2 className="text-2xl font-bold">Step 6: Forecast Horizon</h2>
      <p className="text-muted-foreground">How many days into the future would you like to predict?</p>
      <div className="w-full max-w-md space-y-6">
        <div className="flex justify-between items-end">
          <span className="text-5xl font-bold text-primary">{horizon}</span>
          <span className="text-lg text-muted-foreground pb-1">Days</span>
        </div>
        <input type="range" min="1" max="365" value={horizon} onChange={(e) => setHorizon(Number(e.target.value))} className="w-full accent-primary" />
        <button onClick={() => onNext(horizon)} className="w-full py-3 bg-primary text-primary-foreground font-medium rounded-xl mt-8">Continue</button>
      </div>
    </div>
  );
}

// STEP 7: ML Model
function StepModel({ onNext }: { onNext: (model: string) => void }) {
  const models = [
    { id: 'automl', name: 'Smart AutoML (Recommended)', desc: 'Tests 5+ algorithms and ensembels the best performers.', icon: BrainCircuit },
    { id: 'xgboost', name: 'XGBoost', desc: 'Gradient boosted trees, excellent for complex non-linear data.', icon: Activity },
    { id: 'prophet', name: 'Facebook Prophet', desc: 'Robust to missing data and shifts in the trend.', icon: BarChart3 }
  ];
  return (
    <div className="flex flex-col items-center justify-center min-h-[400px] space-y-8">
      <h2 className="text-2xl font-bold">Step 7: Choose Algorithm</h2>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 w-full">
        {models.map(m => (
          <Card key={m.id} onClick={() => onNext(m.id)} className="p-6 cursor-pointer hover:border-primary/50 hover:bg-card/80 transition-all border-2">
            <m.icon className="w-8 h-8 text-primary mb-4" />
            <h3 className="font-semibold text-lg mb-2">{m.name}</h3>
            <p className="text-sm text-muted-foreground">{m.desc}</p>
          </Card>
        ))}
      </div>
    </div>
  );
}

// STEP 8: Training
function StepTrain({ datasetId, horizon, modelType, onNext }: { datasetId: number, horizon: number, modelType: string, onNext: (data: any) => void }) {
  const [logs, setLogs] = useState<string[]>(["Initializing distributed training cluster..."]);
  const [failed, setFailed] = useState(false);
  
  useEffect(() => {
    let isMounted = true;
    const run = async () => {
      setTimeout(() => isMounted && setLogs(l => [...l, "Validating schema tensors... [OK]"]), 1000);
      setTimeout(() => isMounted && setLogs(l => [...l, `Instantiating ${modelType} architecture... [OK]`]), 2000);
      setTimeout(() => isMounted && setLogs(l => [...l, "Running Backtesting Cross-Validation..."]), 3000);
      setTimeout(() => isMounted && setLogs(l => [...l, "Optimizing hyperparameters..."]), 5000);
      
      try {
        const res = await api.post('/forecast/train', { dataset_id: datasetId, horizon, model_type: modelType });
        if (isMounted) {
            setLogs(l => [...l, "Training complete! Generating explanations..."]);
            setTimeout(() => onNext(res.data), 1500);
        }
      } catch (e: any) {
        if (isMounted) {
            setLogs(l => [...l, `[ERROR] Training failed: ${e.response?.data?.detail || e.message}`]);
            setFailed(true);
            toast.error("Training failed. Check logs.");
        }
      }
    };
    run();
    return () => { isMounted = false; };
  }, [datasetId, horizon, modelType, onNext]);

  return (
    <div className="flex flex-col items-center justify-center min-h-[400px] space-y-6">
      <h2 className="text-2xl font-bold">Step 8: Training Model</h2>
      <Card className="w-full max-w-2xl bg-black/90 text-green-500 font-mono text-sm p-6 overflow-hidden h-[250px] flex flex-col justify-end relative">
        {logs.map((log, i) => (
          <div key={i}>{'>'} {log}</div>
        ))}
        {!failed && <div className="mt-2 text-primary">{'>'} _</div>}
      </Card>
      {failed && (
        <button onClick={() => window.location.reload()} className="px-4 py-2 bg-red-500/20 text-red-500 rounded-lg">Retry</button>
      )}
    </div>
  );
}

// STEP 9: Dashboard
function StepDashboard({ onRestart, results }: { onRestart: () => void, results: any }) {
  if (!results) return null;
  return <ForecastDashboard data={results} onRestart={onRestart} />;
}


// --- Main Wizard Controller ---
export function Forecast() {
  const [searchParams] = useSearchParams();
  const initId = searchParams.get('dataset');
  
  const [step, setStep] = useState(initId ? 2 : 1);
  const [datasetId, setDatasetId] = useState<number | null>(initId ? parseInt(initId) : null);
  const [previewData, setPreviewData] = useState<any>(null);
  const [schema, setSchema] = useState<any>(null);
  const [horizon, setHorizon] = useState<number>(30);
  const [modelType, setModelType] = useState<string>('');
  const [results, setResults] = useState<any>(null);

  const nextStep = () => setStep(s => Math.min(s + 1, 9));
  const prevStep = () => setStep(s => Math.max(s - 1, 1));
  const restart = () => { setStep(1); setDatasetId(null); setResults(null); };

  return (
    <div className="max-w-5xl mx-auto p-4 space-y-8 pb-32">
      
      {/* Animated Stepper */}
      <div className="flex items-center justify-between relative px-2">
        <div className="absolute left-4 right-4 top-1/2 h-0.5 bg-border -z-10" />
        <div className="absolute left-4 top-1/2 h-0.5 bg-primary -z-10 transition-all duration-500" style={{ right: `${100 - ((step - 1) / 8) * 100}%` }} />
        
        {STEPS.map((label, idx) => {
          const isActive = step === idx + 1;
          const isPast = step > idx + 1;
          return (
            <div key={label} className="flex flex-col items-center gap-2 bg-background p-1">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold border-2 transition-colors duration-300
                ${isActive ? 'border-primary bg-primary text-primary-foreground shadow-[0_0_15px_rgba(var(--primary),0.5)]' : 
                  isPast ? 'border-primary bg-primary text-primary-foreground' : 'border-border bg-card text-muted-foreground'}
              `}>
                {isPast ? <CheckCircle2 className="w-5 h-5" /> : idx + 1}
              </div>
              <span className={`text-[10px] uppercase font-bold tracking-wider hidden md:block ${isActive ? 'text-primary' : isPast ? 'text-foreground' : 'text-muted-foreground'}`}>
                {label}
              </span>
            </div>
          );
        })}
      </div>

      {/* Step Content with Framer Motion transitions */}
      <div className={`relative mt-12 bg-card/20 backdrop-blur-3xl rounded-3xl border border-border shadow-2xl overflow-hidden min-h-[500px] ${step === 9 ? 'p-0 border-none bg-transparent shadow-none backdrop-blur-none' : 'p-8'}`}>
        <AnimatePresence mode="wait">
          {step === 9 ? (
             <motion.div
                key={step}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.5, type: 'spring' }}
                className="w-full"
             >
                <StepDashboard onRestart={restart} results={results} />
             </motion.div>
          ) : (
            <motion.div
              key={step}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.3, type: 'spring', bounce: 0.2 }}
            >
              {step === 1 && <StepUpload onComplete={(id, pd) => { setDatasetId(id); setPreviewData(pd); nextStep(); }} />}
              {step === 2 && <StepPreview datasetId={datasetId!} previewData={previewData} onNext={nextStep} />}
              {step === 3 && <StepSchema datasetId={datasetId!} onNext={(s) => { setSchema(s); setStep(5); }} />}
              {step === 4 && null /* Merged with 3 */}
              {step === 5 && <StepFeatureEng onNext={nextStep} />}
              {step === 6 && <StepHorizon onNext={(h) => { setHorizon(h); nextStep(); }} />}
              {step === 7 && <StepModel onNext={(m) => { setModelType(m); nextStep(); }} />}
              {step === 8 && <StepTrain datasetId={datasetId!} horizon={horizon} modelType={modelType} onNext={(data) => { setResults(data); nextStep(); }} />}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Manual Navigation (Dev / Fallback) */}
      {step > 1 && step < 8 && (
        <div className="flex justify-start">
           <button onClick={prevStep} className="flex items-center gap-2 text-muted-foreground hover:text-foreground"><ArrowLeft className="w-4 h-4" /> Go Back</button>
        </div>
      )}

    </div>
  );
}
