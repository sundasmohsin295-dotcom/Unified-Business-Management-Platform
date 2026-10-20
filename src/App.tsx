import React, { useState } from 'react';
import { AppProvider, useApp } from './context/AppContext';
import { Header } from './components/common/Header';
import { Sidebar } from './components/common/Sidebar';
import { DemoControlBar } from './components/common/DemoControlBar';
import { CommandCenter } from './components/screens/CommandCenter';
import { PipelineStudio } from './components/screens/PipelineStudio';
import { Customer360 } from './components/screens/Customer360';
import { RecoveryQueue } from './components/screens/RecoveryQueue';
import { IntegrationObservatory } from './components/screens/IntegrationObservatory';
import { TeamPermissions } from './components/screens/TeamPermissions';
import { AuditLogView } from './components/screens/AuditLogView';
import { SettingsView } from './components/screens/SettingsView';
import { NewLeadModal } from './components/modals/NewLeadModal';
import { WhatsAppSimulatorModal } from './components/modals/WhatsAppSimulatorModal';
import { CheckCircle2, AlertTriangle, Info, AlertCircle, X } from 'lucide-react';

const AppContent: React.FC = () => {
  const { activeTab, toastMessage } = useApp();
  const [isNewLeadModalOpen, setIsNewLeadModalOpen] = useState(false);
  const [isWhatsAppSimulatorOpen, setIsWhatsAppSimulatorOpen] = useState(false);

  return (
    <div className="min-h-screen flex flex-col bg-[var(--bg-main)] text-[var(--text-primary)] transition-colors duration-150">
      {/* Top Header */}
      <Header
        onOpenNewLeadModal={() => setIsNewLeadModalOpen(true)}
        onOpenWhatsAppSimulator={() => setIsWhatsAppSimulatorOpen(true)}
      />

      {/* Live Evaluator Control Bar */}
      <DemoControlBar
        onOpenNewLeadModal={() => setIsNewLeadModalOpen(true)}
        onOpenWhatsAppSimulator={() => setIsWhatsAppSimulatorOpen(true)}
      />

      {/* Main Workspace Body with Sidebar & Viewport */}
      <div className="flex-1 flex flex-col md:flex-row w-full max-w-[1720px] mx-auto overflow-hidden">
        <Sidebar />

        <main className="flex-1 p-4 lg:p-8 overflow-y-auto">
          {activeTab === 'command_center' && <CommandCenter />}
          {activeTab === 'pipeline' && <PipelineStudio />}
          {activeTab === 'customer_360' && <Customer360 />}
          {activeTab === 'recovery_queue' && <RecoveryQueue />}
          {activeTab === 'integrations' && <IntegrationObservatory />}
          {activeTab === 'team' && <TeamPermissions />}
          {activeTab === 'audit_log' && <AuditLogView />}
          {activeTab === 'settings' && <SettingsView />}
        </main>
      </div>

      {/* Global Interactive Modals */}
      <NewLeadModal
        isOpen={isNewLeadModalOpen}
        onClose={() => setIsNewLeadModalOpen(false)}
      />

      <WhatsAppSimulatorModal
        isOpen={isWhatsAppSimulatorOpen}
        onClose={() => setIsWhatsAppSimulatorOpen(false)}
      />

      {/* Toast Notification Container */}
      {toastMessage && (
        <div className="fixed bottom-4 right-4 z-50 animate-in slide-in-from-bottom-3 duration-200">
          <div className={`px-4 py-3 rounded-xl shadow-xl border flex items-center gap-2.5 text-xs font-medium ${
            toastMessage.type === 'success' ? 'bg-emerald-950 text-emerald-200 border-emerald-800' :
            toastMessage.type === 'warning' ? 'bg-amber-950 text-amber-200 border-amber-800' :
            toastMessage.type === 'error' ? 'bg-rose-950 text-rose-200 border-rose-800' :
            'bg-slate-900 text-slate-200 border-slate-700'
          }`}>
            {toastMessage.type === 'success' && <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />}
            {toastMessage.type === 'warning' && <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />}
            {toastMessage.type === 'error' && <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />}
            {toastMessage.type === 'info' && <Info className="w-4 h-4 text-cyan-400 shrink-0" />}
            <span>{toastMessage.text}</span>
          </div>
        </div>
      )}
    </div>
  );
};

export default function App() {
  return (
    <AppProvider>
      <AppContent />
    </AppProvider>
  );
}
