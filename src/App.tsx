import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { JobProvider } from './context/JobContext'
import Landing from './pages/Landing'
import Dashboard from './pages/Dashboard'
import JobSetup from './pages/JobSetup'
import SchemaReview from './pages/SchemaReview'
import GenerationProgress from './pages/GenerationProgress'
import ComplianceReport from './pages/ComplianceReport'

export default function App() {
  return (
    <JobProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/app" element={<Dashboard />} />
          <Route path="/jobs/new" element={<JobSetup />} />
          <Route path="/jobs/new/configure" element={<SchemaReview />} />
          <Route path="/jobs/processing" element={<GenerationProgress />} />
          <Route path="/jobs/report" element={<ComplianceReport />} />
        </Routes>
      </BrowserRouter>
    </JobProvider>
  )
}
