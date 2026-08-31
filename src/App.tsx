import { BrowserRouter, Routes, Route } from "react-router-dom"
import { Layout } from "./components/layout/Layout"
import { HomePage } from "./pages/HomePage"

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<Layout />}>
          <Route path="/" element={<HomePage />} />
          <Route path="/login" element={<div className="container-app py-12 text-center"><h1 className="text-3xl font-bold">Login Page - Coming Soon</h1></div>} />
          <Route path="/register" element={<div className="container-app py-12 text-center"><h1 className="text-3xl font-bold">Register Page - Coming Soon</h1></div>} />
          <Route path="/features" element={<div className="container-app py-12 text-center"><h1 className="text-3xl font-bold">Features Page - Coming Soon</h1></div>} />
          <Route path="/pricing" element={<div className="container-app py-12 text-center"><h1 className="text-3xl font-bold">Pricing Page - Coming Soon</h1></div>} />
          <Route path="/about" element={<div className="container-app py-12 text-center"><h1 className="text-3xl font-bold">About Page - Coming Soon</h1></div>} />
          <Route path="/demo" element={<div className="container-app py-12 text-center"><h1 className="text-3xl font-bold">Demo Page - Coming Soon</h1></div>} />
          <Route path="/contact" element={<div className="container-app py-12 text-center"><h1 className="text-3xl font-bold">Contact Page - Coming Soon</h1></div>} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}

export default App