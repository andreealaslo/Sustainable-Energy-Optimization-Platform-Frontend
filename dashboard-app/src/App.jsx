import React from 'react';

/**
 * Technical Note: The following imports are handled defensively 
 * for the preview environment. In your local project, Webpack 
 * will resolve these normally from your src folder.
 */
let Dashboard;
try {
  Dashboard = require('./Dashboard').default;
} catch (e) {
  // Fallback UI for the preview environment if the local file is not detected
  Dashboard = ({ token }) => (
    <div className="p-8 bg-white rounded-3xl shadow-sm border border-gray-100">
      <div className="flex items-center gap-3 mb-6 text-yellow-600 bg-yellow-50 p-4 rounded-2xl border border-yellow-100">
        <span className="font-bold underline">Preview Mode:</span> 
        <p>This is a placeholder for the Dashboard component.</p>
      </div>
      <div className="space-y-4">
        <div className="h-40 bg-gray-100 rounded-2xl animate-pulse"></div>
        <div className="grid grid-cols-2 gap-4">
          <div className="h-24 bg-gray-100 rounded-2xl animate-pulse"></div>
          <div className="h-24 bg-gray-100 rounded-2xl animate-pulse"></div>
        </div>
      </div>
    </div>
  );
}

try {
  require('./index.css');
} catch (e) {
  // Ignore missing CSS in preview
}

// This is only used when running the dashboard-app stand-alone on port 3001
const App = () => {
  return (
    <div className="min-h-screen bg-gray-50 p-10 font-sans">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-black text-gray-900">Dashboard MFE</h1>
            <p className="text-gray-500">Stand-alone Development Mode (Port 3001)</p>
          </div>
          <div className="px-4 py-2 bg-blue-100 text-blue-700 rounded-full text-xs font-bold uppercase tracking-widest">
            Remote Component
          </div>
        </div>
        
        <Dashboard token={localStorage.getItem('jwt')} />
      </div>
    </div>
  );
};

export default App;