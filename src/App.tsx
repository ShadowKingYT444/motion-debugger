import Dashboard from './dashboard/Dashboard';
import { Fixture } from './fixture/Fixture';
import './index.css';

export default function App() {
  if (window.location.pathname === '/fixture') return <Fixture />;
  return <Dashboard />;
}
