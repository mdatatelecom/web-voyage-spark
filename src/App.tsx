import { Suspense, lazy } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import Dashboard from "./pages/Dashboard";
import Buildings from "./pages/Buildings";
import Floors from "./pages/Floors";
import Rooms from "./pages/Rooms";
import Racks from "./pages/Racks";
import RackDetails from "./pages/RackDetails";
import Equipment from "./pages/Equipment";
import EquipmentDetails from "./pages/EquipmentDetails";
import Connections from "./pages/Connections";
import ConnectionDetails from "./pages/ConnectionDetails";
import QRScanner from "./pages/QRScanner";
import Labels from "./pages/Labels";
import Users from "./pages/Users";
import System from "./pages/System";
import ConnectionDetailsViewer from "./pages/ConnectionDetailsViewer";
import ScanAnalytics from "./pages/ScanAnalytics";
import NotificationSettings from "./pages/NotificationSettings";
import RackOccupancy from "./pages/RackOccupancy";
import Alerts from "./pages/Alerts";
import AlertSettings from "./pages/AlertSettings";
import MyConnections from "./pages/MyConnections";
import NetworkMap from "./pages/NetworkMap";
import RackComparison from "./pages/RackComparison";
import CameraMap from "./pages/CameraMap";
import SupportTickets from "./pages/SupportTickets";
import TicketDetails from "./pages/TicketDetails";
import TicketMetrics from "./pages/TicketMetrics";
import EscalationHistory from "./pages/EscalationHistory";
import WhatsAppHistory from "./pages/WhatsAppHistory";
import Profile from "./pages/Profile";
import NvrReport from "./pages/NvrReport";
import AuditReports from "./pages/AuditReports";
import KnowledgeBase from "./pages/KnowledgeBase";
import NotFound from "./pages/NotFound";

const FloorPlan = lazy(() => import("./pages/FloorPlan"));

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <AuthProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/auth" element={<Auth />} />
            <Route 
              path="/dashboard" 
              element={
                <ProtectedRoute requiredRole={['admin', 'technician']}>
                  <Dashboard />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/buildings" 
              element={
                <ProtectedRoute requiredRole={['admin', 'technician']}>
                  <Buildings />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/buildings/:buildingId/floors" 
              element={
                <ProtectedRoute requiredRole={['admin', 'technician']}>
                  <Floors />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/buildings/:buildingId/floors/:floorId/rooms" 
              element={
                <ProtectedRoute requiredRole={['admin', 'technician']}>
                  <Rooms />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/buildings/:buildingId/floors/:floorId/rooms/:roomId/racks" 
              element={
                <ProtectedRoute requiredRole={['admin', 'technician']}>
                  <Racks />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/racks" 
              element={
                <ProtectedRoute requiredRole={['admin', 'technician']}>
                  <Racks />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/racks/:rackId" 
              element={
                <ProtectedRoute requiredRole={['admin', 'technician']}>
                  <RackDetails />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/equipment" 
              element={
                <ProtectedRoute requiredRole={['admin', 'technician']}>
                  <Equipment />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/equipment/:id" 
              element={
                <ProtectedRoute requiredRole={['admin', 'technician']}>
                  <EquipmentDetails />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/connections" 
              element={
                <ProtectedRoute requiredRole={['admin', 'technician']}>
                  <Connections />
                </ProtectedRoute>
              } 
            />
            <Route
              path="/connections/:id"
              element={
                <ProtectedRoute requiredRole={['admin', 'technician']}>
                  <ConnectionDetails />
                </ProtectedRoute>
              }
            />
            <Route
              path="/scan"
              element={
                <ProtectedRoute>
                  <QRScanner />
                </ProtectedRoute>
              }
            />
          <Route 
            path="/my-connections" 
            element={
              <ProtectedRoute requiredRole={['viewer', 'network_viewer']}>
                <MyConnections />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/my-connections/:id" 
            element={
              <ProtectedRoute requiredRole={['viewer', 'network_viewer']}>
                <ConnectionDetailsViewer />
              </ProtectedRoute>
            } 
          />
            <Route 
              path="/labels" 
              element={
                <ProtectedRoute requiredRole={['admin', 'technician']}>
                  <Labels />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/users" 
              element={
                <ProtectedRoute requiredRole="admin">
                  <Users />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/rack-occupancy" 
              element={
                <ProtectedRoute requiredRole={['admin', 'technician']}>
                  <RackOccupancy />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/alerts" 
              element={
                <ProtectedRoute requiredRole={['admin', 'technician']}>
                  <Alerts />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/alert-settings" 
              element={
                <ProtectedRoute requiredRole="admin">
                  <AlertSettings />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/system" 
              element={
                <ProtectedRoute requiredRole="admin">
                  <System />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/analytics/scans" 
              element={
                <ProtectedRoute requiredRole="admin">
                  <ScanAnalytics />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/settings/notifications"
              element={
                <ProtectedRoute>
                  <NotificationSettings />
                </ProtectedRoute>
              } 
            />
            <Route 
            path="/racks/compare" 
            element={
              <ProtectedRoute requiredRole={['admin', 'technician']}>
                <RackComparison />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/network-map"
              element={
                <ProtectedRoute requiredRole={['admin', 'technician']}>
                  <NetworkMap />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/cameras/map"
              element={
                <ProtectedRoute requiredRole={['admin', 'technician']}>
                  <CameraMap />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/tickets"
              element={
                <ProtectedRoute requiredRole={['admin', 'technician']}>
                  <SupportTickets />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/tickets/:id"
              element={
                <ProtectedRoute requiredRole={['admin', 'technician']}>
                  <TicketDetails />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/tickets/metrics"
              element={
                <ProtectedRoute requiredRole={['admin', 'technician']}>
                  <TicketMetrics />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/tickets/escalations"
              element={
                <ProtectedRoute requiredRole={['admin', 'technician']}>
                  <EscalationHistory />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/whatsapp-history"
              element={
                <ProtectedRoute requiredRole="admin">
                  <WhatsAppHistory />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/profile"
              element={
                <ProtectedRoute>
                  <Profile />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/nvr-report"
              element={
                <ProtectedRoute requiredRole={['admin', 'technician']}>
                  <NvrReport />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/audit"
              element={
                <ProtectedRoute requiredRole={['admin', 'technician']}>
                  <AuditReports />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/knowledge-base"
              element={
                <ProtectedRoute requiredRole="admin">
                  <KnowledgeBase />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/buildings/:buildingId/floors/:floorId/plan"
              element={
                <ProtectedRoute requiredRole={['admin', 'technician']}>
                  <Suspense fallback={
                    <div className="flex items-center justify-center h-screen">
                      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
                    </div>
                  }>
                    <FloorPlan />
                  </Suspense>
                </ProtectedRoute>
              } 
            />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
