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
import ScanAnalytics from "./pages/ScanAnalytics";
import NotificationSettings from "./pages/NotificationSettings";
import RackOccupancy from "./pages/RackOccupancy";
import Alerts from "./pages/Alerts";
import AlertSettings from "./pages/AlertSettings";
import NotFound from "./pages/NotFound";

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
                <ProtectedRoute>
                  <Dashboard />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/buildings" 
              element={
                <ProtectedRoute>
                  <Buildings />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/buildings/:buildingId/floors" 
              element={
                <ProtectedRoute>
                  <Floors />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/buildings/:buildingId/floors/:floorId/rooms" 
              element={
                <ProtectedRoute>
                  <Rooms />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/buildings/:buildingId/floors/:floorId/rooms/:roomId/racks" 
              element={
                <ProtectedRoute>
                  <Racks />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/racks" 
              element={
                <ProtectedRoute>
                  <Racks />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/racks/:rackId" 
              element={
                <ProtectedRoute>
                  <RackDetails />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/equipment" 
              element={
                <ProtectedRoute>
                  <Equipment />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/equipment/:id" 
              element={
                <ProtectedRoute>
                  <EquipmentDetails />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/connections" 
              element={
                <ProtectedRoute>
                  <Connections />
                </ProtectedRoute>
              } 
            />
            <Route
              path="/connections/:id"
              element={
                <ProtectedRoute>
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
              path="/labels" 
              element={
                <ProtectedRoute>
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
                <ProtectedRoute>
                  <RackOccupancy />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/alerts" 
              element={
                <ProtectedRoute>
                  <Alerts />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/alert-settings" 
              element={
                <ProtectedRoute>
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
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
