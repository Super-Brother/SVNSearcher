import React from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useAuthStore } from './stores/auth-store'
import Login from './pages/Login'
import Main from './pages/Main'

const App: React.FC = () => {
  const { isLoggedIn } = useAuthStore()

  return (
    <BrowserRouter>
      <Routes>
        <Route
          path="/login"
          element={isLoggedIn ? <Navigate to="/" replace /> : <Login />}
        />
        <Route
          path="/"
          element={isLoggedIn ? <Main /> : <Navigate to="/login" replace />}
        />
      </Routes>
    </BrowserRouter>
  )
}

export default App