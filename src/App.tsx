import { lazy, Suspense } from 'react';
import Examples from './examples/Examples';
import './index.css';
const LegacyFixture = lazy(() => import('./fixture/Fixture').then(module => ({ default: module.Fixture })));
const LegacyEvidence = lazy(() => import('./dashboard/Dashboard'));
export default function App() {
  if (window.location.pathname === '/fixture') return <Suspense fallback={<p>Loading fixture…</p>}><LegacyFixture/></Suspense>;
  if (window.location.pathname === '/evidence-v1' || window.location.pathname === '/report') return <Suspense fallback={<p>Loading recorded evidence…</p>}><LegacyEvidence/></Suspense>;
  return <Examples/>;
}
