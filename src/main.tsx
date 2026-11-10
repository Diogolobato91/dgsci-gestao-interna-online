import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import {watchForDeploymentUpdates} from './lib/deploymentUpdate.ts'

createRoot(document.getElementById("root")!).render(<App />);
watchForDeploymentUpdates();
