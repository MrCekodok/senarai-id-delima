import { BrowserRouter, Route, Routes } from "react-router-dom"
import { AuthProvider } from "./lib/auth"
import AdminPage from "./pages/AdminPage"
import LoginPage from "./pages/LoginPage"
import SearchPage from "./pages/SearchPage"

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<SearchPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/admin" element={<AdminPage />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  )
}
