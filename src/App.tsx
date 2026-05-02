import { Routes, Route, Navigate } from 'react-router-dom'
import { ProtectedRoute } from './components/ProtectedRoute'
import { Login } from './pages/Login'
import { Dashboard } from './pages/Dashboard'
import { Campaigns } from './pages/Campaigns'
import { CallLog } from './pages/CallLog'
import { EmailLog } from './pages/EmailLog'
import { Chatbot } from './pages/Chatbot'
import { Affiliate } from './pages/Affiliate'
import { Costs } from './pages/Costs'
import { Settings } from './pages/Settings'
import { Help } from './pages/Help'
import { Leila } from './pages/Leila'

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
      <Route path="/campaigns" element={<ProtectedRoute><Campaigns /></ProtectedRoute>} />
      <Route path="/calls" element={<ProtectedRoute><CallLog /></ProtectedRoute>} />
      <Route path="/email" element={<ProtectedRoute><EmailLog /></ProtectedRoute>} />
      <Route path="/chatbot" element={<ProtectedRoute><Chatbot /></ProtectedRoute>} />
      <Route path="/affiliate" element={<ProtectedRoute><Affiliate /></ProtectedRoute>} />
      <Route path="/costs" element={<ProtectedRoute><Costs /></ProtectedRoute>} />
      <Route path="/settings" element={<ProtectedRoute><Settings /></ProtectedRoute>} />
      <Route path="/help" element={<ProtectedRoute><Help /></ProtectedRoute>} />
      <Route path="/leila" element={<ProtectedRoute><Leila /></ProtectedRoute>} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
